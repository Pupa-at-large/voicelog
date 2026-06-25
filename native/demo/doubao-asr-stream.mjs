#!/usr/bin/env node
/*
 * VoiceLog · 豆包语音(火山引擎)实时流式「一句话识别」demo
 * 麦克风边说边出字 → 豆包大模型流式 ASR → 增量文字（interim → final）
 *
 * 这是产线方向的第二段探针。第一段 doubao-asr.mjs 用 HTTP 录音文件接口验证了
 * 「音频→文字」最简单的一段；本脚本对齐**设计版里点麦克风的交互**：
 * screens-home.jsx 的语音 overlay 是一台 listening→interim→final 的增量状态机
 * （Web Speech API 的 onresult 里累积 interim/final 文本，「正在听…」下面实时刷字）。
 * 火山的流式识别正是给这个交互用的：WebSocket 二进制帧，边发音频边收增量结果。
 *
 * node 没有麦克风，所以这里用「读本地音频文件 → 按 ~100ms 切片 → 按真实时长节流发送」
 * 来逼真模拟"边说边发"，把流式链路（建连→发配置→流式发音频→收增量→收 final）跑通，
 * 验证 AppID/Token 与免费额度在**流式**接口上同样可用。
 *
 * 零依赖：Node 22 自带全局 WebSocket（且支持握手自定义头，火山鉴权正是走头），
 * gzip 走内置 node:zlib。无需 npm install。
 *
 * 用法:
 *   # 真·流式识别（需要火山「豆包语音」AppID/Token + 一个本地音频文件）
 *   # 推荐 16k/16bit/单声道 PCM（format=pcm），或 wav/mp3
 *   DOUBAO_APP_ID=xxx DOUBAO_ACCESS_TOKEN=xxx \
 *     node native/demo/doubao-asr-stream.mjs ./sample.pcm
 *
 *   # 用 ffmpeg 把任意音频转成接口最稳的 16k 单声道 PCM：
 *   #   ffmpeg -i input.m4a -ar 16000 -ac 1 -f s16le sample.pcm
 *
 *   # 离线 mock：不联网，用代表性增量结果走真实渲染（演示 interim→final 这台状态机）
 *   node native/demo/doubao-asr-stream.mjs --mock
 *
 * 环境变量:
 *   DOUBAO_APP_ID          必填，火山控制台「豆包语音」应用的 AppID
 *   DOUBAO_ACCESS_TOKEN    必填，对应的 Access Token
 *   DOUBAO_ASR_RESOURCE_ID 可选，默认 volc.bigasr.sauc.duration（流式·按时长，含免费额度）
 *                          按并发= volc.bigasr.sauc.concurrent —— 以控制台开通的为准
 *   DOUBAO_AUDIO_FORMAT    可选，默认 pcm（也支持 wav/mp3/ogg）
 *   DOUBAO_AUDIO_RATE      可选，默认 16000（pcm 必须和文件实际采样率一致）
 *   DOUBAO_CHUNK_MS        可选，默认 100，每片音频对应的毫秒数（节流间隔）
 *   DOUBAO_WS_BASE         可选，默认 wss://openspeech.bytedance.com
 *   DOUBAO_WS_PATH         可选，默认 /api/v3/sauc/bigmodel（出 interim 的流式端点）
 *                          只要 final 不要中间结果用 /api/v3/sauc/bigmodel_nostream
 */

