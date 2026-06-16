# 语迹 VoiceLog · 技术选型调研与建议（v0.1）

> 面向「做成能上架 iOS/安卓的真 App、开发者在中国大陆、预算敏感、先自用」。
> 时效：**2026-06**。价格波动很快，落地前请按文末链接复核。
> 说明：本轮调研用联网搜索 + 抓取完成；部分国内官网对抓取返回 403，价格以多源新闻/社区交叉核对为准，已标注不确定项。

---

## 0. 一页结论（我的推荐）

| 维度 | 我的首选 | 备选 | 一句话理由 |
|---|---|---|---|
| App 技术栈 | **Expo (React Native) + EAS Build** | 裸 RN / Flutter | 复用你现有 React、一套码双端上架、能用 Expo Go 立刻自用 |
| 语音识别 ASR（中英夹杂）| **火山引擎(字节豆包) 流式 ASR** 或 **讯飞** | 阿里云 / 腾讯云；海外质量基准 OpenAI gpt-4o-transcribe | 中英混说与中文口语强、国内直连低延迟 |
| LLM（口语→结构化日程）| **DeepSeek（deepseek-chat / V4）** | **通义千问 Qwen-Flash/Plus**（免费额度大）、豆包 lite、ERNIE-Speed(免费) | 最便宜之一、中文强、JSON 输出稳 |
| 本地优先同步 | **PowerSync**（托管、离线一流、支持 Expo） | WatermelonDB（OSS 自建同步）、expo-sqlite+Drizzle+自写同步 | 你说同步“不是核心、要省事”→ 选托管最省力 |
| 登录 | **手机号验证码先做**；微信登录二期 | 无账号设备配对 | 微信要企业资质+备案，手机号最快落地 |

**每月成本（自用/小范围）粗估**：Apple 开发者 $99/年 + Google Play $25（一次）；LLM+ASR 在个人用量下 **几元~几十元/月**；短信几分钱/条；同步用免费额度 ≈ 0。**头一年≈ $130 + 几十元人民币**。

> ⚠️ 重要现实：**“上架中国区 App Store / 安卓市场”需要软著 + APP 备案（工信部）+（含登录则）ICP**，这部分是流程与资质成本，不是写代码能省的。详见第 5 节。

---

## 1. App 技术栈：为什么是 Expo (React Native)

- **复用心智**：你现有原型就是 React，迁到 RN 概念几乎平移（组件/状态/hooks），不像 Flutter 要重学 Dart。
- **一套代码双端**：iOS + 安卓同源；**EAS Build** 云端出 `.ipa`/`.aab`，无需自备 Mac 也能出 iOS 包。
- **能立刻自用**：装 **Expo Go**，扫码即在真机跑（你“自用”诉求当天就能满足，不必等上架）。
- **坑要知道**：
  - 需要**原生模块**（微信 SDK、某些 ASR SDK）时，得用 **development build / config plugin**，不能只靠 Expo Go。
  - **EAS Build 免费额度有限**（排队 + 每月次数限制），重度构建可能要 Builder 订阅（约 $19+/月）或本地构建。
  - 中国区还要处理 **APP 备案、推送（用极光/个推替代 FCM，因为 FCM 在国内不可用）**。
- 结论：对“React 背景 + 双端上架 + 要自用”，**Expo 是性价比最高的路径**。Flutter 性能略优但迁移成本不划算。

来源：Expo Docs（local-first、EAS）、PowerSync/RN 生态对比、社区 2025–2026 多篇。

---

## 2. 语音识别 ASR（重点：中英文夹杂）

> 本轮国内 ASR 官网抓取多被 403 拦，**具体单价请以官网为准**；下面是能力判断 + 量级。

