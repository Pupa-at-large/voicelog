# 最小 AI 解析 Demo（通义千问）

演示语迹的核心：**一句口语 → AI 解析成「待执行清单」→ 你确认后执行**。
用阿里云百炼 **DashScope** 的 OpenAI 兼容接口，一个 API key 即可（同一个 key 以后也能用阿里自家 ASR）。

## 跑起来（电脑上，30 秒）
```bash
# 1) 装了 Node 即可，无需别的依赖（用内置 fetch）
# 2) 用你的 key 跑：
DASHSCOPE_API_KEY=sk-你的key node native/demo/qwen-parse.mjs "嗯，明天下午三点跟老王开会，提前半小时提醒，在公司"

# 不传句子用内置多意图示例：
DASHSCOPE_API_KEY=sk-你的key node native/demo/qwen-parse.mjs
```
- 默认用 `qwen-flash`（最便宜）；要更强：`QWEN_MODEL=qwen-plus`。
- key 在哪拿：阿里云百炼（bailian.aliyun.com）控制台 → API-KEY。

## 它证明了什么
- AI **听懂口语**（清理"嗯/那个"等口头语）、**拆多条意图**、换算"明天/后天"为具体日期；
- 输出**结构化日程**（标题/日期/时间/时长/分类/地点/提醒/重要·紧急）；
- 渲染成**待执行清单**——对应 App 里"确认后才执行、绝不自动操作"的设计。

## 为什么是脚本不是网页链接
浏览器直接调大模型会被 CORS 拦（API 出于安全不允许网页跨站直连）。
要做成"打开链接就能用"，需要一个极小的后端代理藏 key——那是下一步（productionizing）。
这个脚本走 Node，没有 CORS 限制，能立刻用真实 key 验证效果。
