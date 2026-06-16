#!/usr/bin/env node
/*
 * VoiceLog · 千问(Qwen)解析 demo
 * 一句话 → 通义千问 → 结构化「待执行清单」
 *
 * 这是产线方向的探针：设计版用的是离线规则解析器（project/app/parser.js），
 * PRD 明确部署时换成 LLM。本脚本把"换成千问"这条路真跑通一遍——同样的领域约定
 * （今天=06-16 周二、五类 cat、important×urgent 四象限、新增/完成多意图），
 * 但交给大模型抽取，返回严格 JSON，再渲染成终端里的待执行清单。
 *
 * 用法:
 *   DASHSCOPE_API_KEY=sk-xxx node native/demo/qwen-parse.mjs "明天下午三点跟产品开个评审，很重要"
 *   DASHSCOPE_API_KEY=sk-xxx node native/demo/qwen-parse.mjs        # 用内置示例
 *   QWEN_MODEL=qwen-turbo DASHSCOPE_API_KEY=sk-xxx node native/demo/qwen-parse.mjs "..."
 *
 * 环境变量:
 *   DASHSCOPE_API_KEY  必填，阿里云百炼(DashScope) API Key
 *   QWEN_MODEL         可选，默认 qwen-plus（可换 qwen-turbo / qwen-max / qwen3-max …）
 *   DASHSCOPE_BASE     可选，默认 https://dashscope.aliyuncs.com/compatible-mode/v1
 */

// ── 领域常量：与 project/app 保持一致 ───────────────────────────────────
// 今天=06-16(周一)，本周 06-15..06-21（见 CLAUDE.md / parser.js 的 DOW2KEY）。
const TODAY = { date: '2026-06-16', label: '今天' };
// 本周日期键 → 中文。模型只输出 MM-DD 键，中文由脚本统一渲染，避免模型口径漂移。
const KEY2CN = {
  '06-15': '6月15日 周日', '06-16': '6月16日 周一', '06-17': '6月17日 周二',
  '06-18': '6月18日 周三', '06-19': '6月19日 周四', '06-20': '6月20日 周五',
  '06-21': '6月21日 周六',
};

const CAT_META = {
  meet:  { emoji: '🤝', label: '会议' },
  deep:  { emoji: '🎯', label: '深度' },
  life:  { emoji: '🌿', label: '生活' },
  learn: { emoji: '📚', label: '学习' },
  misc:  { emoji: '📌', label: '杂项' },
};

// important × urgent → 艾森豪威尔四象限（与 data.js quadrant 一致）
function quadrant(important, urgent) {
  if (important && urgent) return { q: 'Q1', name: '重要且紧急', tip: '马上做' };
  if (important && !urgent) return { q: 'Q2', name: '重要不紧急', tip: '成长区·安排做' };
  if (!important && urgent) return { q: 'Q3', name: '紧急不重要', tip: '尽量委派' };
  return { q: 'Q4', name: '不重要不紧急', tip: '少做' };
}

// ── 给千问的系统提示：把领域约定喂进去，要求严格 JSON ──────────────────
const SYSTEM_PROMPT = `你是 VoiceLog（语迹）的语音日程解析引擎。把用户一句口语化的中文，解析成结构化的「待执行清单」。

【时间基准】今天是 ${TODAY.date}（周一）。本周日期键：
06-15=周日, 06-16=周一(今天), 06-17=周二, 06-18=周三, 06-19=周四, 06-20=周五, 06-21=周六。
相对日期要换算成本周的 MM-DD 键（如"明天"=06-17，"后天"=06-18）。若说的日期不在本周，用 MM-DD 给出最接近的合理值。

【一句话可能含多个意图】拆成多条 action，每条是新增(create)或完成(complete)：
- create：要安排的新日程。
- complete：用户在陈述某事已经做完（"写完了/搞定了/开完会了"），应标记完成（status=done）。

【字段】每条 action 输出对象：
- kind: "create" | "complete"
- title: 简洁事件名（去掉时间/地点/语气词，如"和产品开评审"→"产品评审"）
- dateKey: "MM-DD"（本周日期键）
- time: "HH:MM" 24小时制；没说时间则给 "09:00"
- dur: 时长(分钟)，默认 60
- cat: "meet"(开会/评审/沟通/面试) | "deep"(写方案/代码/文档/专注) | "life"(吃饭/运动/休息/看病) | "learn"(读书/上课/复习) | "misc"(其它)
- loc: 地点字符串，没有则 null
- reminder: 提前提醒分钟数，没说则 0
- important: 布尔，说到"重要/关键/必须/优先/别忘"为 true
- urgent: 布尔，说到"紧急/尽快/赶紧/马上/今天必须/ddl/截止"为 true
- status: create 默认 "todo"；complete 为 "done"

【输出】只输出一个 JSON 对象：{"actions":[ ... ]}。不要 markdown、不要解释、不要代码块围栏。`;