| 方案 | 中英混说 | 形态 | 量级价格 | 国内可用 | 备注 |
|---|---|---|---|---|---|
| **火山引擎（字节/豆包）** | 强（字节自家中英混训练好） | 流式/一句话/录音文件 | 实时约 ¥1.x–3/小时量级 | ✅ 直连 | 与豆包生态打通，口碑佳 |
| **科大讯飞** | 强（中文老牌，方言/中英混好） | 流式/录音 | 按时长/路并发计费 | ✅ | SDK 成熟，文档全 |
| **阿里云智能语音** | 较好 | 流式/录音 | 有免费额度 | ✅ | 和通义生态打通 |
| **腾讯云 ASR** | 较好 | 流式/录音 | 有免费额度 | ✅ | 文档规范 |
| **OpenAI gpt-4o-transcribe / whisper** | 很好（多语种） | REST | $/分钟 | ❌ 需代理 | 适合做质量基准，不适合国内生产 |
| 自建 Whisper | 好（large-v3） | 自托管 | 服务器成本 | ✅ | 省调用费但要运维 GPU |

**建议**：国内生产用 **火山引擎或讯飞** 的**流式 ASR**（边说边出字，体验好）；做准确率基准时可拿 gpt-4o-transcribe 对比。RN 接法：优先 **REST/WebSocket**（避免原生 SDK 的 Expo 兼容问题），录音用 `expo-av` / `expo-audio`。

> 另一条新路线：**端到端语音大模型**（如通义 Qwen-Omni、豆包实时语音），直接“听懂并给结构化结果”，省掉 ASR+LLM 两段。属前沿，可二期评估。

---

## 3. LLM（把口语解析成结构化日程 / 多意图）

> 国产模型 2025–2026 经历多轮“价格战”，普遍极便宜。以下为交叉核对的量级（CNY/百万 token），**以官网为准**。

| 模型 | 输入(miss) | 输出 | 免费额度 | 中文/JSON | 国内直连 |
|---|---|---|---|---|---|
| **DeepSeek（deepseek-chat / V4-Flash）** | ~¥1 | ~¥2 | 偶有活动 | 强 / 稳 | ✅ |
| DeepSeek V4-Pro | ~¥3 | ~¥6 | — | 更强 | ✅ |
| **通义千问 Qwen-Flash/Turbo** | 极低（角分级） | 低 | **额度大方** | 强 / 支持 JSON mode | ✅ |
| 豆包（字节）lite/pro | 低 | 低 | 有 | 强 | ✅ |
| **文心 ERNIE-Speed/Lite/Tiny** | **免费** | **免费** | 长期免费 | 中 | ✅ |
| 文心 ERNIE-4.5-Turbo | ~¥0.8 | ~¥3.2 | — | 强 | ✅ |
| 智谱 GLM-4-Flash / Kimi / MiniMax | 低 | 低 | 有 | 强 | ✅ |
| OpenAI gpt-4o-mini / Claude Haiku / Gemini Flash | 低-中（$） | — | — | 强 | ❌ 需代理 |

**建议**：
- **最省**：先用 **ERNIE-Speed（免费）** 或 **Qwen-Flash（额度大）** 跑通，零成本验证。
- **质量性价比**：主力用 **DeepSeek deepseek-chat**（便宜、中文强、function calling/JSON 稳），或 **Qwen-Plus**。
- ⚠️ **DeepSeek 模型名迁移**：`deepseek-reasoner` 将于 **2026-07-24 弃用**（现指向 V4-Flash 思考模式）；用 `deepseek-chat` 或新 V4 名。
- 解析要**强制 JSON 输出**（schema/function calling）+ 失败回退到现有规则引擎，永不崩。

---

## 4. 本地优先多端同步引擎（RN/Expo 可用）

