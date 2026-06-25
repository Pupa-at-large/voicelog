# 语迹 VoiceLog · macOS 桌面版

把网页原型打包成一个**可双击的 Mac App**（像 Claude 桌面版那样：下载 → 拖进「应用程序」，不走 App Store）。
复用现有网页代码，构建时把 JSX 提前编译、React 打进包里（不依赖 CDN，启动快、可离线用规则解析）。

## 在你的 Mac 上出包（一次性装好 Node 后，两步）
前置：装 **Node 18+**（https://nodejs.org，下载 LTS 一路下一步）。

```bash
cd desktop
npm install            # 装 electron / 构建依赖（第一次较慢）
npm run dist           # 编译 + 打包，产物在 desktop/release/（.dmg 和 .zip）
```
打开 `desktop/release/` 里的 `.dmg`，把「语迹 VoiceLog」拖进「应用程序」即可。

> 想先快速看效果（不打包，直接开窗口运行）：`npm start`

## ⚠️ 第一次打开会提示「无法验证开发者」
因为没有 Apple 开发者账号、App **未签名/未公证**（功能完全正常）。绕过一次即可：
- **右键点 App → 打开 → 再点"打开"**；或
- 系统设置 → 隐私与安全性 → 找到提示 → "仍要打开"。
之后双击就能直接开。要彻底去掉提示：买 Apple 开发者账号（$99/年）做签名+公证。

## 关于 AI 解析
桌面版默认连我们的后端 `https://voicelog.onrender.com`（需要联网；可在 `build.mjs` 里改
`VL_SERVER`）。没网时自动回退到本地规则解析。

## 目录
- `build.mjs` 构建脚本（JSX→JS + 打包 React，产物 `dist/`）
- `main.js` Electron 主进程（开窗口、加载 `dist/index.html`）
- `package.json` 依赖与打包配置（`mac.identity=null` 表示不签名）

## 还没做（需要时再加）
- App 图标（现在是 Electron 默认图标）——给我一张 1024×1024 的图就能换上。
- 真·签名/公证（要开发者账号）。
- Windows 版（`electron-builder --win` 即可，同一套代码）。
