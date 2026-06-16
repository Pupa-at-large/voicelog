# 语迹 VoiceLog · 原生 App（Expo / React Native）

从网页设计原型走向**可上架 iOS/安卓**的真 App。这是工程骨架（M2 垂直切片），
不破坏仓库里的网页原型（`/VoiceLog.html`、`/project`）。

## 现在能跑什么（M2）
- 日程主页：主题切换（云/暖/夜）、周条选日、当天清单、一键完成、超容量提醒、**建议式改期（换个时间）**。
- 配色从原型 `tokens.js` 的 OKLCH **在加载时转成 hex** 移植（`src/theme/color.ts`，纯函数已抽出可测）。
- 数据走**统一 Store**（`src/data/store.ts`，AsyncStorage），对齐 `docs/handoff/sync-and-identity-design.md` 的存储抽象；将来可换 SQLite + 同步引擎而不动 UI。

## 怎么运行（自用预览，最快）
```bash
cd native
npm install
npx expo start         # 手机装 Expo Go，扫码即可在真机运行
# 或 npm run ios / npm run android（需模拟器）
```
> 说明：本环境没有手机/模拟器，**未做真机运行验证**；已通过 `npx tsc --noEmit` 类型检查，OKLCH→hex 转换已用已知色值核对。

## 目录
```
App.tsx                # 主页（M2）
src/theme/color.ts     # OKLCH→hex 纯函数
src/theme/themes.ts    # 云/暖/夜 三主题（移植自 tokens.js）
src/data/model.ts      # 数据模型 + 种子 + overlaps/dayLoad/suggestSlots（移植自 data.js）
src/data/store.ts      # 统一存储层（AsyncStorage，将来换同步引擎）
```

## 下一步（见 docs/PROGRESS.md 的 App 化路线）
- M3 核心功能迁移（CRUD、复盘、成长、四象限）+ 本地 SQLite。
- M4 录音 → 云 ASR → LLM 解析 → 待执行清单确认（接 Key）。
- M5 手机号/微信登录 + 多端同步。
- M6 EAS Build 出包 + 上架（需开发者账号 + 备案/软著）。

技术选型与成本见 `docs/handoff/tech-selection-research.md`。
