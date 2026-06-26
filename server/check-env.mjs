// .env 自查：只看每个 key「有没有读到、长度多少」，不打印 key 本身。
// 跑法（在 server 文件夹里）：node check-env.mjs
try { process.loadEnvFile(new URL('./.env', import.meta.url)); } catch (e) { console.log('⚠️  没找到 .env（先 cp .env.example .env）'); }

const show = (k) => {
  const v = process.env[k] || '';
  console.log('  ' + k.padEnd(18), v ? `已读到，长度 ${v.length}` : '✗ 空 / 没读到');
};
console.log('—— .env 自查 ——');
show('DASHSCOPE_API_KEY');
show('ARK_API_KEY');
console.log('  ARK_ENDPOINT_ID   ', JSON.stringify(process.env.ARK_ENDPOINT_ID || ''));

const ark = !!process.env.ARK_API_KEY;
const provider = process.env.PARSE_PROVIDER || (ark ? 'ark（豆包）' : 'qwen（千问）');
console.log('\n结论：启动后解析引擎会用 =', provider);
if (ark) console.log('✓ 豆包 key 已读到，重启 node index.mjs 应显示 ark=true');
else console.log('✗ 豆包没读到 → .env 里 ARK_API_KEY 那行多半还带着开头的 # 注释，或没保存');
const dlen = (process.env.DASHSCOPE_API_KEY || '').length;
if (dlen > 0 && dlen < 20) console.log('ℹ️  DASHSCOPE_API_KEY 长度', dlen, '像是模板占位假值（真 key 通常 30+），千问其实没真接通');
