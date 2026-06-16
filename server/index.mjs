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
const TODAY = process.env.VL_TODAY || new Date().toISOString().slice(5, 10); // MM-DD，默认真实今天

const SYSTEM = `你是中文日程助理。把用户一段口语解析成「待执行清单」，只输出 JSON，不要多余文字。
今天是 2026-${TODAY}。把"今天/明天/后天/下周三"等换算成具体日期 YYYY-MM-DD。清理口头语。一段话可能含多条意图。
输出：{"actions":[{"kind":"create|complete","title":"","date":"YYYY-MM-DD","time":"HH:MM","dur":60,"cat":"meet|deep|life|learn|misc","loc":null,"reminder":0,"important":false,"urgent":false}],"cleaned":""}`;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function json(res, code, obj) { cors(res); res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
function readBody(req) {
  return new Promise((resolve) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => resolve(d)); });
}

async function parseUtterance(text) {
  if (!QWEN_KEY) throw new Error('未配置 DASHSCOPE_API_KEY');
  const r = await fetch(QWEN_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + QWEN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }],
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
      const { text } = JSON.parse((await readBody(req)) || '{}');
      if (!text || !text.trim()) return json(res, 400, { error: '缺少 text' });
      return json(res, 200, await parseUtterance(text.trim()));
    } catch (e) { return json(res, 500, { error: String(e.message || e) }); }
  }
  // TODO: /asr —— 火山一句话识别（WebSocket 二进制协议）。拿到 appid/access_token/access_secret/cluster 后实现。
  return json(res, 404, { error: 'not found' });
});

server.listen(PORT, () => console.log(`VoiceLog 后端已启动 http://localhost:${PORT}  (qwen=${!!QWEN_KEY})`));
