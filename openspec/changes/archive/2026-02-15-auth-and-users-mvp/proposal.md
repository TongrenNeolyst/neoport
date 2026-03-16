## Why

在确认 UI 原型之后，需要尽快把系统框架搭起来，把“登录相关 + Desktop + Users 管理”跑通，形成可演示、可扩展的基线，为后续 Regions/Analyst 功能叠加提供稳定底座。

## Goals

- 技术栈落地：Next.js（App Router）+ Supabase（Auth/Postgres/RLS/PostgREST）。
- Next.js 作为唯一应用入口（页面渲染 + 服务端能力），不再使用 FastAPI / Jinja2 / HTMX。
- 数据库变更治理：使用 Supabase CLI 的 migrations/seed（按仓库既有 Supabase 工作流执行）。
- 会话与路由保护基线：
  - 使用 Supabase SSR cookies（`@supabase/ssr`）。
  - `proxy.ts` 刷新会话并做受保护路由的跳转/拦截。
- 完成认证闭环：
  - 登录、登出
  - 当前用户信息获取（用于页面鉴权与展示）
  - 忘记密码（触发 Supabase 邮件重置；重置页使用 Supabase 托管页）
  - 统一认证回调（邀请/确认/重置等）
- 完成 Users 管理闭环（Admin-only）：
  - 用户列表（支持按姓名/邮箱搜索）
  - 邀请制创建用户（invite）
  - 编辑用户信息
  - 角色管理（`app_metadata.role`）
  - 禁用/启用（ban/unban，单机制）
  - 管理员改密
  - 删除用户
- Desktop-as-Launcher：
  - Desktop 为登录后默认落地页
  - 管理功能卡片在新标签页打开

## Non-Goals

- 不实现 Regions/Analyst Info 功能页与 CRUD（留给下一个 change）。
- 不使用 Supabase Edge Functions。
- 不引入 OAuth providers。
- 不使用 Supabase Realtime。
- 不使用 Supabase Storage（本阶段不涉及文件/附件）。
- 不包含 Sector、Coverage、Template 等其他基础数据管理。
- 不包含报告创建、编辑、审核等报告功能。

## 基线约定（跨后续功能）

### 角色与权限（功能权限 + 数据权限）

角色：
- Admin：系统管理员，本阶段全部管理权限。
- SA：本阶段与 Analyst 权限一致（预留后续报告审核能力）。
- Analyst：普通分析师，本阶段不具备管理权限。

角色事实源：
- 角色仅存储在 Supabase Auth 的 `app_metadata.role`。
- 角色更新仅允许在服务端通过 Supabase Admin API 执行（避免用户侧自行提权）。

功能权限矩阵（本阶段）：

| 功能能力 | Admin | SA | Analyst |
|---|---|---|---|
| 登录/登出 | ✅ | ✅ | ✅ |
| 忘记密码（邮件重置） | ✅ | ✅ | ✅ |
| 用户管理（Users 页面与操作） | ✅ | ❌ | ❌ |
| Region 管理（页面与操作） | ✅ | ❌ | ❌ |
| Analyst 信息管理（页面与操作） | ✅ | ❌ | ❌ |
| 管理员改密 | ✅ | ❌ | ❌ |

数据权限矩阵（RLS，作为后续基础数据功能的兜底）：

| 数据资源 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `region` | 所有已认证用户 | 仅 Admin | 仅 Admin | 仅 Admin |
| `analyst` | 所有已认证用户 | 仅 Admin | 仅 Admin | 仅 Admin |

说明：
- 基础数据“认证可读”是业务可用性需求，不代表管理功能对非 Admin 开放。
- 本阶段不做字段脱敏（例如 `analyst.email` 不做部分隐藏）。

### 认证与密码（规则约束）

- 会话使用 cookies（Supabase SSR 推荐），不使用 `localStorage`。
- 不对 Supabase 会话 cookies 额外强制自定义 `HttpOnly`（遵循 Supabase SSR 推荐做法，避免破坏 refresh 链路）。
- 会话有效期遵循 Supabase 默认机制（access token 自动 refresh），不强制“24 小时必须重新登录”。
- 忘记密码（邮件重置）：
  - 对不存在邮箱返回统一成功提示，避免邮箱枚举。
  - 重置链接有效期采用 Supabase 默认配置，不做额外自定义。
  - 不额外实现一次性失效等增强机制，沿用 Supabase 默认行为。
  - 应用层不额外增加频率限制，保持流程简单（依赖平台默认保护）。
- 管理员改密：不要求提供旧密码。
- 不在本阶段实现密码修改审计日志。
- 邀请制用户完成邀请流程后，系统 SHOULD 自动建立会话并跳转到 `/desktop`（不要求用户再手动登录一次）。
- 本阶段不提供“创建用户时设置初始密码”能力；用户通过邀请邮件自助设置初始密码（如需改密，使用管理员改密或忘记密码流程）。

认证验收要点（基线）：
- 未登录访问受保护页面会跳转到 `/login`。
- 登录失败有明确错误提示。
- Token 失效或刷新失败时，前端应清理登录态并跳转到 `/login`。
- 正常使用场景 SHOULD 保持登录态（除非手动登出、被禁用或 refresh 失败）。

### 体验约定（语言/时间）

- 前端界面语言统一为英文（按钮、标题、提示文案）。
- 对外展示与接口语义的时间统一按北京时间（UTC+8 / Asia/Shanghai）。
- 业务数据内容支持中英文（例如姓名等业务字段）。

### API 边界与交互策略（实现约束）

- 交互策略：默认 Server-first（Server Components + Server Actions），仅必要场景局部引入 Client Components。
- 写操作默认使用 Server Actions；仅在认证回调等必要场景使用 Route Handlers。
- 不承诺 `/api/*` 为对外稳定的业务 REST API 合同；内部是否存在 Route Handlers 属实现细节。
- 业务数据 CRUD 复用 Supabase PostgREST + RLS，不自建对外稳定的业务 CRUD REST API。

### 运维与安全（基线）

- Node.js 依赖与命令必须使用 `pnpm` + 项目本地 `node_modules`，禁止 `npm/npx` 或全局安装包作为开发命令入口。
- `SUPABASE_SERVICE_ROLE_KEY` 仅允许在服务端环境变量使用，严禁下发到浏览器。
- 开发阶段允许将 Dev 环境的 Supabase 连接信息与 key 提交到 Git 以提升上手速度；生产环境严禁提交与硬编码任何密钥。
- 禁止提交个人身份的 Supabase Access Token（例如 `SUPABASE_ACCESS_TOKEN`）。
- 生产环境必须关闭调试端点（如后续新增 `/debug/*` 类能力，必须有显式的 prod 禁用策略）。
- 本轮联调与验收仅覆盖 Dev 云环境，不执行 Prod 环境测试。

## 关键约束（必须写进实现）

- `SUPABASE_SERVICE_ROLE_KEY` 仅存在于 Next.js 服务端环境变量，永不下发浏览器。
- public signups 必须关闭，仅允许邀请制创建账号。
- 权限事实源收敛到 `app_metadata.role`；账号启用/禁用只用 ban/unban。
- 不使用 `app_metadata.is_active` 作为账号状态事实源；账号状态以 ban/unban 为准。
