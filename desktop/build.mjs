// 语迹 VoiceLog · 桌面版构建脚本
// 把网页原型"提前编译"成静态包：JSX → JS（不再浏览器现场编译）、React 打进本地（不依赖 CDN）。
// 产物在 desktop/dist/，Electron 直接加载它。跑：node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import Babel from '@babel/standalone';

const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, '..');
const DIST = path.join(HERE, 'dist');
const APP = path.join(DIST, 'app');

// app.html 的脚本装载顺序（顺序敏感：共享依赖在前）
const PLAIN = ['project/app/tokens.js', 'project/app/data.js', 'project/app/parser.js'];
const JSX = [
  'project/app/icons.jsx', 'project/app/ui.jsx',
  'project/app/screens-home.jsx', 'project/app/screens-overview.jsx',
  'project/app/screens-review.jsx', 'project/app/screens-export.jsx', 'project/app/screens-growth.jsx',
  'project/webapp/web-calendar.jsx', 'project/webapp/web-voice.jsx', 'project/webapp/web-celebrate.jsx',
  'project/webapp/web-growth.jsx', 'project/webapp/web-welcome.jsx', 'project/webapp/web-app.jsx',
];
// 默认后端（让桌面版开箱就有 AI 解析；用户可在设置里改）
const DEFAULT_SERVER = process.env.VL_SERVER || 'https://voicelog.onrender.com';

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(APP, { recursive: true });
fs.mkdirSync(path.join(DIST, 'vendor'), { recursive: true });

// 1) React / ReactDOM 生产版打进本地 vendor/
const reactDir = path.dirname(require.resolve('react/package.json'));
const reactDomDir = path.dirname(require.resolve('react-dom/package.json'));
fs.copyFileSync(path.join(reactDir, 'umd/react.production.min.js'), path.join(DIST, 'vendor/react.js'));
fs.copyFileSync(path.join(reactDomDir, 'umd/react-dom.production.min.js'), path.join(DIST, 'vendor/react-dom.js'));

// 2) 纯 JS 原样拷贝；JSX 提前编译成 JS
const out = []; // <script> 顺序
for (const f of PLAIN) {
  const name = path.basename(f);
  fs.copyFileSync(path.join(REPO, f), path.join(APP, name));
  out.push('app/' + name);
}
let compiled = 0;
for (const f of JSX) {
  const src = fs.readFileSync(path.join(REPO, f), 'utf8');
  const js = Babel.transform(src, { presets: ['react'], filename: f }).code;
  const name = path.basename(f).replace(/\.jsx$/, '.js');
  fs.writeFileSync(path.join(APP, name), js);
  out.push('app/' + name);
  compiled++;
}

// 3) 入口渲染脚本（来自 app.html 的内联脚本，含 JSX → 编译）
const entryJSX = `
  const Web = window.VoiceLogWeb;
  const themes = window.VL.themes;
  if (window.VL && window.VL.setServerUrl && !window.VL.serverUrl) window.VL.setServerUrl(${JSON.stringify(DEFAULT_SERVER)});
  ReactDOM.createRoot(document.getElementById('root')).render(<Web theme={themes.cloud} />);
  requestAnimationFrame(() => requestAnimationFrame(() => { const s = document.getElementById('splash'); if (s) { s.style.opacity = '0'; setTimeout(() => s.remove(), 450); } }));
`;
fs.writeFileSync(path.join(APP, 'entry.js'), Babel.transform(entryJSX, { presets: ['react'], filename: 'entry.js' }).code);
out.push('app/entry.js');

// 4) index.html（含启动屏；先 vendor，再编译脚本，最后入口）
const scripts = ['vendor/react.js', 'vendor/react-dom.js', ...out].map((s) => `<script src="${s}"></script>`).join('\n');
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>语迹 VoiceLog</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; background: #fff; }
  body { font-family: -apple-system, "PingFang SC", system-ui, sans-serif; }
  #root { height: 100vh; width: 100%; position: relative; overflow: hidden; }
  #splash { position: fixed; inset: 0; z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; background: #0c0c0e; transition: opacity .4s ease; }
  #splash .lg { width: 80px; height: 80px; border-radius: 22px; background: #3f7afe; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 34px rgba(0,0,0,.45); }
  #splash .nm { color: #fff; font-size: 24px; font-weight: 800; letter-spacing: -0.3px; }
  #splash .nm span { color: #9db8ff; }
  #splash .sl { color: rgba(255,255,255,.5); font-size: 13px; }
</style>
</head>
<body>
<div id="splash">
  <div class="lg"><svg width="44" height="44" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="9" width="3" height="6" rx="1.5" fill="#fff"/><rect x="7.5" y="4" width="3" height="16" rx="1.5" fill="#fff"/><rect x="12.5" y="6.5" width="3" height="11" rx="1.5" fill="#fff"/><rect x="17.5" y="10" width="3" height="4" rx="1.5" fill="#fff"/></svg></div>
  <div class="nm">语迹 <span>VoiceLog</span></div>
  <div class="sl">时间是你最大的资产</div>
</div>
<div id="root"></div>
${scripts}
</body>
</html>
`;
fs.writeFileSync(path.join(DIST, 'index.html'), html);
console.log(`✅ 构建完成 → desktop/dist/  （编译 ${compiled} 个 jsx，纯 JS ${PLAIN.length} 个，React 已打包）`);
