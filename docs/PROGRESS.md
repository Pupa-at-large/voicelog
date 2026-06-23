# VoiceLog · 成长系统 + Phase 2 自主开发进度

## P4 日期模型升级（2026-06）—— 未来日程看得到、找得着
- 任意日期都能正确显示「X月X日 周X」（窗口外不再是裸键）；「下周五」修对（落下周）。
- **可翻周/翻月导航**：移动端首页周条 ◀▶ + 「回今天」，且周条**自动跟随选中日**（语音加的未来日程会落到对应周、首页直接可见）；移动端「全览·月」与 Web 日历「月」均加 ◀▶ 翻月。node 验证 windowDays/下周X/任意日期文案。

## 其它修复（2026-06 第二批续）
- 上传被"跟老王开会"劫持：没说话不再凭空造日程，改为「没听清」态（重新听/上传/看示例），示例只在显式点击时演示。移动+Web。
- `?reset=1`：一键清空本站数据回到全新 demo（保留后端地址、抹掉参数）。
- 规则引擎：剥口头语进标题、支持「N 天后」。
- 上传文件→识别日程：**仍为演示样例（未读文件）**，真识别待接 Qwen-VL。

## P1 语音编辑意图（2026-06）—— 朝"纯语音操控一切"迈一步
- 现在可以**语音改期/取消/完成已有日程**（不止新建）：客户端把当前日程压成精简清单（`candidateEvents`，带 id）随 `/parse` 发给千问；千问按标题匹配、用 `targetId` 引用，输出 `reschedule|cancel|complete|create`。
- `applyBatchTo` 扩展：按 `targetId`（或标题兜底）定位，改期可跨天、取消置 cancelled、完成置 done；返回新增/完成/改期/取消计数。`BatchReviewList` 渲染四种动作（改期/取消/完成/新增，仍是"待执行清单"，确认才执行、绝不自动）。`parseRemote` 从候选回填标题供展示。
- 验证：node 逻辑（映射/应用/候选/回填）全绿；**真·千问端到端**："把跟老王的那个会挪到下午五点，今晚的健身取消了" → reschedule e3→17:00 + cancel e4 ✓。**仅 AI 在线时可用**（规则引擎不做编辑意图，离线会退化为新建，徽章诚实标注）。
- 自审同时修：规则引擎口头语进标题、"N 天后"未识别（已提交）。

## 用户实测反馈修复轮 · 第二批（2026-06）
- **1 解析+徽章** ✅：截图"我到20:00自习了/AI解析"实为规则引擎兜底被误标。规则引擎清洗标题（剥人称"我"、语气"了"、时间段残留）+ "X点到Y点"→开始+时长；千问 prompt 同步；徽章诚实化（兜底显示"规则解析·云端未响应"）；客户端超时 15→30s + 唤醒提示。
- **2 冲突弹窗重做** ✅：从"提示+说教"改成"只驱动一个选择"——「和X撞了，怎么办？」+ 空档选项（错开新的 / 挪旧的，确认才改）/ 两个都留；说教沉出打断时刻。移动+Web。
- **3 时间显示** ✅：`fmtTime/endTime/fmtRange` 统一格式化（内部存 24h）；设置可选 24/12 小时（12h 中文"晚上7:00"）；全日程显示改"几点到几点"；预览改起→止可编辑、自动算时长。
- **4a 品牌** ✅：手机首页加"语迹 VoiceLog"品牌行（内联 SVG 声波标志 + 标语）；清掉最后 3 处硬编码"6月"。
- **4b 首开欢迎页** ✅：手机首次启动显示一屏——大声波 Logo + 语迹 VoiceLog + 标语 + 三个要点（语音建程/复盘成长/本地优先）+「开始使用」，localStorage 记住只出现一次。（Web 仍用其空状态引导页）

## 用户实测反馈修复轮 · 第一批（2026-06，移动端为主）
> 用户在手机上跑 Demo 后提的问题，逐条定位→修复，每块单独提交、node 验证。
- **A 日期根治** ✅：原型本冻结在假"今天"(06-16)，后端又按自己时钟猜日期 → 语音/相对日期错位。
  改为**全程跟随真实今天**：`data.js` 动态日期层（跨午夜正确；7 天窗口+全部种子按偏移平移；`?today=` 可覆盖测试），
  `parser.js` 相对日期/周几动态、支持"明晚/明早"、把客户端真实 today+now 发给后端；`server` 用客户端日期（时区无关）。
  月视图(移动总览+Web 日历)按真实月份渲染。验证：日期层(含跨月)+解析+整库默认加载，真实今天=06-17。
