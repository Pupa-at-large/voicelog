# 语迹 VoiceLog

> 对着它说话，就能管日程；每天帮你复盘时间花在哪、怎么更高效；所有复盘可导出成 Markdown / TXT / Word，喂给任何大模型继续聊。

一个**本地优先**的语音日程 + 复盘工具。数据全部存在你自己机器上，核心功能离线即可运行，不依赖任何云服务。

---

## 它能做什么

- **说一句话建日程**：「明天下午三点跟老王开会，提前半小时提醒我」→ 自动解析出标题、时间、地点、提醒。支持自然口语（明天 / 下周三 / 下午三点半 / 提前一小时）。
- **增删改 + 定时提醒**：标记完成 / 取消，浏览器内到点提醒（含系统通知）。
- **每个日程加备注**。
- **复盘**：日 / 周 / 月 / 季 / 年五种周期。不是流水账——它会算出你的**时间去向**（按类别分配、可视化条形图）、完成率，并给出**具体可执行的改进建议**（例如「会议扎堆在下午，把需要专注的事挪到空时段」）。
- **导出**：把复盘导成 Markdown / TXT / Word，结构化清晰，方便直接粘给别的 AI 做更深入的反思对话。

---

## 快速开始

需要 Python 3.10+。

```bash
cd voicelog
pip install -r requirements.txt
python run.py
```

然后浏览器打开 **http://127.0.0.1:5005**。

数据库文件 `voicelog.db` 和导出文件夹 `exports/` 会自动建在项目目录下。

### 命令行用法（可选）

```bash
python run.py add "明天下午三点开会，提前半小时提醒"   # 终端快速建程
python run.py review weekly                          # 打印本周复盘
python run.py test                                   # 跑测试
python run.py --port 8080                             # 换端口
```

---

## 语音输入

- **浏览器内置识别**：Chrome / Edge 支持 Web Speech API，点麦克风即可说话（中文）。无需任何配置。
- **接专业 STT**：若要更准的离线/云端识别（如 Whisper），在 `voicelog/parser.py` 的接口层接入即可，前端逻辑不变。

---

## 接入真正的 AI（可选，让解析和复盘更强）

默认用**离线规则引擎**解析日程、用**本地分析**生成复盘——无需联网、无需任何 key，开箱即用。

如果你想要更强的口语理解和更有洞察的复盘，配置一个 API Key 即可自动切换：

```bash
export VOICELOG_LLM_KEY="你的-anthropic-key"
export VOICELOG_LLM_MODEL="claude-sonnet-4-6"   # 可选
pip install anthropic
python run.py
```

设置后：
- 日程解析会优先走 LLM，失败自动回退到规则引擎（永不崩）。
- 复盘会在数据指标基础上叠加一段「教练复盘」。

页头的状态点会从 **规则解析**（琥珀色）变成 **AI 解析**（绿色）。

---

## 架构

```
voicelog/
├── run.py                  启动器 / CLI
├── requirements.txt
├── voicelog/
│   ├── parser.py           文字 → 结构化日程（LLM 接口 + 离线规则引擎）
│   ├── store.py            SQLite 存储 + Markdown 镜像
│   ├── review.py           时间分析 + 复盘生成（LLM 接口 + 离线分析）
│   ├── export.py           周期范围计算 + TXT/MD/Word 导出
│   ├── app.py              Flask：REST API + 托管前端
│   └── templates/index.html  单文件前端
└── tests/test_all.py       测试套件（49 项，无需联网）
```

**设计原则**：

- **本地优先**：SQLite 是程序的事实来源；同时镜像一份 `voicelog_schedule.md` 纯文本，不开 App 也能直接读、直接喂给别的 LLM。
- **接口隔离**：所有需要联网的能力（STT、LLM）都封在接口层，缺省有可立即运行的离线实现。没网、没 key 也能完整使用核心功能。
- **永不崩**：LLM 任何失败都自动回退规则引擎。

---

## REST API 速览

| 方法 | 路径 | 作用 |
|------|------|------|
| POST | `/api/parse` | 解析文字为日程（预览，不保存）|
| GET/POST | `/api/events` | 列出 / 新建日程 |
| PATCH/DELETE | `/api/events/<id>` | 更新 / 删除 |
| GET | `/api/reminders/due` | 取即将到点的提醒（前端轮询）|
| POST | `/api/review` | 生成某周期复盘 |
| POST | `/api/export` | 导出 md/txt/docx |

---

## 已知边界

- 规则引擎覆盖了常见中文口语，但极复杂的句子（多个时间、相对模糊表达）建议配 LLM。解析结果在「加入日程」前**始终可手动编辑**，所以解析错了也能一键改对。
- 提醒依赖浏览器开着页面轮询；要做系统级后台提醒，需进一步包成桌面 App（Tauri/Electron）或对接系统日历。

---

## 测试

```bash
python run.py test
```

覆盖：中文数字、相对日期、周几、时段、提醒解析、地点剥离、存储 CRUD、复盘指标、周期范围、三种导出格式。
