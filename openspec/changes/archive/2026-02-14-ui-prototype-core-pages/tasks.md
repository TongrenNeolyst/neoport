## 1. 项目初始化（Next.js + Tailwind）

- [x] 1.1 补齐 Next.js App Router 原型所需依赖与 `package.json` scripts（使用 `corepack pnpm`）
- [x] 1.2 建立 Next.js App Router 目录结构（`app/`、`components/`、`lib/` 等）与基础配置文件
- [x] 1.3 配置 Tailwind/PostCSS 与全局样式（背景渐变、基础排版、输入框 autofill 样式修正）

## 2. 设计系统组件（最小可复用）

- [x] 2.1 实现 `Button`（Primary/Secondary/Danger/Ghost）与 loading/disabled 状态
- [x] 2.2 实现 `Input`（错误态、焦点 ring、autofill 样式约束）
- [x] 2.3 实现 `Modal`（遮罩、backdrop blur、进入/退出动画、可关闭）
- [x] 2.4 实现 `Toast`（右上角、success/error、自动消失、可堆叠）
- [x] 2.5 实现 `Card` / `Badge` / `Table`（用于 Desktop 卡片与 Users 列表）

## 3. 登录页原型（/login）

- [x] 3.1 实现粒子背景组件（Canvas 2D，约 120 粒子，带连线与脉冲）
- [x] 3.2 实现 `/login` UI（标语/副标题/Email/Password/Login）与表单校验
- [x] 3.3 实现 Forgot password 弹窗（mock 提交 + 统一成功提示）
- [x] 3.4 实现模拟登录提交（1-2 秒延迟、loading、成功跳 `/desktop`、失败提示）

## 4. 桌面与占位页原型（/desktop, /coming-soon）

- [x] 4.1 实现 `/desktop` 顶部导航栏与功能卡片矩阵（Reports / Data Management 分组）
- [x] 4.2 实现卡片导航：新标签页打开 `/users` 与 `/coming-soon?feature=...`（Coming Soon 占位态）
- [x] 4.3 实现 `/coming-soon` 占位页（Coming Soon + This feature is coming soon + feature 展示）

## 5. Users 原型（/users）

- [x] 5.1 建立 mock users 数据与列表工具（filter + pagination，每页 12）
- [x] 5.2 实现 `/users` 基础布局（Header、Search、Table、Pagination）
- [x] 5.3 实现 Invite user 弹窗（Email/Role 校验、mock 新增、toast）
- [x] 5.4 实现 Edit user 弹窗（mock 更新、toast）
- [x] 5.5 实现 Change role 弹窗（mock 更新、toast）
- [x] 5.6 实现 Ban/Unban 二次确认（mock 更新、toast）
- [x] 5.7 实现 Reset password 弹窗（mock 提交、toast）
- [x] 5.8 实现 Delete user 二次确认（mock 删除、toast）

## 6. 验证

- [x] 6.1 本地 smoke-check：`/login`、`/desktop`、`/users`、`/coming-soon` 页面可访问且交互可用
