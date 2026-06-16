# 把后端部署上线（让手机/网页"打开就用"真·AI 解析）

前端（GitHub Pages 上的 `m.html`/`app.html`）走 **https**，所以后端也要一个 **https 网址**
（http 的本地地址会被浏览器按「混合内容」拦掉）。`server/index.mjs` 零依赖、直接 `node` 跑，
任选一个能跑 Node 的托管平台即可，**不用改代码**。

## 方案 A：Render（免费、最省心，约 5 分钟）
1. 把本仓库连到 https://render.com → New → **Web Service**。
2. 设置：
   - **Root Directory**：`server`
   - **Build Command**：留空
   - **Start Command**：`node index.mjs`
   - **Environment**：加一条 `DASHSCOPE_API_KEY = sk-你的千问key`
     （可选再加 `QWEN_MODEL=qwen3.6-flash-2026-04-16`、`VL_TODAY=06-16`）
3. 部署完拿到网址，如 `https://voicelog-xxx.onrender.com`。
4. 自检：浏览器打开 `https://voicelog-xxx.onrender.com/health` 应返回 `{"ok":true,"qwen":true}`。

> Railway / Fly.io / 腾讯云函数（容器型）同理：Root=`server`、启动 `node index.mjs`、配 `DASHSCOPE_API_KEY`。
> 国内访问更快可选腾讯云/阿里云函数。

## 接到前端：在链接后面加 `?server=`
把上面的网址带在 Pages 链接后面打开一次（会自动记住，并自动打开「AI 解析」）：

```
https://pupa-at-large.github.io/voicelog/m.html?server=https://voicelog-xxx.onrender.com
https://pupa-at-large.github.io/voicelog/app.html?server=https://voicelog-xxx.onrender.com
```

之后正常打开 `m.html` / `app.html` 即可——地址已存在手机本地（localStorage）。
要清掉：浏览器 console 里 `VL.setServerUrl('')`。

## 没配 / 后端挂了会怎样
**零影响**：语音解析自动回退到本地规则引擎（离线可用）。配了后端且「AI 解析」开着，
才会把你说的话发给千问；失败也会静默回退，绝不卡住。

## 想本地先试（不部署）
两端都用 http 就不会有混合内容问题：在电脑上同时跑
`python3 -m http.server 8080`（仓库根）和 `node server/index.mjs`，
手机与电脑同一 Wi-Fi，手机开 `http://<电脑IP>:8080/m.html?server=http://<电脑IP>:8787`。
