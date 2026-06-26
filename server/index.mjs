// 语迹 VoiceLog · 最小后端代理
// 作用：把 API key 藏在服务器端（不暴露给前端），并解决浏览器 CORS。
// 现在已实现：/parse —— 文字 → 通义千问 → 结构化「待执行清单」JSON。
// 待接：/asr —— 音频 → 火山一句话识别 → 文字（拿到火山4个凭证后接，见 README）。
// 零依赖：只用 Node 内置 http + 全局 fetch（Node ≥ 18）。本地跑：node server/index.mjs
//
// 已扩展为「可同步数据层 + 手机号登录」的 MVP 骨架（To-C 走通验证用）：
//   /auth/request  手机号 → 验证码（骨架版直接返回，生产换短信服务商）
//   /auth/verify   手机号 + 验证码 → token
//   /sync/push     登录后：上传本地变化（按 updated_at「后写赢」合并）
//   /sync/pull     登录后：拉取自上次游标以来的增量
// 存储是「每用户一份记录」的 JSON 文件骨架——生产请换 RDS/Postgres（见 DEPLOY.md）。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = process.env.PORT || 8787;
const QWEN_KEY = process.env.DASHSCOPE_API_KEY || '';
// 注意：老别名 qwen-flash/qwen-plus/qwen-max 已无免费额度（调用报 FreeTierOnly）。
// 用当前代有免费额度的代号；可在百炼控制台「免费额度」页查最新可用代号。
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen3.6-flash-2026-04-16';
const QWEN_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
// 服务器兜底"今天"：优先 VL_TODAY，否则真实日期。注意 toISOString 是 UTC——
// 真正的日期以客户端 /parse 请求里带的 today/now 为准（见下），避免时区/跨午夜对不上。
const SERVER_TODAY = process.env.VL_TODAY
  ? (/^\d{4}-/.test(process.env.VL_TODAY) ? process.env.VL_TODAY : '2026-' + process.env.VL_TODAY)
  : new Date().toISOString().slice(0, 10);

const SYSTEM = (today, now, evList) => `你是中文日程助理。把用户一段口语解析成「待执行清单」，只输出 JSON，不要多余文字。
今天是 ${today}${now ? `，现在 ${now}` : ''}。把"今天/明天/后天/明晚/下周三/三天后"等换算成具体日期 YYYY-MM-DD（"明晚"=明天晚上）。清理口头语。一段话可能含多条意图。
"X点到Y点/X:00到Y:00"表示从 X 到 Y：time=开始(X)，dur=分钟差值（如19点到20点→time"19:00",dur60）。
title 必须是干净的事务名，不含人称(我/我要)、时间词、语气词(了/啦)，例如"我19点到20点自习了"→title"自习"。
补录：若用户在记录"已经发生的事"（过去式"报名了/确定了/做了/去了"，或"今早/刚才"），把 done 设为 true，date/time 用实际发生的时间（默认今天；多件按先后顺序排早上的时间）。
主任务+子任务：若一段是"一个主任务 + 若干细节/子步骤"（如"报名了比赛，确定了选题方向和比赛路径"），把主任务作 title、细节放进 subtasks 数组，别拆成多条独立日程；但几件互相独立的事（如"起床""报名比赛""报名实习"）仍各自一条。
${evList && evList.length ? `用户现有日程（可被"改期/取消/标记完成"——从中按标题匹配，把它的 id 填到 targetId）：
${evList.map((e) => `- id=${e.id} 「${e.title}」 ${e.date} ${e.time}`).join('\n')}
` : ''}动作类型 kind：
- create：新建日程（补录已发生的事也用 create，配 done=true）。
- complete：标记某条已有日程为完成（填 targetId，匹配不到再用 title）。
- reschedule：改时间/日期（填 targetId；只填变化的 time 和/或 date，没变的留空）。
- cancel：取消某条已有日程（填 targetId）。
"把X改到/挪到…"=reschedule；"取消X/不去X了"=cancel；"X做完了/搞定了"=complete。
输出：{"actions":[{"kind":"create|complete|reschedule|cancel","targetId":null,"title":"","date":"YYYY-MM-DD","time":"HH:MM","dur":60,"cat":"meet|deep|life|learn|misc","loc":null,"reminder":0,"important":false,"urgent":false,"done":false,"subtasks":[]}],"cleaned":""}`;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function json(res, code, obj) { cors(res); res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
function readBody(req) {
  return new Promise((resolve) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => resolve(d)); });
}

// ───────────────────────── 持久化（骨架：JSON 文件；生产换数据库）─────────────────────────
// 形状：{ users:{ [phone]:{ seq, events:{ [id]:{...ev, day, updated_at, deleted, seq} } } }, otps:{}, tokens:{ [token]:phone } }
// seq 是每个用户单调递增的版本号——/sync/pull?since=N 只回 seq>N 的行，实现增量同步。
const DATA_DIR = process.env.VL_DATA_DIR || new URL('./.data/', import.meta.url).pathname;
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const emptyStore = () => ({ users: {}, otps: {}, tokens: {} });
function loadStore() { try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); } catch (e) { return emptyStore(); } }
const STORE = loadStore();
function saveStore() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); const tmp = STORE_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(STORE)); fs.renameSync(tmp, STORE_FILE); } catch (e) { console.error('saveStore', e.message); }
}

