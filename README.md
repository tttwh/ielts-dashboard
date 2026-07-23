# IELTS Prep Dashboard

> A local-first IELTS preparation dashboard for goal tracking, daily check-ins, study timers, progress history, and lightweight rewards.

## 项目介绍

IELTS Prep Dashboard 是一个本地优先的雅思备考监督与打卡看板，用来把目标分数、每日任务、四科学习时长、阅读限时训练、60 天打卡热力图和奖励机制集中到一个单页面中。它适合正在备考雅思、需要量化学习进度和保持连续打卡的人使用。

第一版不接入真实云同步，数据保存在浏览器本地 `LocalStorage`，但数据结构已经预留 `userId`、时间戳、同步状态等字段，后续可以继续扩展到 Supabase 或 Firebase。界面采用 IELTS 官方网站启发的黑、白、蓝、紫配色，并支持 `中 / Eng` 中英文切换。

## English Summary

IELTS Prep Dashboard is a single-page, local-first study dashboard for IELTS learners. It tracks target scores, daily study goals, per-section study time, reading timer sessions, 60-day progress history, and achievement rewards. The current version stores data in the browser, while keeping the data model ready for future cloud sync.

## 核心功能

- 目标设定看板：设置总分目标，以及 Listening、Speaking、Reading、Writing 四个小分目标。
- 每日任务打卡：记录单词量、口语话题数、听力套题数量和听力语料库学习时长。
- 四科学习时长统计：分别记录听、说、读、写学习时间，并汇总总学习时长。
- 阅读限时计时器：按 60 分钟考试标准计时，超时后继续计时并标记超出时间。
- 手动外部时长录入：支持把其他 App 或学习网站中的学习时长手动录入到对应科目。
- 60 天打卡热力图：展示最近 60 天学习完成度，颜色深浅代表当天完成比例。
- 奖励机制：通过 XP、等级、连续打卡和成就徽章增强学习反馈。
- 中英文切换：提供 `中 / Eng` 按钮，语言选择会在本地持久化。
- 本地持久化：目标、每日记录、计时记录、成就和语言设置刷新后不会丢失。

## 技术栈

- React
- TypeScript
- Vite
- Tailwind CSS
- Vitest
- React Testing Library
- Playwright
- LocalStorage

## 快速开始

先安装依赖：

```bash
npm install
```

Windows PowerShell：

```powershell
npm.cmd run dev
```

macOS / Linux：

```bash
npm run dev
```

默认本地地址：

```text
http://127.0.0.1:5173/
```

## 常用命令

| 场景 | Windows PowerShell | macOS / Linux |
| --- | --- | --- |
| 启动开发服务 | `npm.cmd run dev` | `npm run dev` |
| 生产构建 | `npm.cmd run build` | `npm run build` |
| 单元测试 | `npm.cmd run test` | `npm run test` |
| 监听测试 | `npm.cmd run test:watch` | `npm run test:watch` |
| E2E 测试 | `npm.cmd run test:e2e` | `npm run test:e2e` |
| 本地预览构建结果 | `npm.cmd run preview` | `npm run preview` |

如果 Playwright 浏览器依赖缺失，先执行：

```bash
npx playwright install chromium
```

## 数据存储说明

当前版本使用浏览器 `LocalStorage` 保存数据：

- 学习数据 key：`ielts-dashboard-state`
- 语言设置 key：`ielts-dashboard-language`

注意：清理浏览器站点数据、切换浏览器或切换设备都会导致本地数据不可见。当前版本不会自动读取其他 App 或学习网站的使用时间，外部学习时长需要手动录入。

## 项目结构

```text
src/
  components/          页面组件和通用 UI
  components/checkin/  每日打卡模块
  components/history/  60 天热力图
  components/language/ 中英文切换
  components/rewards/  奖励和成就
  components/summary/  顶部汇总
  components/targets/  目标设定
  components/timer/    学习计时器
  domain/              纯业务逻辑、类型和默认值
  hooks/               状态管理和计时 Hook
  i18n/                本地多语言文案
  lib/                 日期与格式化工具
  services/storage/    本地存储与仓储接口
tests/e2e/             Playwright 端到端测试
docs/                  需求、设计和实现计划文档
```

## 当前状态

已完成第一版本地可用能力：

- 单页面 Dashboard
- 目标分数和每日目标编辑
- 每日打卡记录
- 四科计时和手动时长录入
- 阅读标准时间与超时标记
- 60 天热力图
- XP、等级和成就奖励
- 中英文切换
- LocalStorage 持久化
- 桌面端和移动端 E2E 检查

## 后续路线图

- 接入 Supabase 或 Firebase，实现登录和真实云同步。
- 增加数据导出，例如 CSV 或 JSON。
- 增加更细的趋势分析，例如四科时间占比、连续弱项提醒和周报视图。
- 增加部署配置，例如 GitHub Pages、Vercel 或 Netlify。
- 增加数据备份和恢复入口，降低本地数据丢失风险。

## 免责声明

本项目是个人学习和备考辅助工具，不是 IELTS 官方产品，也不代表 IELTS、British Council、IDP 或 Cambridge English 的官方立场。