const FEWSHOT_USER = '嗯…明天下午三点跟产品开个评审，挺重要的，提前十分钟提醒我；对了，今天的周报我已经写完了';
const FEWSHOT_ASSISTANT = JSON.stringify({
  actions: [
    { kind: 'create', title: '产品评审', dateKey: '06-17', time: '15:00', dur: 60, cat: 'meet', loc: null, reminder: 10, important: true, urgent: false, status: 'todo' },
    { kind: 'complete', title: '周报', dateKey: '06-16', time: '09:00', dur: 60, cat: 'deep', loc: null, reminder: 0, important: false, urgent: false, status: 'done' },
  ],
});

// ── 调用千问 ───────────────────────────────────────────────────────────
async function callQwen(text, { apiKey, model, base }) {
  const url = `${base}/chat/completions`;
  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: FEWSHOT_USER },
      { role: 'assistant', content: FEWSHOT_ASSISTANT },
      { role: 'user', content: text },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  };
  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - t0;
  const raw = await res.text();
  if (!res.ok) {
    let err;
    try { err = JSON.parse(raw).error; } catch { err = { message: raw }; }
    const e = new Error(err?.message || `HTTP ${res.status}`);
    e.code = err?.code; e.status = res.status; e.ms = ms;
    throw e;
  }
  const json = JSON.parse(raw);
  const content = json.choices?.[0]?.message?.content ?? '';
  const usage = json.usage;
  let parsed;
  try { parsed = JSON.parse(content); }
  catch { throw new Error(`模型返回的不是合法 JSON:\n${content}`); }
  return { actions: parsed.actions || [], usage, ms, model: json.model || model };
}

// ── 渲染待执行清单 ─────────────────────────────────────────────────────
function renderList(actions) {
  if (!actions.length) { console.log('（没有解析出任何待办）'); return; }
  console.log('\n📋 待执行清单（请确认）');
  console.log('─'.repeat(56));
  actions.forEach((a, i) => {
    const c = CAT_META[a.cat] || CAT_META.misc;
    const q = quadrant(a.important, a.urgent);
    const kindTag = a.kind === 'complete' ? '✅ 标记完成' : '➕ 新增日程';
    const when = `${KEY2CN[a.dateKey] || a.dateKey} ${a.time}`;
    const flags = [
      a.important ? '重要' : null,
      a.urgent ? '紧急' : null,
      a.reminder ? `提前${a.reminder}分提醒` : null,
      a.loc ? `@${a.loc}` : null,
    ].filter(Boolean).join(' · ');
    console.log(`${i + 1}. [${kindTag}] ${c.emoji} ${a.title}`);
    console.log(`     ${when} · ${a.dur}分钟 · ${c.label} · ${q.q}「${q.name}」(${q.tip})`);
    if (flags) console.log(`     ${flags}`);
  });
  console.log('─'.repeat(56));
}

// ── 主流程 ─────────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const model = process.env.QWEN_MODEL || 'qwen-plus';
  const base = process.env.DASHSCOPE_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  const text = process.argv.slice(2).filter((a) => !a.startsWith('--')).join(' ').trim()
    || '嗯…明天上午十点先跟设计同步一下，然后下午三点开产品评审，这个很重要尽快定下来；对了今天的周报我已经写完了';

  const mock = process.argv.includes('--mock') || process.env.QWEN_MOCK === '1';

  console.log('🎙️  输入一句话：');
  console.log(`    "${text}"`);

  // --mock：跳过网络，用一段代表性的"模型应当返回的 JSON"走真实渲染路径。
  // 用途：当 API 额度受限时，仍能演示「JSON → 待执行清单」这一段确实跑通。
  if (mock) {
    console.log('\n🧪 离线 mock：用代表性模型输出走真实渲染（未联网）');
    const actions = JSON.parse(FEWSHOT_ASSISTANT).actions;
    renderList(actions);
    return;
  }

  console.log(`\n🤖 调用千问解析（model=${model}）…`);

  if (!apiKey) {
    console.error('\n❌ 缺少 DASHSCOPE_API_KEY 环境变量。');
    console.error('   用法：DASHSCOPE_API_KEY=sk-xxx node native/demo/qwen-parse.mjs "你的一句话"');
    process.exit(2);
  }

  try {
    const { actions, usage, ms, model: used } = await callQwen(text, { apiKey, model, base });
    renderList(actions);
    console.log(`\n⏱️  ${ms}ms · model=${used}` +
      (usage ? ` · tokens in/out=${usage.prompt_tokens}/${usage.completion_tokens}` : ''));
  } catch (e) {
    console.error(`\n❌ 解析失败：${e.message}`);
    if (e.code === 'AllocationQuota.FreeTierOnly') {
      console.error('\n💡 这是账号计费问题，不是脚本问题：当前 API Key 处于「仅用免费额度」模式且免费额度已用尽。');
      console.error('   修复：登录阿里云百炼控制台 → 关闭「仅免费额度」/ 开通按量付费，即可让本脚本直接跑通。');
      console.error('   （也可换一个仍有免费额度的 Key：DASHSCOPE_API_KEY=... 重跑。）');
    }
    process.exit(1);
  }
}

main();
