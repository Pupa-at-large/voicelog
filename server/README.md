# 语迹 VoiceLog · 最小后端代理

把 API key 藏在服务器端（前端/手机不接触密钥），并解决浏览器跨站(CORS)问题。
**密钥永远不写进代码，只放 `.env` 或部署平台的环境变量。**

## 已实现
- `POST /parse`  `{ "text": "明天三点开会" }` → 通义千问 → 结构化「待执行清单」JSON
- `GET /health` 健康检查

## 待接
- `POST /asr` 音频 → 火山一句话识别(WebSocket 二进制协议) → 文字
  （拿到 4 个火山凭证后实现：appid / access_token / access_secret / cluster）

## 本地跑（30 秒）
```bash
cd server
cp .env.example .env      # 填入你的 DASHSCOPE_API_KEY
node index.mjs            # 需 Node ≥ 18，零依赖
# 测试：
curl -X POST localhost:8787/parse -H 'Content-Type: application/json' \
  -d '{"text":"嗯，明天下午三点跟老王开会，提前半小时提醒，在公司"}'
```

## 以后部署（让 App/网页"打开就能用"）
任选其一，把 `.env` 里的值填到平台的「环境变量」：
- Vercel / Netlify Functions（免费档）
- 腾讯云函数 / 阿里云函数计算（国内更快）
- 任意小服务器 `node index.mjs` + 反代

部署后拿到一个网址（如 `https://xxx.vercel.app`），App/网页调它的 `/parse`、`/asr` 即可，密钥全程在服务器端。
