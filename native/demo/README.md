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
| `QWEN_MODEL` | 否 | `qwen-plus` | 可换 `qwen-turbo` / `qwen-max` / `qwen3-max` … |
| `DASHSCOPE_BASE` | 否 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | OpenAI 兼容端点 |

## 设计要点

- 领域约定喂进 system prompt：今天=06-16(周一)、本周日期键、五类 `cat`、
  `important×urgent` 四象限、新增/完成多意图——与 `project/app` 完全对齐。
- 一条 few-shot 示例稳定输出格式；`response_format: json_object` 强制 JSON。
- 模型只吐 `MM-DD` 日期键，中文日期 / emoji / 象限提示由脚本统一渲染，避免口径漂移。

## 已知前置：账号额度

若报 `AllocationQuota.FreeTierOnly`（free tier exhausted），是**账号计费**问题、
非脚本问题：该 Key 处于「仅免费额度」模式且免费额度已用尽。到百炼控制台关闭
「仅免费额度」/ 开通按量付费即可直接跑通；脚本会识别此错误并打印修复提示。

> 注：国际站端点 `dashscope-intl.aliyuncs.com` 在本远程环境的网络出口白名单之外，
> 仅国内站 `dashscope.aliyuncs.com` 可达。
