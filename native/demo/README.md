# native/demo · 千问解析探针

`qwen-parse.mjs` —— 把 VoiceLog 的「一句话 → 结构化待执行清单」从离线规则引擎
（`project/app/parser.js`）切换到 **通义千问(Qwen)** 跑通的一条产线探针。
PRD 明确：部署时规则解析换成 LLM —— 这就是那条路的最小可运行验证。

## 跑

```bash
# 真·联网调用千问（需要可用的百炼 API Key）
DASHSCOPE_API_KEY=sk-xxx node native/demo/qwen-parse.mjs "明天下午三点开产品评审，很重要"

# 不带句子 → 用内置多意图示例
DASHSCOPE_API_KEY=sk-xxx node native/demo/qwen-parse.mjs

# 离线 mock：不联网，用代表性模型输出走真实渲染路径（演示「JSON→清单」段）
node native/demo/qwen-parse.mjs --mock
```

## 环境变量

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `DASHSCOPE_API_KEY` | 是 | — | 阿里云百炼(DashScope) API Key |
| `QWEN_MODEL` | 否 | `qwen3.7-plus` | 想快用 `qwen3.6-flash-2026-04-16`，想最强用 `qwen3.7-max-2026-06-08` |
| `DASHSCOPE_BASE` | 否 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | OpenAI 兼容端点 |

## 设计要点

- 领域约定喂进 system prompt：今天=06-16(周一)、本周日期键、五类 `cat`、
  `important×urgent` 四象限、新增/完成多意图——与 `project/app` 完全对齐。
- 一条 few-shot 示例稳定输出格式；`response_format: json_object` 强制 JSON。
- 模型只吐 `MM-DD` 日期键，中文日期 / emoji / 象限提示由脚本统一渲染，避免口径漂移。

## 模型选择 & 一个坑

百炼的**老别名**（`qwen-plus` / `qwen-turbo` / `qwen-max` / `qwen3-max` 等）现已
**无免费额度**，直接调会报 `AllocationQuota.FreeTierOnly`。有免费额度的是**新一代**
模型代码：`qwen3.7-plus`、`qwen3.7-max-2026-06-08`、`qwen3.6-flash-2026-04-16`、
`deepseek-v4-flash`、`glm-5.1` 等（控制台「免费额度」页可查每个模型代码与余量）。
脚本默认已用 `qwen3.7-plus`；若仍遇到 `FreeTierOnly`，脚本会打印修复提示。

速度参考（含隐藏的 reasoning tokens）：`qwen3.6-flash` ≈ 6–7s，`qwen3.7-plus`/`max`
≈ 24–27s。语音场景追求即时反馈时优先 flash。

> 注：国际站端点 `dashscope-intl.aliyuncs.com` 在本远程环境的网络出口白名单之外，
> 仅国内站 `dashscope.aliyuncs.com` 可达。

---

# native/demo · 豆包语音转文字探针

`doubao-asr.mjs` —— 把"点麦克风说话 → 文字"从浏览器自带的 Web Speech API
（设计版 `screens-home.jsx` 的「浏览器语音识别」）切到 **豆包语音（火山引擎）**
免费额度跑通的一条产线探针。先做最简单的一段：**HTTP 录音文件识别标准版**
（提交任务 → 轮询查询 → 拿到文字），用来验证 AppID/Token 与免费额度可用。

> 火山的"一句话/流式识别"是 WebSocket 二进制帧协议（给麦克风边说边出字用），
> 更重；本探针先用 HTTP 录音文件接口验证"音频→文字"，实时流式留作接麦克风按钮的下一步。

## 跑

```bash
# 真·联网识别（需要火山「豆包语音」的 AppID/Token + 一个公网可下载的音频 URL）
DOUBAO_APP_ID=xxx DOUBAO_ACCESS_TOKEN=xxx \
  node native/demo/doubao-asr.mjs https://your.cdn/sample.mp3

# 离线 mock：不联网，用代表性返回走真实渲染（演示「ASR JSON → 文字」段）
node native/demo/doubao-asr.mjs --mock
```

## 环境变量

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `DOUBAO_APP_ID` | 是 | — | 火山控制台「豆包语音」应用的 AppID |
| `DOUBAO_ACCESS_TOKEN` | 是 | — | 对应的 Access Token |
| `DOUBAO_ASR_RESOURCE_ID` | 否 | `volc.bigasr.auc` | 录音文件识别标准版；极速版 `volc.bigasr.auc_turbo`，新 seed 模型 `volc.seedasr.auc`——**以控制台开通/「模型列表」页为准** |
| `DOUBAO_AUDIO_FORMAT` | 否 | `mp3` | 要和音频实际格式一致（wav/pcm/ogg/m4a…） |
| `DOUBAO_AUDIO_URL` | 否 | — | 音频公网地址（也可作第一个命令行参数传） |
| `DOUBAO_BASE` | 否 | `https://openspeech.bytedance.com` | 服务端点 |

## 协议要点（从火山官方文档核实）

- 提交：`POST /api/v3/auc/bigmodel/submit`；查询：`POST /api/v3/auc/bigmodel/query`。
- 鉴权走**请求头**（不是 Bearer）：`X-Api-App-Key`(=AppID)、`X-Api-Access-Key`(=Token)、
  `X-Api-Resource-Id`、`X-Api-Request-Id`(=任务 id，提交/查询用同一个关联)、`X-Api-Sequence: -1`。
- 结果状态看**响应头** `X-Api-Status-Code`：`20000000` 成功、`20000001` 处理中、`20000002` 排队中。
- 请求体 JSON：`{ user, audio:{format,url}, request:{model_name:"bigmodel", enable_itn, enable_punc} }`。

> 注：豆包语音正文文档页对自动抓取返回 403，以上端点/字段来自官方文档片段核实；
> Resource-Id 与免费额度模型代码请以你控制台实际开通的为准。
