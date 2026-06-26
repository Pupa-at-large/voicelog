// 端到端骨架测试：起一个临时后端，模拟「登录 + 两台设备同步」，断言收敛 + 后写赢。
// 不需要 DASHSCOPE key（不碰 /parse）。跑：node server/test.mjs
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'vl-test-'));
const SERVER = fileURLToPath(new URL('./index.mjs', import.meta.url));

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗', msg); } };
const api = async (token, method, p, body) => {
  const r = await fetch(BASE + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const waitHealth = async () => { for (let i = 0; i < 50; i++) { try { const r = await fetch(BASE + '/health'); if (r.ok) return; } catch (e) {} await new Promise((s) => setTimeout(s, 100)); } throw new Error('server not up'); };

const child = spawn(process.execPath, [SERVER], { env: { ...process.env, PORT: String(PORT), VL_DATA_DIR: DATA_DIR, NODE_ENV: 'development' }, stdio: ['ignore', 'ignore', 'inherit'] });

try {
  await waitHealth();

  // 1) 登录：请求验证码 → 验证 → 拿 token
  const phone = '13800001111';
  const req = await api(null, 'POST', '/auth/request', { phone });
  ok(req.status === 200 && req.data.devCode, '请求验证码返回 devCode（开发态）');
  const ver = await api(null, 'POST', '/auth/verify', { phone, code: req.data.devCode });
  ok(ver.status === 200 && ver.data.token, '验证成功拿到 token');
  const token = ver.data.token;

  // 未登录被挡
  const noAuth = await api(null, 'GET', '/sync/pull?since=0');
  ok(noAuth.status === 401, '未登录访问 /sync/pull 被拒（401）');
  // 错误验证码被挡
  const bad = await api(null, 'POST', '/auth/verify', { phone, code: '000000' });
  ok(bad.status === 401, '错误验证码被拒（401）');

  // 2) 设备 A：推一条事件，拉回
  const evA = { id: 'e1', day: '06-26', t: '09:00', title: '晨会', cat: 'meet', status: 'todo', updated_at: 100 };
  await api(token, 'POST', '/sync/push', { events: [evA] });
  let curA = 0;
  const pullA = await api(token, 'GET', '/sync/pull?since=' + curA);
  curA = pullA.data.cursor;
  ok(pullA.data.events.length === 1 && pullA.data.events[0].title === '晨会', '设备A 推送后能拉到「晨会」');

  // 3) 设备 B（同账号、游标从 0）：拉到设备A 的数据 = 跨设备同步
  const pullB0 = await api(token, 'GET', '/sync/pull?since=0');
  ok(pullB0.data.events.some((e) => e.id === 'e1'), '设备B 从 0 拉到设备A 的「晨会」（跨设备同步）');

  // 4) 设备 B：改 e1（updated_at 更大）+ 新增 e2，推上去
  const evA2 = { ...evA, title: '晨会（改到会议室）', updated_at: 200 };
  const evB = { id: 'e2', day: '06-26', t: '14:00', title: '写周报', cat: 'deep', status: 'todo', updated_at: 150 };
  await api(token, 'POST', '/sync/push', { events: [evA2, evB] });

  // 5) 设备 A：增量拉（since=curA）应看到 e1 的新标题 + e2
  const pullA2 = await api(token, 'GET', '/sync/pull?since=' + curA);
  const got = Object.fromEntries(pullA2.data.events.map((e) => [e.id, e]));
  ok(got.e1 && got.e1.title === '晨会（改到会议室）', '设备A 增量拉到 e1 的最新标题（后写赢）');
  ok(got.e2 && got.e2.title === '写周报', '设备A 增量拉到新增的 e2');

  // 6) 陈旧写入被忽略：用更小的 updated_at 推 e1，标题不应回退
  await api(token, 'POST', '/sync/push', { events: [{ ...evA, title: '旧标题', updated_at: 150 }] });
  const pullA3 = await api(token, 'GET', '/sync/pull?since=0');
  const e1now = pullA3.data.events.find((e) => e.id === 'e1');
  ok(e1now && e1now.title === '晨会（改到会议室）', '陈旧 updated_at 的写入被忽略（不回退）');
} catch (e) {
  fail++; console.log('  ✗ 测试异常：', e.message);
} finally {
  child.kill();
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (e) {}
  console.log(`\n同步骨架测试：${pass} 通过 / ${fail} 失败`);
  process.exit(fail ? 1 : 0);
}