| 方案 | 离线优先 | 自动同步 | Expo/RN | 价格 | 备注 |
|---|---|---|---|---|---|
| **PowerSync** | ✅ 一流 | ✅ 内置 | ✅ RN SDK 成熟；Expo Go 走 SQL.js | 有免费档 | 接 Postgres/Supabase；最省力 |
| **WatermelonDB** | ✅（SQLite 之上、响应式）| ❌ 需自写同步 | ✅（SDK54 指南）| OSS 免费 | 大数据量强，但同步要自己实现 |
| **expo-sqlite + Drizzle (+TanStack Query)** | ✅ | ❌ 自写 | ✅ 官方 | 免费 | 轻、可控；同步逻辑自理 |
| RxDB | ✅ | ✅（后端无关）| ✅（高性能存储需付费）| 免费/付费 | WebView 内有数据丢失坑 |
| InstantDB / Jazz / LiveStore | ✅ | ✅ | ✅（新兴，Expo 一类支持）| 免费档 | 体验新、生态较新 |
| **Realm / Atlas Device Sync** | — | — | — | — | ❌ **已停服（2025-09-30 下线），别用** |
| ElectricSQL (electric-next) | ❌（不管客户端持久化）| 部分 | ✅ | — | 定位变了，离线“不在范围内” |

**建议**：你说同步“不是核心、要省事”→ 首选 **PowerSync**（托管、离线一流、RN/Expo 支持好，有免费额度）。若想 **OSS 无供应商绑定**，用 **expo-sqlite + Drizzle + 自写 LWW 同步**（配合我们设计文档里的 tombstone/回收站方案）。**避免 Realm（已死）**。

---

## 5. 登录与上架资质（中国大陆现实）

**手机号登录（建议先做）**：
- 短信验证码：**阿里云 / 腾讯云 SMS**，约 **¥0.03–0.045/条**；需短信签名+模板审核。
- 或运营商**一键登录**（号码认证），体验最好，需资质、按次计费。

**微信登录（二期）**：
- 库：`react-native-wechat-lib`（RN 可用，需 development build，不走 Expo Go）。
- 前置：**微信开放平台账号 + 企业资质**（个人很难下网站/移动应用），**APP 备案**，年审费用。
- 用 **unionid** 统一网站/小程序/公众号身份。

**上架硬门槛（重要）**：
- **软件著作权（软著）** + **APP 备案（工信部，2024 起强制）**：上中国区 App Store 与各安卓市场基本都要。
- 含登录/联网服务 → 需 **ICP 备案域名** 给后端。
- Apple Developer **$99/年**；Google Play **$25（一次）**；国内安卓市场（华为/小米/OPPO/vivo/应用宝）各自有开发者入驻与审核。
- 备案/软著有**时间成本**（数周），建议尽早并行启动。

---

## 6. 如果是我，整套怎么搭 + 成本

1. **端**：Expo (RN) + TypeScript + EAS Build。先用 Expo Go 自用预览。
2. **存储/同步**：起步 expo-sqlite（本地），同步上 **PowerSync** 免费档（或先不开同步，P1 再加）。
3. **LLM**：**DeepSeek deepseek-chat** 主力（或 ERNIE-Speed/Qwen 免费起步），强制 JSON + 规则兜底。
4. **ASR**：**火山引擎/讯飞 流式**；`expo-audio` 录音 → WebSocket 流式识别。
5. **后端**：一个轻量 Serverless（Vercel/腾讯云函数）藏各家 Key + 转发；含登录则配 ICP 域名。
6. **登录**：先手机号（阿里云 SMS），微信二期。

**成本**：开发期≈ Apple $99/年 + Google $25；API 自用量级几元~几十元/月；同步/短信几乎可忽略。**真正的“成本”是备案/软著/微信资质的流程时间**，不是钱。

---

## 7. 待你拍板
1. 同步引擎：托管省力（PowerSync）还是 OSS 自控（WatermelonDB / expo-sqlite 自写）？
2. LLM：先零成本（ERNIE-Speed/Qwen 免费）还是直接上 DeepSeek 主力？
3. ASR：火山 vs 讯飞，要不要我各写一个最小可跑 demo（你给 Key）做实测对比？
4. 备案/软著/微信企业资质：你来推进资质，我并行把功能做好——确认一下谁来办哪些。

> 价格请以官网复核：DeepSeek api-docs.deepseek.com/quick_start/pricing；阿里云百炼；火山引擎语音；讯飞开放平台；PowerSync pricing；Expo EAS pricing。