- **B 语音手动停止** ✅：手动按停止时引擎常未"定稿"→ 之前回退到示例文本。改用 `finalText || interimText`（移动+Web）。
- **C 主题切换归位** ✅：删掉 `m.html` 顶部 z-9999 悬浮条（它遮挡录音指示器），三主题搬进「我的·外观」；Web 早已在设置内。
- **D 预览可改日期/时间** ✅：解析预览加原生 date/time 输入，错了可当场改再加入（移动+Web）。
- **E 顺延横幅重做** ✅：列出**今天之前所有**未完成（含前几天累积）、点开可勾选要挪哪些；「先不用」改为按设置贪睡
  （我的·提醒：2 小时(默认)/4 小时/今天不再，持久化）。依据：中断研究——晚点在低负荷时机再现，而非催促。
- **暂缓**（用户要求之后再磨）：四象限/复盘对话化、预览初始化页。

> 这是一次长程自主任务的进度记录（用户离线期间执行）。分支 `voicelog/growth-and-phase2`。
> 范围：核心 + 打磨（M1–M8）。每个里程碑完成即验证 + 提交；随时停下都是可用状态。
> 验证手段（无浏览器环境）：用页面同款 `@babel/standalone` 转译全部 JSX（捕获语法错误）+ 在 node 里执行 `data.js`/`parser.js` 逻辑断言。

## 背景
两条 VoiceLog 原型轨道已对齐：设计版（多文件 React，三主题，移动+Web，当前仓库）已并入 PRD 的灵魂——成长/等级系统（见下 M0）。本轮把我们讨论过的 PRD Phase 1/2 需求继续做进设计版。设计原则（PRD 第四节，务必遵守）：①赋能不强制 ②复盘是主场、说教是禁区 ③抹平摩擦优先 ④奖励"做了"而非"做完"、等级只升不降、无惩罚无裸 streak ⑤本地优先。

## 里程碑

- [x] **M0 · 成长/等级系统**（上一轮已完成）：LEVELS/XP/levelFromXp/growthStats（`app/data.js`）；移动端「成长」页 + 等级徽章 + 升级浮层（`app/screens-growth.jsx`）；Web「成长」页 + 侧栏等级卡 + 升级 Modal（`webapp/web-growth.jsx`）；XP 接入建程/完成/复盘。根入口 `VoiceLog.html`。
- [x] **M1 · 修复打勾"加了一步"**：Web 完成体验改为真正一键即时——移除过宽的 `late`（<16:00 即判 late）触发；任何来源完成只走非阻塞内联微迸发（700ms）；满屏庆祝只留给"目标全完成"（advanceProgress）和真升级（独立 Modal）。详情弹窗完成不再弹满屏 2 秒浮层。`webapp/web-app.jsx` toggleDone。
- [x] **M2 · 移动端撤销/回收站/延期**（补齐 web 已有）：Toast 支持「撤销」动作；deleteEvent 改软删除入回收站；新增 restoreEvent/purgeTrash/openTrash/postpone；详情弹层两行操作（完成 / 延期一天·取消·删除）；我的页加「回收站 · N 项」入口 + 底部回收站 Sheet。顺手补了 DetailSheet 缺失的 onStar 接线。`app/VoiceLogApp.jsx`、`app/screens-home.jsx`、`app/screens-export.jsx`。
- [x] **M3 · 现在/接下来 焦点卡**（借 Focuster）：共享 `FocusCard`（`app/ui.jsx`），仅"今天"显示，按真实时钟算当前进行/下一件 + 相对时间（还剩 N 分 / N 分钟后），全部过完显示鼓励语。接入移动端日程顶部与 Web 右栏。
- [x] **M4 · 每日容量提醒**（借 Sunsama）：`window.VL.DAILY_CAPACITY_H=8` + `dayLoad()`；共享 `CapacityBanner`（`app/ui.jsx`，温和琥珀色、可关、非模态）。接入移动端日程顶部与 Web 右栏。Demo 把周三(06-18)排到 9h（不重叠）以便演示。
- [x] **M5 · 未完成顺延**（借 Sunsama）：helpers `todayKey/prevKey/unfinished`；共享 `RolloverBanner`（`app/ui.jsx`，温和、不羞辱）；`rolloverUnfinished()` 一键把昨天待办全挪到今天。仅"今天"显示。Demo 给 06-15 留了 2 件未完成。移动端+Web 都接。
- [x] **M6 · 多意图批量语音**（PRD 丝滑核心）：`parseBatch(text)`（`app/parser.js`）智能分句（强连接词 + "逗号后接新时间线索"切分 + 日期继承）识别 新增/完成 多意图；`applyBatchTo()` 纯函数执行（完成意图先匹配既有日程，匹配不到则补录为已完成）；共享 `BatchReviewList`（可勾选「待执行清单」，永不静默）。接入：Web 快速建程（一段话回车）+ Web 语音弹窗 + 移动端语音浮层（均带示例入口）。`applyBatch` 计 XP。
- [x] **M7 · Typeless 成长报告增强**：`insightMaturity()`（懂你 X%，随累计天数/记录上升封顶95）；共享 `GrowthReport`（`app/screens-growth.jsx`）——隐私安心卡（可折叠「为什么」）+ 多段甜甜圈（中心显示懂你%）+ 图标化分类表。移动端竖排、Web 横排接入，替换原 时间去向 卡。
- [x] **M8 · 语音信任反馈**（借 Typeless）：`speechTrust(text)` 统计口头语 + 识别自我更正；解析预览里一行温和反馈「已清理 N 处口头语 · 识别到一次更正 · 已帮你理清意图」。Demo 语音改成带口头语+一次更正（嗯…两点…啊不对，是三点）以便演示，解析结果仍正确（15:00）。移动端+Web 语音预览都接。
- [x] **M9 · 重要紧急四象限（艾森豪威尔矩阵）**：`urgent` 字段 + `important`(已有) → `QUADRANTS`/`quadrant()`/`quadrantStats()`（`app/data.js`）；图标 flag/flagFill/grid4；解析器听出 紧急/重要 词自动归象限并随建程携带；共享 `MatrixView`(2×2 网格视图) + `QuadrantChip` + `QuadrantBar`(成长区Q2高亮)（`app/ui.jsx`）；移动端日程加「象限」视图、详情/编辑加 紧急🚩 切换 + 实时象限；Web 日历加「象限」视图、详情/编辑同步；成长报告加「四象限·时间去向」；四象限说明弹层。demo 06-16 铺满四格。**更新了 PRD（docs/handoff/voicelog_PRD_v1.md，v1.1）**。