import { gzipSync, gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const WS_BASE = process.env.DOUBAO_WS_BASE || 'wss://openspeech.bytedance.com';
const WS_PATH = process.env.DOUBAO_WS_PATH || '/api/v3/sauc/bigmodel';

// ── 二进制协议常量（与火山官方一致）──────────────────────────────────────
// 4 字节头：[版本|头长][消息类型|标志位][序列化|压缩][保留]
const PROTOCOL_VERSION = 0b0001;
const HEADER_SIZE = 0b0001; // ×4 = 4 字节
const SER_JSON = 0b0001;
const SER_RAW = 0b0000; // 音频帧的 payload 不是 JSON
const COMP_GZIP = 0b0001;

const MT_FULL_CLIENT = 0b0001; // full client request（配置）
const MT_AUDIO_ONLY = 0b0010; // audio only request（音频帧）
const MT_FULL_SERVER = 0b1001; // full server response（识别结果）
const MT_SERVER_ERROR = 0b1111; // error response

const FLAG_POS_SEQ = 0b0001; // 带正序列号，后面还有
const FLAG_NEG_SEQ = 0b0011; // 最后一包，带（负）序列号

// ── 组帧 ───────────────────────────────────────────────────────────────
function makeHeader(messageType, flags, serialization) {
  return Buffer.from([
    (PROTOCOL_VERSION << 4) | HEADER_SIZE,
    (messageType << 4) | flags,
    (serialization << 4) | COMP_GZIP,
    0x00,
  ]);
}

function framePacket(messageType, flags, serialization, seq, rawPayload) {
  const payload = gzipSync(rawPayload);
  const seqBuf = Buffer.alloc(4); seqBuf.writeInt32BE(seq); // 负数表示最后一包
  const sizeBuf = Buffer.alloc(4); sizeBuf.writeUInt32BE(payload.length);
  return Buffer.concat([makeHeader(messageType, flags, serialization), seqBuf, sizeBuf, payload]);
}

function configPacket(config, seq) {
  return framePacket(MT_FULL_CLIENT, FLAG_POS_SEQ, SER_JSON, seq, Buffer.from(JSON.stringify(config)));
}

function audioPacket(chunk, seq, isLast) {
  // 最后一包：标志位 NEG、序列号取负（火山约定）
  return framePacket(MT_AUDIO_ONLY, isLast ? FLAG_NEG_SEQ : FLAG_POS_SEQ, SER_RAW, isLast ? -seq : seq, chunk);
}

// ── 解析服务端帧 ───────────────────────────────────────────────────────
function parseServer(buf) {
  const headerSize = (buf[0] & 0x0f) * 4;
  const messageType = buf[1] >> 4;
  const flags = buf[1] & 0x0f;
  const compression = buf[2] & 0x0f;
  let p = buf.subarray(headerSize);
  const out = { messageType, isLast: !!(flags & 0x02) };
  if (messageType === MT_FULL_SERVER) {
    if (flags & 0x01) { out.seq = p.readInt32BE(0); p = p.subarray(4); } // 带序列号
    const size = p.readUInt32BE(0); let payload = p.subarray(4, 4 + size);
    if (compression === COMP_GZIP) payload = gunzipSync(payload);
    out.json = JSON.parse(payload.toString('utf8'));
  } else if (messageType === MT_SERVER_ERROR) {
    out.code = p.readUInt32BE(0);
    const size = p.readUInt32BE(4); let payload = p.subarray(8, 8 + size);
    if (payload.length && compression === COMP_GZIP) { try { payload = gunzipSync(payload); } catch {} }
    out.message = payload.toString('utf8');
  }
  return out;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── 增量渲染（对齐 overlay 的「正在听…」实时刷字）─────────────────────────
function makeLiveCaption() {
  let printedHeader = false;
  return {
    interim(text) {
      if (!printedHeader) { process.stdout.write('🎧 正在听…\n'); printedHeader = true; }
      // 单行原地刷新，模拟 overlay 里 interim 文本随说话增长
      process.stdout.write('\r\x1b[2K   ' + (text || '…'));
    },
    final(text, utterances) {
      process.stdout.write('\r\x1b[2K');
      console.log('\n📝 识别文本（final）');
      console.log('─'.repeat(56));
      console.log(text || '（空）');
      if (utterances && utterances.length) {
        console.log('─'.repeat(56));
        console.log('⏱️  分句（带时间戳）');
        utterances.forEach((u, i) => {
          const s = ((u.start_time ?? 0) / 1000).toFixed(1);
          const e = ((u.end_time ?? 0) / 1000).toFixed(1);
          console.log(`  ${i + 1}. [${s}s–${e}s] ${u.text}`);
        });
      }
      console.log('─'.repeat(56));
    },
  };
}

// ── 真·流式识别 ─────────────────────────────────────────────────────────
async function streamRecognize({ appId, token, resourceId, audio, format, rate, chunkMs }) {
  const url = WS_BASE + WS_PATH;
  const connectId = crypto.randomUUID();
  const ws = new WebSocket(url, {
    headers: {
      'X-Api-App-Key': appId,
      'X-Api-Access-Key': token,
      'X-Api-Resource-Id': resourceId,
      'X-Api-Connect-Id': connectId,
    },
  });
  ws.binaryType = 'arraybuffer';
  const cap = makeLiveCaption();

  const t0 = Date.now();
  let lastText = '';
  let lastUtterances = [];

  return new Promise((resolve, reject) => {
    const fail = (msg) => { try { ws.close(); } catch {} reject(new Error(msg)); };

    ws.onerror = () => fail(`WebSocket 连接出错（端点 ${url}）`);

    ws.onmessage = (ev) => {
      let frame;
      try { frame = parseServer(Buffer.from(ev.data)); } catch (e) { return fail(`解析服务端帧失败：${e.message}`); }
      if (frame.messageType === MT_SERVER_ERROR) {
        return fail(`服务端错误 code=${frame.code}：${frame.message}`);
      }
      const result = frame.json?.result || {};
      if (typeof result.text === 'string') { lastText = result.text; cap.interim(lastText); }
      if (Array.isArray(result.utterances) && result.utterances.length) lastUtterances = result.utterances;
      if (frame.isLast) {
        cap.final(lastText, lastUtterances);
        try { ws.close(); } catch {}
        resolve({ text: lastText, utterances: lastUtterances, ms: Date.now() - t0 });
      }
    };

    ws.onopen = async () => {
      try {
        // 1) 发配置帧
        const config = {
          user: { uid: 'voicelog-demo' },
          audio: { format, codec: 'raw', rate, bits: 16, channel: 1 },
          request: {
            model_name: 'bigmodel',
            enable_itn: true,
            enable_punc: true,
            show_utterances: true,
          },
        };
        ws.send(configPacket(config, 1));

        // 2) 切片 + 按真实时长节流发送，逼真模拟"边说边发"
        // pcm 16k/16bit/单声道：每 ms 32 字节 → chunkMs 片大小
        const bytesPerMs = format === 'pcm' ? (rate * 2) / 1000 : 4000; // 压缩格式用固定大小切片
        const chunkBytes = Math.max(1, Math.floor(bytesPerMs * chunkMs));
        let seq = 1;
        for (let off = 0; off < audio.length; off += chunkBytes) {
          const slice = audio.subarray(off, off + chunkBytes);
          const isLast = off + chunkBytes >= audio.length;
          seq += 1;
          if (ws.readyState !== WebSocket.OPEN) return; // 已被 final/error 关闭
          ws.send(audioPacket(slice, seq, isLast));
          if (!isLast) await sleep(chunkMs);
        }
      } catch (e) { fail(`发送音频失败：${e.message}`); }
    };

    setTimeout(() => fail('流式识别超时（>120s）'), 120_000);
  });
}

// ── 离线 mock：演示 interim→final 这台状态机（未联网）─────────────────────
async function mockStream() {
  const cap = makeLiveCaption();
  const phrase = '明天下午三点跟产品开个评审，挺重要的，提前十分钟提醒我。';
  // 模拟流式：文字一点点冒出来（与 overlay 的 interim 增长一致）
  for (let i = 2; i <= phrase.length; i += 2) {
    cap.interim(phrase.slice(0, i));
    await sleep(70);
  }
  cap.final(phrase, [
    { text: '明天下午三点跟产品开个评审，', start_time: 120, end_time: 2480 },
    { text: '挺重要的，提前十分钟提醒我。', start_time: 2480, end_time: 4760 },
  ]);
}

// ── 主流程 ─────────────────────────────────────────────────────────────
async function main() {
  const mock = process.argv.includes('--mock') || process.env.DOUBAO_MOCK === '1';
  if (mock) {
    console.log('🧪 离线 mock：流式增量结果走真实渲染（未联网）\n');
    await mockStream();
    return;
  }

  const appId = process.env.DOUBAO_APP_ID;
  const token = process.env.DOUBAO_ACCESS_TOKEN;
  const resourceId = process.env.DOUBAO_ASR_RESOURCE_ID || 'volc.bigasr.sauc.duration';
  const format = (process.env.DOUBAO_AUDIO_FORMAT || 'pcm').toLowerCase();
  const rate = parseInt(process.env.DOUBAO_AUDIO_RATE || '16000', 10);
  const chunkMs = parseInt(process.env.DOUBAO_CHUNK_MS || '100', 10);
  const audioPath = process.argv.slice(2).find((a) => !a.startsWith('--'));

  console.log('🎙️  豆包语音 · 实时流式「一句话识别」');
  console.log(`    端点：${WS_BASE + WS_PATH}`);
  console.log(`    资源：${resourceId} · format=${format}${format === 'pcm' ? ` rate=${rate}` : ''} · 切片=${chunkMs}ms`);

  if (!appId || !token) {
    console.error('\n❌ 缺少 DOUBAO_APP_ID / DOUBAO_ACCESS_TOKEN 环境变量。');
    console.error('   在火山控制台「豆包语音」开通后，应用详情里能拿到 AppID 和 Access Token。');
    console.error('   用法：DOUBAO_APP_ID=xxx DOUBAO_ACCESS_TOKEN=xxx node native/demo/doubao-asr-stream.mjs <音频文件>');
    process.exit(2);
  }
  if (!audioPath) {
    console.error('\n❌ 没有提供本地音频文件。');
    console.error('   流式接口要喂音频字节流；node 没有麦克风，这里用本地文件模拟"边说边发"。');
    console.error('   推荐 16k/16bit/单声道 PCM：ffmpeg -i input.m4a -ar 16000 -ac 1 -f s16le sample.pcm');
    console.error('   用法：… node native/demo/doubao-asr-stream.mjs ./sample.pcm');
    process.exit(2);
  }

  let audio;
  try { audio = readFileSync(audioPath); }
  catch (e) { console.error(`\n❌ 读不到音频文件 ${audioPath}：${e.message}`); process.exit(2); }
  console.log(`    音频：${audioPath}（${audio.length} 字节）\n`);

  try {
    const { ms } = await streamRecognize({ appId, token, resourceId, audio, format, rate, chunkMs });
    console.log(`\n⏱️  ${ms}ms · resource=${resourceId}`);
  } catch (e) {
    console.error(`\n❌ 流式识别失败：${e.message}`);
    console.error('\n💡 排查方向：');
    console.error('   · 鉴权类：确认 AppID/Token 正确、「豆包语音」已开通流式识别能力；');
    console.error('   · Resource-Id 不匹配：DOUBAO_ASR_RESOURCE_ID 要和控制台开通的流式资源一致；');
    console.error('   · 额度类：确认流式免费额度未用尽、或已开通后付费；');
    console.error('   · 音频类：pcm 要 16k/16bit/单声道且 DOUBAO_AUDIO_RATE 与文件一致；wav/mp3 设对 format。');
    process.exit(1);
  }
}

main();
