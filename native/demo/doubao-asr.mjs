#!/usr/bin/env node
/*
 * VoiceLog · 豆包语音(火山引擎)语音转文字 demo
 * 录音文件 → 豆包大模型 ASR → 文字
 *
 * 这是产线方向的探针：设计版的"点麦克风说话"目前走浏览器自带的 Web Speech API
 * （见 screens-home.jsx 的「浏览器语音识别」），PRD 说部署时换成真实云端 STT。
 * 本脚本把"换成豆包语音免费额度"这条路先跑通最简单的一段——HTTP 录音文件识别
 * 标准版（提交任务 → 轮询查询 → 拿到文字），用来验证 AppID/Token 与免费额度可用。
 *
 * 说明：火山的"一句话/流式识别"是 WebSocket 二进制帧协议（给麦克风边说边出字用），
 * 更重；本探针先用 HTTP 录音文件接口验证"音频→文字"这一段，实时流式留作下一步。
 *
 * 用法:
 *   DOUBAO_APP_ID=xxx DOUBAO_ACCESS_TOKEN=xxx \
 *     node native/demo/doubao-asr.mjs https://your.cdn/sample.mp3
 *
 *   # 不传 URL → 用内置示例音频 URL（需替换成你自己的可公网访问音频）
 *   DOUBAO_APP_ID=xxx DOUBAO_ACCESS_TOKEN=xxx node native/demo/doubao-asr.mjs
 *
 *   # 离线 mock：不联网，用代表性返回走真实渲染路径（演示「ASR JSON → 文字」段）
 *   node native/demo/doubao-asr.mjs --mock
 *
 * 环境变量:
 *   DOUBAO_APP_ID          必填，火山控制台「豆包语音」应用的 AppID
 *   DOUBAO_ACCESS_TOKEN    必填，对应的 Access Token
 *   DOUBAO_ASR_RESOURCE_ID 可选，默认 volc.bigasr.auc（录音文件识别标准版）
 *                          极速版= volc.bigasr.auc_turbo；新 seed 模型= volc.seedasr.auc
 *                          —— 以控制台开通/「模型列表」页给出的为准
 *   DOUBAO_AUDIO_FORMAT    可选，默认 mp3（wav/pcm/ogg/m4a…，要和音频实际格式一致）
 *   DOUBAO_AUDIO_URL       可选，音频公网地址（也可作为第一个命令行参数传入）
 *   DOUBAO_BASE            可选，默认 https://openspeech.bytedance.com
 */

const BASE = process.env.DOUBAO_BASE || 'https://openspeech.bytedance.com';
const SUBMIT_PATH = '/api/v3/auc/bigmodel/submit';
const QUERY_PATH = '/api/v3/auc/bigmodel/query';

// 火山大模型接口用响应头里的状态码表示结果状态（不是 HTTP status）。
const ST_SUCCESS = '20000000'; // 成功 / 任务完成
const ST_PROCESSING = '20000001'; // 处理中
const ST_QUEUED = '20000002'; // 排队中

function commonHeaders({ appId, token, resourceId, requestId }) {
  return {
    'Content-Type': 'application/json',
    'X-Api-App-Key': appId,
    'X-Api-Access-Key': token,
    'X-Api-Resource-Id': resourceId,
    'X-Api-Request-Id': requestId, // 提交与查询用同一个 id 关联同一任务
    'X-Api-Sequence': '-1',
  };
}

// ── 1) 提交任务 ────────────────────────────────────────────────────────
async function submitTask({ appId, token, resourceId, requestId, audioUrl, format }) {
  const body = {
    user: { uid: 'voicelog-demo' },
    audio: { format, url: audioUrl },
    request: {
      model_name: 'bigmodel',
      enable_itn: true, // 数字/单位规整（"两点三十" → 14:30 之类）
      enable_punc: true, // 智能标点
    },
  };
  const res = await fetch(BASE + SUBMIT_PATH, {
    method: 'POST',
    headers: commonHeaders({ appId, token, resourceId, requestId }),
    body: JSON.stringify(body),
  });
  const code = res.headers.get('X-Api-Status-Code');
  const msg = res.headers.get('X-Api-Message') || '';
  if (code !== ST_SUCCESS) {
    const raw = await res.text().catch(() => '');
    const e = new Error(`提交任务失败：status=${code || res.status} ${msg} ${raw}`.trim());
    e.statusCode = code;
    throw e;
  }
  return requestId; // 任务 id 即我们传入的 X-Api-Request-Id
}

