<div align="center">
  <h1>IELTS Prep Dashboard</h1>
  <p><strong>A local-first IELTS study dashboard with optional CloudBase PG sync and account login.</strong></p>
  <p>
    <a href="#核心功能">Features</a> ·
    <a href="#快速开始">Getting Started</a> ·
    <a href="#cloudbase-pg-配置">CloudBase PG</a> ·
    <a href="#验证命令">Verification</a> ·
    <a href="#english-summary">English</a>
  </p>
  <p>
    <img alt="platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-111827?style=flat-square">
    <img alt="React" src="https://img.shields.io/badge/UI-React-2563EB?logo=react&logoColor=white&style=flat-square">
    <img alt="TypeScript" src="https://img.shields.io/badge/code-TypeScript-3178C6?logo=typescript&logoColor=white&style=flat-square">
    <img alt="Vite" src="https://img.shields.io/badge/build-Vite-646CFF?logo=vite&logoColor=white&style=flat-square">
    <img alt="storage" src="https://img.shields.io/badge/storage-LocalStorage%20%2B%20CloudBase%20PG-6D28D9?style=flat-square">
    <img alt="tests" src="https://img.shields.io/badge/tests-Vitest%20%2B%20Playwright-16A34A?style=flat-square">
  </p>
</div>

---

## 项目介绍

IELTS Prep Dashboard 是一个本地优先的雅思备考监督与打卡看板，用来把目标分数、每日任务、四科学习时长、阅读限时训练、60 天打卡热力图和奖励机制集中到一个单页面中。

应用默认先写入浏览器 `LocalStorage`，所以访客模式、断网状态和 CloudBase 未配置状态都可以继续使用。配置 CloudBase PG 后，用户可以通过邮箱验证码注册、邮箱或用户名加密码登录，并把目标、每日记录、计时记录和成就同步到云端。

选择 Tencent Cloud CloudBase PG 的原因是当前阶段需要人民币付款能力。CloudBase 提供 RMB 计价、Web SDK 认证、PostgreSQL 数据存储和 RLS 风格的数据隔离，适合作为第一阶段登录与云同步后端。

## English Summary

IELTS Prep Dashboard is a local-first single-page study dashboard for IELTS learners. It tracks target scores, daily check-ins, section study time, timer sessions, progress history, and achievements. When CloudBase PG is configured, users can register with email verification, sign in with email or username plus password, and sync their own data across sessions.

## 核心功能

- 目标设定看板：设置总分目标，以及 Listening、Speaking、Reading、Writing 四个小分目标。
- 每日任务打卡：记录单词量、口语话题数、听力套题数量和语料库学习时长。
- 四科学习时长统计：分别记录听、说、读、写学习时间，并汇总总学习时长。
- 阅读限时计时器：按 60 分钟考试标准计时，超时后继续计时并标记超出时间。
- 手动外部时长录入：支持把其他 App 或学习网站中的学习时长手动录入到对应科目。
- 60 天打卡热力图：展示最近 60 天学习完成度，颜色深浅代表当天完成比例。
- 奖励机制：通过 XP、等级、连续打卡和成就徽章增强学习反馈。
- 中英文切换：提供 `中 / Eng` 按钮，语言选择会在本地持久化。
- 访客模式：未登录也能完整使用看板，数据保存在当前浏览器。
- CloudBase 同步：登录后以本地优先方式同步学习数据。

## 技术栈

- React
- TypeScript
- Vite
- Tailwind CSS
- Vitest
- React Testing Library
- Playwright
- LocalStorage
- Tencent Cloud CloudBase PG

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

## CloudBase PG 配置

CloudBase 必须使用 PG mode，不使用传统文档数据库模式。控制台配置要点：

1. 创建 CloudBase 环境，并选择 PostgreSQL / PG mode。
2. 在认证配置中启用邮箱验证码注册。
3. 启用用户名/密码登录；注册阶段仍以邮箱验证码为主，用户名作为可选账号名。
4. 为 Web SDK 生成 Publishable Key。
5. 把本地开发地址和部署地址加入安全来源，例如 `http://127.0.0.1:5173`。
6. 区域默认使用 `ap-shanghai`，除非实际环境另有要求。
7. 在 CloudBase PG SQL 控制台执行 `cloudbase/sql/cloud-sync-auth.sql`，创建表、索引和 RLS 策略。

只允许前端读取这些 Vite 变量：

```dotenv
VITE_CLOUDBASE_ENV_ID=demo-cloudbase-env
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CLOUDBASE_ACCESS_KEY=demo-public-web-access-key
```

上面是 `.env.local` 的假值示例，不是真实环境配置。真实 `.env.local` 只放在本机，不能提交到 Git。

## 本地优先行为

- 任何学习操作先更新 React 状态和 `LocalStorage`。
- 未登录、CloudBase 未配置、网络失败时，看板继续可用。
- 首次登录后，如果云端没有数据，会把本地访客数据替换为当前 CloudBase 用户 ID 后上传。
- 如果浏览器当前缓存属于另一个 CloudBase 用户，不会导入或上传这份数据；应用会切换到当前用户自己的本地缓存或云端状态。
- 如果云端已有数据，会按实体 key 和 `updatedAt` 做合并。
- 同步失败不会删除本地数据，界面会显示离线或错误状态。
- 退出登录会回到访客/本地模式，访客缓存和每个 CloudBase 用户缓存分开保留。
- 语言切换只保存在本地 UI 设置中，当前版本不做云端语言同步。