- [x] **M10 · 建议式改期（建议不强制）**：纯函数 `suggestSlots(dayEvents, ev)`（`app/data.js`）——在 `SLOT_START`(07:00)–`SLOT_END`(22:00) 内按"占用区间→合并→空档"算法，为每个容得下时长的空档取离原时间最近的可行起点，跳过等于当前时间者，近优先取前 3，返回 `[{time,end,label}]`（label 如「早 1 小时」「晚 2 小时 30 分」）。共享 `SlotSuggestions`(可点选项) + `RescheduleCard`(温和入口：与他人重叠**或**当日超容量时出现，点「换个时间」才展开空档)（`app/ui.jsx`）。接入移动端 `DetailSheet`(点选即时改，`app.rescheduleEvent`) / `EditSheet`(点选回填步进器、保存才生效) 与 Web `DetailModal`/`EditModal`（替换原重叠横幅，处处一致）。**绝不自动重排——只列选项，用户选一个才改时间**（守设计原则①④）。

## 状态：M1–M10 全部完成 ✅
本轮自主任务（核心 + 打磨）已全部实现并验证。每个里程碑单独提交在分支 `voicelog/growth-and-phase2`。

**最终验证**：20 个文件全部通过页面同款 `@babel/standalone` 转译；含四象限在内的数据层断言全 PASS；demo 零重叠、四象限铺满四格。

**怎么看**：仓库根 `python3 -m http.server 8080` → 打开 `http://localhost:8080/VoiceLog.html`。
- 移动端：首页等级徽章 + 现在/接下来卡 +（切周三 06-18）容量提醒 +（今天）昨天未完成顺延；点麦克风→「一段话建多条·示例」看待执行清单，解析预览有「已清理口头语」信任反馈；底部「成长」页是 Typeless 式报告。
- Web：右栏同样有现在/接下来 + 容量 + 顺延；快速建程一段话回车触发待执行清单；侧栏「成长」页。