const DEV = process.env.NODE_ENV !== 'production'; // 骨架：DEV 下把验证码直接回给前端，省去短信
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));
const genToken = () => crypto.randomBytes(24).toString('hex');
const ensureUser = (phone) => (STORE.users[phone] = STORE.users[phone] || { seq: 0, events: {} });
function authPhone(req) { const m = /^Bearer\s+(.+)$/i.exec(req.headers['authorization'] || ''); return m ? (STORE.tokens[m[1]] || null) : null; }

async function parseUtterance(text, today, now, events) {
  if (!QWEN_KEY) throw new Error('未配置 DASHSCOPE_API_KEY');
  const day = /^\d{4}-\d{2}-\d{2}$/.test(today || '') ? today : SERVER_TODAY;
  const evList = Array.isArray(events) ? events.filter((e) => e && e.id && e.title).slice(0, 50) : [];
  const r = await fetch(QWEN_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + QWEN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [{ role: 'system', content: SYSTEM(day, /^\d{1,2}:\d{2}$/.test(now || '') ? now : '', evList) }, { role: 'user', content: text }],
      response_format: { type: 'json_object' },
      enable_thinking: false, // qwen3 系列默认会"思考"，短抽取无收益却慢 5 倍、贵几百倍——关掉
      temperature: 0.2,
    }),
  });
  if (!r.ok) throw new Error(`Qwen HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }
  if (req.url === '/health') return json(res, 200, { ok: true, qwen: !!QWEN_KEY });
  if (req.url === '/parse' && req.method === 'POST') {
    try {
      const { text, today, now, events } = JSON.parse((await readBody(req)) || '{}');
      if (!text || !text.trim()) return json(res, 400, { error: '缺少 text' });
      return json(res, 200, await parseUtterance(text.trim(), today, now, events));
    } catch (e) { return json(res, 500, { error: String(e.message || e) }); }
  }
  // ── 账户：手机号验证码登录（骨架：验证码直接返回 / 打印到控制台；生产换短信服务商 + 限流）──
  if (req.url === '/auth/request' && req.method === 'POST') {
    try {
      const { phone } = JSON.parse((await readBody(req)) || '{}');
      if (!/^\d{6,15}$/.test(phone || '')) return json(res, 400, { error: '手机号格式不对' });
      const code = genCode();
      STORE.otps[phone] = { code, exp: Date.now() + 5 * 60 * 1000 }; saveStore();
      console.log(`[auth] ${phone} 验证码 ${code}（5 分钟内有效）`);
      return json(res, 200, { ok: true, ...(DEV ? { devCode: code } : {}) }); // devCode 仅开发态返回
    } catch (e) { return json(res, 500, { error: String(e.message || e) }); }
  }
  if (req.url === '/auth/verify' && req.method === 'POST') {
    try {
      const { phone, code } = JSON.parse((await readBody(req)) || '{}');
      const rec = STORE.otps[phone];
      if (!rec || rec.code !== String(code) || Date.now() > rec.exp) return json(res, 401, { error: '验证码错误或已过期' });
      delete STORE.otps[phone];
      const token = genToken(); STORE.tokens[token] = phone; ensureUser(phone); saveStore();
      return json(res, 200, { ok: true, token, phone });
    } catch (e) { return json(res, 500, { error: String(e.message || e) }); }
  }

  // ── 同步：push 上传变化（后写赢）/ pull 拉增量 ── 都要登录 ──
  if (req.url === '/sync/push' && req.method === 'POST') {
    const phone = authPhone(req); if (!phone) return json(res, 401, { error: '未登录' });
    try {
      const { events } = JSON.parse((await readBody(req)) || '{}');
      const u = ensureUser(phone); let applied = 0;
      for (const ev of (Array.isArray(events) ? events : [])) {
        if (!ev || !ev.id) continue;
        const cur = u.events[ev.id], incoming = Number(ev.updated_at || 0);
        if (cur && Number(cur.updated_at || 0) > incoming) continue; // 服务器更新则忽略这条
        u.events[ev.id] = { ...ev, updated_at: incoming || Date.now(), seq: ++u.seq };
        applied++;
      }
      saveStore();
      return json(res, 200, { ok: true, applied, cursor: u.seq });
    } catch (e) { return json(res, 500, { error: String(e.message || e) }); }
  }
  if (req.url && req.url.startsWith('/sync/pull') && req.method === 'GET') {
    const phone = authPhone(req); if (!phone) return json(res, 401, { error: '未登录' });
    const u = ensureUser(phone);
    const since = Number(new URL(req.url, 'http://x').searchParams.get('since') || 0) || 0;
    const events = Object.values(u.events).filter((e) => e.seq > since);
    return json(res, 200, { ok: true, events, cursor: u.seq });
  }

  // TODO: /asr —— 火山一句话识别（WebSocket 二进制协议）。拿到 appid/access_token/access_secret/cluster 后实现。
  return json(res, 404, { error: 'not found' });
});

server.listen(PORT, () => console.log(`VoiceLog 后端已启动 http://localhost:${PORT}  (qwen=${!!QWEN_KEY})`));