LocalStorage keys：

```text
ielts-dashboard-state                     # active cache mirror for legacy compatibility
ielts-dashboard-state:guest               # guest/local-user study state
ielts-dashboard-state:cloud:<userId>      # per-CloudBase-user study state
ielts-dashboard-state:active              # active scoped cache pointer
ielts-dashboard-language                  # local UI language only
```

## 密钥安全

禁止提交以下内容：

- Tencent SecretId
- Tencent SecretKey
- CloudBase 管理员凭据
- service role key
- manager token
- 真实测试账号密码
- 真实 `.env.local`
- 含真实密钥的截图、日志或测试输出

CloudBase Web SDK 的 publishable access key 也只应作为环境配置使用；README、测试和示例文件只能放假值。

## 双测试账号人工验证

需要真实 CloudBase PG 环境时，用两个一次性测试账号手工检查：

1. 确认 CloudBase 套餐页显示人民币计价。
2. 账号 A 通过邮箱验证码注册并登录。
3. 账号 A 在访客模式已有本地数据时登录，确认本地数据导入云端。
4. 刷新页面，确认账号 A 的云端数据恢复。
5. 第二个浏览器会话登录账号 A，确认能读取同一份云端数据。
6. 账号 B 注册并登录，确认不能读取账号 A 的目标、记录、计时和成就。
7. 在 SQL/RLS 验证中确认账号 B 不能插入或更新 `user_id` 为账号 A 的行。
8. 模拟断网或 CloudBase 请求失败，确认本地修改保留，并显示离线或同步错误状态。
9. 退出登录，确认回到访客/本地模式，本地数据没有被删除。

没有真实 CloudBase 环境和两个测试账号时，不要伪造这部分结论；报告应标记为未执行。

## 验证命令

| 场景 | Windows PowerShell | macOS / Linux |
| --- | --- | --- |
| CloudBase SQL 静态检查 | `npm.cmd run verify:cloudbase-sql` | `npm run verify:cloudbase-sql` |
| 运行时未用源码检查 | `npm.cmd run verify:unused-runtime` | `npm run verify:unused-runtime` |
| App 严格 TypeScript | `.\node_modules\.bin\tsc.cmd -p tsconfig.app.json --noEmit --noUnusedLocals --noUnusedParameters` | `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit --noUnusedLocals --noUnusedParameters` |
| Node/Vite 严格 TypeScript | `.\node_modules\.bin\tsc.cmd -p tsconfig.node.json --noEmit --noUnusedLocals --noUnusedParameters` | `./node_modules/.bin/tsc -p tsconfig.node.json --noEmit --noUnusedLocals --noUnusedParameters` |
| 单元测试 | `npm.cmd run test` | `npm run test` |
| 生产构建 | `npm.cmd run build` | `npm run build` |
| E2E 测试 | `npm.cmd run test:e2e` | `npm run test:e2e` |
| 本地开发服务 | `npm.cmd run dev -- --port 5185` | `npm run dev -- --port 5185` |

如果 Playwright 浏览器依赖缺失，先执行：

```bash
npx playwright install chromium
```

## 项目结构

```text
src/
  components/          页面组件和通用 UI
  components/auth/     CloudBase 登录、注册和退出面板
  components/checkin/  每日打卡模块
  components/history/  60 天热力图
  components/language/ 中英文切换
  components/rewards/  奖励和成就
  components/summary/  顶部汇总
  components/targets/  目标设定
  components/timer/    学习计时器
  domain/              纯业务逻辑、类型和默认值
  hooks/               状态管理、认证会话和计时 Hook
  i18n/                本地多语言文案
  services/cloudbase/  CloudBase Web SDK、Auth、PG repository 和 mapper
  services/storage/    本地存储与仓储接口
  services/sync/       本地优先同步、导入和合并逻辑
cloudbase/sql/         CloudBase PG schema 和 RLS SQL
tests/e2e/             Playwright 端到端测试
docs/                  需求、设计和实现计划文档
```

## 当前状态

已完成本地优先看板、CloudBase PG 认证边界、云端 repository、同步管理器、RLS SQL、单元测试和桌面/移动端 E2E 检查。真实 CloudBase 人工验证需要单独准备 PG 环境和两个一次性测试账号后执行。

## 后续路线图

- 用真实 CloudBase PG 环境完成双账号人工验收。
- 增加数据导出，例如 CSV 或 JSON。
- 增加更细的趋势分析，例如四科时间占比、连续弱项提醒和周报视图。
- 增加部署配置和正式安全来源。
- 增加数据备份和恢复入口，降低本地数据丢失风险。

## 免责声明

本项目是个人学习和备考辅助工具，不是 IELTS 官方产品，也不代表 IELTS、British Council、IDP 或 Cambridge English 的官方立场。
