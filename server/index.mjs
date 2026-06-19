// 语迹 VoiceLog · 最小后端代理
// 作用：把 API key 藏在服务器端（不暴露给前端），并解决浏览器 CORS。
// 现在已实现：/parse —— 文字 → 通义千问 → 结构化「待执行清单」JSON。
// 待接：/asr —— 音频 → 火山一句话识别 → 文字（拿到火山4个凭证后接，见 README）。
// 零依赖：只用 Node 内置 http + 全局 fetch（Node ≥ 18）。本地跑：node server/index.mjs
import http from 'node:http';

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
${evList && evList.length ? `用户现有日程（可被"改期/取消/标记完成"——从中按标题匹配，把它的 id 填到 targetId）：
${evList.map((e) => `- id=${e.id} 「${e.title}」 ${e.date} ${e.time}`).join('\n')}
` : ''}动作类型 kind：
- create：新建日程。
- complete：标记某条已有日程为完成（填 targetId，匹配不到再用 title）。
- reschedule：改时间/日期（填 targetId；只填变化的 time 和/或 date，没变的留空）。
- cancel：取消某条已有日程（填 targetId）。
"把X改到/挪到…"=reschedule；"取消X/不去X了"=cancel；"X做完了/搞定了"=complete。
输出：{"actions":[{"kind":"create|complete|reschedule|cancel","targetId":null,"title":"","date":"YYYY-MM-DD","time":"HH:MM","dur":60,"cat":"meet|deep|life|learn|misc","loc":null,"reminder":0,"important":false,"urgent":false}],"cleaned":""}`;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function json(res, code, obj) { cors(res); res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
function readBody(req) {
  return new Promise((resolve) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => resolve(d)); });
}

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
  // TODO: /asr —— 火山一句话识别（WebSocket 二进制协议）。拿到 appid/access_token/access_secret/cluster 后实现。
  return json(res, 404, { error: 'not found' });
});

server.listen(PORT, () => console.log(`VoiceLog 后端已启动 http://localhost:${PORT}  (qwen=${!!QWEN_KEY})`));
