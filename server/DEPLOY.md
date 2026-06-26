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

---

# 账户 + 云端同步：从骨架到 To-C 生产

`index.mjs` 现在带了一套**可跑通的 MVP 骨架**（手机号登录 + `/sync/push`·`/sync/pull` 增量同步，
按 `updated_at`「后写赢」）。它**故意用最简实现**好让你看清全貌——`node server/test.mjs` 可一键验证。
要真正给很多人用，按下面把每块换成生产件即可，**协议和数据形状不用变**：

| 骨架（现在） | 生产替换 | 为什么 |
|---|---|---|
| JSON 文件 `.data/store.json` | **Postgres / 阿里云 RDS**，每行带 `user_id`，开**行级安全(RLS)** | 并发、备份、按用户隔离 |
| `token → phone` 内存表 | **JWT**（签名、可过期、无状态） | 不依赖单机内存、可水平扩容 |
| `/auth/request` 直接回 `devCode` | **短信服务商**（阿里云短信 / 腾讯云 SMS）下发，加**频率限制** | 真实验证码 + 防刷 |
| `/parse` 不校验登录 | **要求 token + 按用户限流/计费** | LLM 调用要花钱，必须挡住盗用 |
| 单实例 `node` | serverless（**阿里云函数计算** / Vercel）+ 托管库 | 免运维、自动伸缩 |

**数据层要补的字段**（同步必需，下一步接进 App 时加）：每条事件带 `updated_at`（改了就刷新）、
`deleted`（删除也要同步的「墓碑」）、`id` 全局唯一。客户端 `window.VL.sync` 已按这套实现了
`flatten / merge（后写赢） / rebuild`，接进 App 状态机即可。

**国内 To-C 的非代码项**（往往比写代码更挡路，提前排期）：
- **ICP 备案**（域名 + 境内云，1–2 周）；
- **PIPL 合规**：隐私政策、明示同意、最小收集、账号可注销、数据**存境内**；
- 用通义千问本身在阿里云境内，数据不出境，这点省事。

**推荐栈（国内 To-C，跟 DashScope 同生态）**：阿里云**函数计算 FC**（后端 + LLM 代理）+ **RDS/PolarDB**（数据）
+ **OSS**（导出/附件）+ **短信服务**（登录）。想最快跑通/偏全球：**Supabase**（Auth+Postgres+RLS+Realtime 一站式）
+ **Cloudflare/Vercel Functions**（LLM 代理）。

**隐私强度的岔路**：起步用「**传输 TLS + 数据库静态加密**」，服务端仍能跑解析/搜索；
若要**端到端加密(E2E)**（连服务器都读不到你的内容），代价是服务端**没法**再跑 LLM/搜索——
建议先不上，留作高级选项。
