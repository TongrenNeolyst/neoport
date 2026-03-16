## Why

先把核心界面（Login / Desktop / Users）的交互与视觉风格定下来，产出可运行的高保真原型，避免“功能做完再返工 UI/导航/组件体系”。

本 change 只做可演示的界面原型，用于你审阅并确认：
- 视觉风格（字体、色彩、布局密度、组件外观）
- 导航方式（Desktop-as-Launcher + 新标签页打开）
- 页面结构与交互方式（表格、搜索、分页、弹窗/抽屉、状态提示等）

## Goals

- 产出核心三页的可运行高保真原型（mock 数据即可）：`/login`、`/desktop`、`/users`，并提供一个统一 Coming Soon 占位页用于其他卡片导航演示。
- 覆盖关键交互状态（不接 Supabase 也能演示）：
  - Login：输入校验、错误提示、loading、忘记密码入口（原型态）
  - Desktop：功能卡片布局、分组、Admin-only 标识、“新标签页打开”行为
  - Users：搜索、分页、列表、表单/弹窗、危险操作确认、反馈（toast/inline error）
- 明确并固化一套最小 UI 规范（组件外观 + 交互反馈），作为后续真实功能实现的基线。
- 视觉风格基线：深色背景、专业、简洁、科技感；
- 登录页与桌面页以旧原型图作为验收依据（允许对间距/字号做小幅适配，但不得改变整体视觉方向与信息层级）。

## Scope（原型范围）

### 1) 登录页面（`/login`）

- 粒子背景效果（Canvas 2D）：约 120 个粒子，蓝色-青色渐变，缓慢漂浮（增强“深色科技风”）。
- 表单内容（英文文案）：
  - 标语：`The Future is Now`
  - 副标题：`Research Report Management System`
  - Email、Password、Login 按钮
- 表单验证：空值、Email 格式。
- 加载状态：按钮禁用或显示 spinner。

### 2) 桌面主页（`/desktop`）

- 顶部导航栏（原型态即可）：Logo、欢迎信息、Logout。
- 功能卡片分组布局（用于确认信息架构与视觉层级）。
- 点击功能卡片在新标签页打开（`target="_blank"`），遵循 Desktop-as-Launcher 契约。
- 卡片状态：除 Users 外，其余卡片可为 “Coming Soon” 占位状态；点击打开占位页面，显示 `This feature is coming soon`（用于验证导航与布局，不实现真实功能）。

桌面卡片建议布局（可调整，但需在原型中体现“分组 + 权限标签 + 占位态”）：

| Reports 功能组 | Data Management 功能组 |
|---|---|
| Reports - View all reports | User Management (Admin only) |
| New Report - Create new report | Analyst Info (Admin only) |
| Report Review (SA/Admin only) | Coverage |
| Templates | Sectors |
|  | Regions |

### 3) 用户管理页面（`/users`）

- 用户列表 + 搜索（email/name）+ 分页（原型可用固定 mock 数据）。
- 用户新增/编辑表单（modal 或 drawer，原型阶段以易评审为主）。
- 删除确认弹窗（危险操作二次确认）。
- 其它管理动作在原型层仅要求“交互载体”完整（不接真实请求也可）：Invite、改角色、禁用/启用、管理员改密等。

## Non-Goals

- 不实现真实认证与会话（不接 `@supabase/ssr`）。
- 不实现真实用户管理（不调用 Supabase Admin API）。
- 不实现 Reports / Regions / Analyst Info / Coverage / Sectors 等功能的真实页面与功能（仅通过统一的 Coming Soon 占位页演示导航与布局）。
- 不做多语言体系，本阶段 UI 文案默认英文。

## 技术栈（原型实现建议）

- Next.js + TypeScript
- Tailwind CSS
- Canvas 2D（粒子效果）

## Capabilities

| Capability | 对应范围 | 说明 |
|---|---|---|
| `ui-prototype-login` | `/login` | 粒子背景 + 登录表单与校验 + 忘记密码弹窗 + 成功/失败模拟 |
| `ui-prototype-desktop` | `/desktop` | 顶部导航栏 + 功能卡片矩阵（分组/权限标签/占位态）+ 新标签页打开 |
| `ui-prototype-coming-soon` | `/coming-soon` | 统一占位页（Coming Soon）用于非 Users 卡片导航演示 |
| `ui-prototype-users` | `/users` | 用户列表（mock）+ 搜索/分页 + Invite/Edit/Role/Ban/ResetPwd/Delete 等弹窗交互（mock） |

## 交付物

- OpenSpec：本 change 的 `design.md` 作为样式规范与组件/交互约定（可视作最小“组件库文档 + 样式规范”）。
- 可运行的原型应用：用于你评审三页的视觉风格、导航方式与交互基线。

## 已确认

- Desktop 展示完整卡片矩阵 + Coming Soon 占位页。
- 登录页粒子背景（Canvas，约 120 粒子）为必须项。
- 原型实现使用 Tailwind CSS。
- Users 原型需把 Invite/改角色/禁用启用/管理员改密/删除/创建编辑等操作做成可点击的弹窗交互（mock 即可）。