// ── 2) 轮询查询 ────────────────────────────────────────────────────────
async function queryTask({ appId, token, resourceId, requestId }) {
  const res = await fetch(BASE + QUERY_PATH, {
    method: 'POST',
    headers: commonHeaders({ appId, token, resourceId, requestId }),
    body: JSON.stringify({}),
  });
  const code = res.headers.get('X-Api-Status-Code');
  const msg = res.headers.get('X-Api-Message') || '';
  const raw = await res.text().catch(() => '');
  let json = {};
  try { json = raw ? JSON.parse(raw) : {}; } catch { /* 处理中可能无 body */ }
  return { code, msg, json };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function recognize(opts) {
  const t0 = Date.now();
  await submitTask(opts);
  // 录音文件识别是异步的：提交后轮询，直到完成或超时。
  const deadline = Date.now() + 120_000; // 最多等 2 分钟
  while (Date.now() < deadline) {
    const { code, msg, json } = await queryTask(opts);
    if (code === ST_SUCCESS) {
      return { result: json.result || json, ms: Date.now() - t0 };
    }
    if (code === ST_PROCESSING || code === ST_QUEUED) {
      await sleep(1500);
      continue;
    }
    const e = new Error(`查询失败：status=${code} ${msg}`);
    e.statusCode = code;
    throw e;
  }
  throw new Error('查询超时（>120s 仍未完成）');
}

// ── 渲染识别结果 ───────────────────────────────────────────────────────
function renderResult(result) {
  const text = result?.text || '';
  const utterances = result?.utterances || [];
  console.log('\n📝 识别文本');
  console.log('─'.repeat(56));
  console.log(text || '（空）');
  if (utterances.length) {
    console.log('─'.repeat(56));
    console.log('⏱️  分句（带时间戳）');
    utterances.forEach((u, i) => {
      const s = ((u.start_time ?? 0) / 1000).toFixed(1);
      const e = ((u.end_time ?? 0) / 1000).toFixed(1);
      console.log(`  ${i + 1}. [${s}s–${e}s] ${u.text}`);
    });
  }
  console.log('─'.repeat(56));
}

// 代表性返回：当无 Key / 免费额度受限时，仍能演示「ASR JSON → 文字」这一段确实跑通。
const MOCK_RESULT = {
  text: '明天下午三点跟产品开个评审，挺重要的，提前十分钟提醒我。',
  utterances: [
    { text: '明天下午三点跟产品开个评审，', start_time: 120, end_time: 2480 },
    { text: '挺重要的，提前十分钟提醒我。', start_time: 2480, end_time: 4760 },
  ],
};

// ── 主流程 ─────────────────────────────────────────────────────────────
async function main() {
  const appId = process.env.DOUBAO_APP_ID;
  const token = process.env.DOUBAO_ACCESS_TOKEN;
  const resourceId = process.env.DOUBAO_ASR_RESOURCE_ID || 'volc.bigasr.auc';
  const format = process.env.DOUBAO_AUDIO_FORMAT || 'mp3';
  const cliUrl = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const audioUrl = cliUrl || process.env.DOUBAO_AUDIO_URL
    || 'https://example.com/replace-with-your-public-audio.mp3';

  const mock = process.argv.includes('--mock') || process.env.DOUBAO_MOCK === '1';

  if (mock) {
    console.log('🧪 离线 mock：用代表性 ASR 返回走真实渲染（未联网）');
    renderResult(MOCK_RESULT);
    return;
  }

  console.log('🎙️  豆包语音 · 录音文件识别（标准版）');
  console.log(`    音频：${audioUrl}（format=${format}）`);
  console.log(`    资源：${resourceId}`);

  if (!appId || !token) {
    console.error('\n❌ 缺少 DOUBAO_APP_ID / DOUBAO_ACCESS_TOKEN 环境变量。');
    console.error('   在火山控制台「豆包语音」开通后，应用详情里能拿到 AppID 和 Access Token。');
    console.error('   用法：DOUBAO_APP_ID=xxx DOUBAO_ACCESS_TOKEN=xxx node native/demo/doubao-asr.mjs <音频URL>');
    process.exit(2);
  }
  if (audioUrl.includes('example.com')) {
    console.error('\n❌ 没有提供可公网访问的音频 URL。');
    console.error('   录音文件识别要传一个公网可下载的音频地址（或先把音频上传到对象存储拿到 URL）。');
    console.error('   用法：… node native/demo/doubao-asr.mjs https://your.cdn/sample.mp3');
    process.exit(2);
  }

  const requestId = crypto.randomUUID();
  console.log(`\n🤖 提交任务（request-id=${requestId}）并轮询结果…`);

  try {
    const { result, ms } = await recognize({ appId, token, resourceId, requestId, audioUrl, format });
    renderResult(result);
    console.log(`\n⏱️  ${ms}ms · resource=${resourceId}`);
  } catch (e) {
    console.error(`\n❌ 识别失败：${e.message}`);
    console.error('\n💡 排查方向：');
    console.error('   · 401/鉴权类：确认 AppID/Token 正确、且「豆包语音」已开通对应能力；');
    console.error('   · Resource-Id 不匹配：DOUBAO_ASR_RESOURCE_ID 要和控制台开通的模型一致；');
    console.error('   · 额度类：确认免费额度未用尽、或已开通后付费；');
    console.error('   · 音频类：URL 要可公网下载，format 要和实际格式一致。');
    process.exit(1);
  }
}

main();