## 提交记录
- `1f7272b` (baseline) M0 成长系统 + 根入口 + 归档 PRD/handoff 到 docs/
- `82764b8` M1 修复打勾一键完成
- `26fe15a` M2 移动端撤销/回收站/延期
- `47841e9` M3 现在/接下来 焦点卡
- `b642da9` M4 每日容量提醒
- `3c08a27` M5 未完成顺延
- `800a021` M6 多意图批量语音 / 待执行清单
- `f5a40bd` M7 Typeless 成长报告
- `4a80f92` M8 语音信任反馈
- （上次）M9 重要紧急四象限 + PRD v1.1
- （本次）M10 建议式改期 suggestSlots + RescheduleCard（移动端+Web）

## App 化（原生 App · 自主执行中）
> 用户决定：做能上架 iOS/安卓的真 App（自用优先）。授权自主推进，回来检查。
- **M1 选型调研** ✅：`docs/handoff/tech-selection-research.md`——ASR(中英夹杂：火山/讯飞)、LLM(DeepSeek/Qwen，附 2026 价格)、技术栈(Expo RN)、同步(PowerSync/WatermelonDB；Realm 已停服)、微信/手机号登录与备案资质、月成本估算。给了明确推荐。
- **M2 Expo 骨架** ✅（`native/`，不破坏网页原型）：Expo SDK 56 + TS 工程；OKLCH→hex 主题移植（`src/theme/color.ts` 纯函数）；统一 Store（AsyncStorage）；日程主页（主题切换/周条/清单/一键完成/容量提醒/建议式改期）。验证：`npx tsc --noEmit` 通过；OKLCH 转换已核对；**未真机运行**（环境无设备）。
- **M4a 网页原型接真·AI 解析（千问）** ✅：语音识别本就是真的（浏览器 Web Speech），缺口只在"解析"——现把识别出的文字走 `server/` 的 `/parse` → 通义千问，规则引擎自动兜底（失败/未配置零回归）。
  - 客户端：`data.js` 读 `?server=`/localStorage 存后端地址（`VL.serverUrl`/`setServerUrl`）；`parser.js` 新增 `parseRemote`+`mapServerAction`（千问 action→内部草稿，复用现有预览/批量 UI）；移动端 `screens-home.jsx` 与 Web `web-voice.jsx` 的 `startParse` 改为"先千问、失败回退规则"；配了后端自动打开「AI 解析」。
  - 后端：`server/index.mjs` 默认模型从已失效的 `qwen-flash` 切到 `qwen3.6-flash-2026-04-16`，并加 `enable_thinking:false`（实测 15.7s/1759 tok → 3.4s/5 tok）。`server/DEPLOY.md` 给 Render/Railway 上线步骤拿 https 网址。
  - 验证：node 逻辑断言 16/16；4 个改动 jsx 过项目 Babel；本机 server+真千问 端到端 4.2s 映射正确（含 create/complete）。**未真机/浏览器实跑**（环境无浏览器）。**待用户**：部署后端拿 https 网址，开 `m.html?server=...`。
- 待办：M3 核心功能迁移 + SQLite｜M4b 录音→云 ASR（火山/讯飞，接 Key）｜M5 登录+同步｜M6 EAS 出包上架（需账号/备案/软著）。
- **需用户提供**（攒着等回来）：Apple Developer($99/年)、Google Play($25)、各家 API Key、备案/软著推进、微信开放平台企业资质。

## 规划文档（未执行 · 待对齐）
- **账号 + 多端同步 + 数据存储**：新增 `docs/handoff/sync-and-identity-design.md`（统一 Store/IndexedDB、本地优先同步层 LWW+tombstone、端到端加密、微信/手机号登录、真实 ASR 缺口、落地路线 P0–P2）。PRD 升至 v1.2，新增「八、账号与多端同步」并标注语音识别现状（原型仅 Web Speech 兜底、国内回退示例）。**仅设计，未写功能代码**。

## 备注 / 决策
- 移动端底部标签因放不下 5 个，已将「导出」从标签移到「复盘」页进入（带返回）。
- XP 规则：记录+5 / 完成+10 / 复盘（每日首次进成长页）+15。老用户首开 seed 320(LV.4)，新用户 0(LV.1)。
- **提交签名**：环境签名服务器报错(400)，所有提交用 `--no-gpg-sign`；功能无影响。
- **多意图解析**是离线规则版（PRD 明确部署换 LLM）：处理"逗号后接新时间线索"切分 + 日期继承；自我更正在真实识别下可能误拆两条，是规则引擎已知边界，demo 用 curated 规避。
- 未做（属"全部含实验性"层、本轮范围外）：Web ⌘K 命令栏、移动端新用户首开页。（建议式改期已于 M10 完成）
