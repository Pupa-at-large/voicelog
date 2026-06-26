# 语迹 VoiceLog · 最小后端代理

把 API key 藏在服务器端（前端/手机不接触密钥），并解决浏览器跨站(CORS)问题。
**密钥永远不写进代码，只放 `.env` 或部署平台的环境变量。**

## 已实现
- `POST /parse`  `{ "text": "明天三点开会" }` → 通义千问 → 结构化「待执行清单」JSON（密钥在服务端）
- `GET /health` 健康检查
- **账户（手机号验证码登录）** —— To-C 同步的前提
  - `POST /auth/request` `{ "phone": "138..." }` → 发验证码（**骨架版直接回 `devCode` / 打印到控制台**，生产换短信服务商）
  - `POST /auth/verify`  `{ "phone", "code" }` → `{ token }`
- **可同步数据层（登录后，带 `Authorization: Bearer <token>`）**
  - `POST /sync/push` `{ events:[{ id, day, t, title, …, updated_at, deleted }] }` → 按 `updated_at`「后写赢」合并 → `{ cursor }`
  - `GET /sync/pull?since=<cursor>` → 自上次游标以来的增量 `{ events, cursor }`

> 存储是「每用户一份记录」的 **JSON 文件骨架**（`server/.data/store.json`，已 gitignore）。
> **生产请换数据库**（RDS/Postgres + 行级隔离）、token 换 JWT、验证码换短信服务商，见 `DEPLOY.md`。

## 待接
- `POST /asr` 音频 → 火山/通义一句话识别 → 文字（真实语音录入那一步）

## 本地跑（30 秒）
```bash
cd server
cp .env.example .env      # 填入你的 DASHSCOPE_API_KEY
node index.mjs            # 需 Node ≥ 18，零依赖
# 解析（密钥在服务端）：
curl -X POST localhost:8787/parse -H 'Content-Type: application/json' \
  -d '{"text":"嗯，明天下午三点跟老王开会，提前半小时提醒，在公司"}'
```

## 验证「登录 + 跨设备同步」骨架
```bash
node server/test.mjs   # 起临时后端，模拟两台设备同步，断言收敛 + 后写赢（9 项）
```
浏览器里也能手动试（前端已挂 `window.VL.sync`，默认不联网、不影响离线使用）：
```js
// DevTools 控制台：
VL.sync.configure('http://localhost:8787')          // 指到本地后端
const { devCode } = await VL.sync.requestOtp('13800000000')
await VL.sync.verifyOtp('13800000000', devCode)     // 登录拿 token
await VL.sync.syncNow({ '06-26': [{ id:'x', t:'09:00', title:'晨会', updated_at: Date.now() }] })
```

## 以后部署（让 App/网页"打开就能用"）
任选其一，把 `.env` 里的值填到平台的「环境变量」：
- Vercel / Netlify Functions（免费档）
- 腾讯云函数 / 阿里云函数计算（国内更快）
- 任意小服务器 `node index.mjs` + 反代

部署后拿到一个网址（如 `https://xxx.vercel.app`），App/网页调它的 `/parse`、`/asr` 即可，密钥全程在服务器端。
