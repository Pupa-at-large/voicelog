// 测一句话解析。需要后端已在另一个终端跑着（node index.mjs）。
// 跑：node try.mjs            （用默认句子）
//     node try.mjs 后天上午十点去医院体检   （自己换句子）
const text = process.argv.slice(2).join(' ') || '明天下午三点跟老王开会，提前半小时提醒';
let r;
try {
  r = await fetch('http://localhost:8787/parse', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
} catch (e) {
  console.error('✗ 连不上后端。先在另一个终端窗口跑 node index.mjs，让它一直开着。', e.message);
  process.exit(1);
}
const data = await r.json().catch(() => ({}));
console.log('HTTP', r.status);
console.log('你说：', text);
console.log('解析结果：\n' + JSON.stringify(data, null, 2));
if (data.error) console.log('\n⚠️ 出错：', data.error, '\n（401=API Key 不对；404 或 model 不存在=接入点 ID 填错/没绑模型）');
else if (Array.isArray(data.actions)) console.log('\n✓ 豆包解析成功，识别出', data.actions.length, '条日程');
