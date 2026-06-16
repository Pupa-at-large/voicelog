// 语迹 VoiceLog · 通义千问(Qwen) 解析 Demo
// 作用：把一句口语 → 结构化「待执行清单」(JSON)，演示「AI 听懂并转成可确认指令」。
// 用阿里云百炼 DashScope 的 OpenAI 兼容接口，纯 REST，一个 key 即可。
//
// 用法：
//   DASHSCOPE_API_KEY=sk-你的key node native/demo/qwen-parse.mjs "嗯，明天下午三点跟老王开会，提前半小时提醒，在公司"
// 不传句子时用内置示例。今天固定按 2026-06-16 计算相对日期。
//
// 说明：这是「解析+确认」演示，不写库；确认后真正落库在 App 里做。

const API_KEY = process.env.DASHSCOPE_API_KEY;
// 老别名 qwen-flash/plus/max 已无免费额度（报 FreeTierOnly）；用当前代有免费额度的代号
const MODEL = process.env.QWEN_MODEL || 'qwen3.6-flash-2026-04-16'; // 便宜快；要更强可换 qwen3.7-plus
const TODAY = '2026-06-16'; // 与原型一致；接进 App 后用真实当天
const BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

const utterance = process.argv.slice(2).join(' ').trim()
  || '嗯，明天上午十点开产品评审会，下午三点跟设计师对方案，今天上午的周报我写完了，后天晚上八点约朋友吃饭提前半小时提醒';

const SYSTEM = `你是中文日程助理。把用户一段口语解析成「待执行清单」，只输出 JSON，不要多余文字。
今天是 ${TODAY}（周一）。把"今天/明天/后天/下周三"等换算成具体日期 YYYY-MM-DD。
清理口头语（嗯、那个、啊…）。一段话可能含多条意图。
输出格式：
{
  "actions": [
    {
      "kind": "create" 或 "complete",        // 新建日程 / 给已完成打勾
      "title": "标题",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",                          // 没说就给合理默认或留空
      "dur": 60,                                 // 分钟
      "cat": "meet|deep|life|learn|misc",       // 会议/深度工作/生活/学习/杂务
      "loc": "地点或null",
      "reminder": 30,                            // 提前几分钟，没有则0
      "important": false,
      "urgent": false
    }
  ],
  "cleaned": "清理口头语后的整理版文本"
}`;

function die(msg) { console.error('✗ ' + msg); process.exit(1); }
if (!API_KEY) die('未设置 DASHSCOPE_API_KEY 环境变量。去阿里云百炼控制台拿 key（同一个 key 也能用阿里 ASR）。');

const CAT_LABEL = { meet: '会议沟通', deep: '深度工作', life: '生活健康', learn: '学习成长', misc: '杂务' };

const body = {
  model: MODEL,
  messages: [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: utterance },
  ],
  response_format: { type: 'json_object' },
  enable_thinking: false, // qwen3 默认"思考"，短抽取无收益却慢几倍、贵几百倍——关掉
  temperature: 0.2,
};

console.log('🎙  输入：' + utterance);
console.log('🤖  模型：' + MODEL + '（DashScope）\n正在解析…\n');

try {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 401) die('401 鉴权失败：API key 不对或没开通百炼。');
    die(`HTTP ${res.status}：${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  let parsed;
  try { parsed = JSON.parse(content); } catch { die('模型返回不是合法 JSON：\n' + content); }

  if (parsed.cleaned) console.log('🧹 已整理：' + parsed.cleaned + '\n');
  const actions = parsed.actions || [];
  console.log(`📋 待执行清单 · ${actions.length} 条（确认后才执行，绝不自动操作）：\n`);
  actions.forEach((a, i) => {
    const tag = a.kind === 'complete' ? '✅完成' : '➕新增';
    const flags = [a.important ? '★重要' : '', a.urgent ? '🚩急' : ''].filter(Boolean).join(' ');
    console.log(`  ${i + 1}. [${tag}] ${a.title}`);
    console.log(`     ${a.date || '?'} ${a.time || ''} · ${a.dur || 60}分 · ${CAT_LABEL[a.cat] || a.cat || ''}` +
      `${a.loc ? ' · ' + a.loc : ''}${a.reminder ? ' · 提前' + a.reminder + '分' : ''}${flags ? ' · ' + flags : ''}`);
  });
  console.log('\n（在 App 里这一步会渲染成可勾选清单，你点「确认执行」才落库。）');
  if (data.usage) console.log(`\n💰 token：输入 ${data.usage.prompt_tokens} / 输出 ${data.usage.completion_tokens}`);
} catch (e) {
  die('请求失败：' + (e?.message || e));
}
