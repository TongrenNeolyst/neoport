# 系统框架与 Users 管理设计（Next.js App Router + Supabase）

## 0. 设计基线（跨后续功能）

本设计作为系统底座，后续 Regions/Analyst 等功能应遵循以下基线：

- 应用入口：Next.js 为唯一应用入口（页面渲染 + 服务端能力），不使用 FastAPI / Jinja2 / HTMX。
- 交互：Server-first（Server Components + Server Actions），仅必要时引入 Client Components。
- 写操作：默认 Server Actions；仅在认证回调等必要场景使用 Route Handlers。
- API 边界：不承诺 `/api/*` 为对外稳定业务 REST API；内部是否存在 Route Handlers 属实现细节。
- UI 语言：英文。
- 时间约定：
  - 对外展示与业务语义按 UTC+8（Asia/Shanghai）。
  - 数据库存储保持 Postgres/Supabase 默认（通常为 `timestamptz` 的 UTC 存储），读取展示时做时区转换。
- 工具链：`pnpm` + 项目本地 `node_modules`。
- 安全：`SUPABASE_SERVICE_ROLE_KEY` 仅服务端可用，永不下发浏览器；public signups 关闭；invite-only。
- Supabase 能力边界：不使用 Edge Functions / Realtime / Storage / OAuth providers（本阶段仅邮箱+密码）。
- 会话：使用 Supabase SSR cookies，不使用 `localStorage`；不额外强制自定义 `HttpOnly`（遵循 Supabase SSR 推荐做法，避免破坏 refresh 链路）。

## 1. 总体架构

```text
Browser
  -> Next.js (App Router)
      - Server Components / Server Actions / Route Handlers
      - Proxy: refresh session + route protection baseline
      -> Supabase Auth
      -> Supabase PostgREST (for basic reads) + RLS (defense in depth)
```

约束：
- 不使用 Edge Functions。
- 管理员能力（invite/role/ban/admin 改密/删除用户）必须通过 Next.js 服务端调用 Supabase Admin API（使用 `SUPABASE_SERVICE_ROLE_KEY`）。

补充约束（边界）：
- 业务数据 CRUD 复用 Supabase PostgREST + RLS；本阶段不建设对外稳定的业务 CRUD REST API。

## 2. 会话与鉴权（Supabase SSR cookies）

- 使用 `@supabase/ssr` 的 server/browser client 分层：
  - Browser client：仅用 publishable/anon key
  - Server client：publishable/anon key + cookies 读写
  - Admin client：service role key（无 cookies）
- 建议环境变量命名（以实现为准）：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（或 legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
  - `SUPABASE_SERVICE_ROLE_KEY`（仅服务端）
- 鉴权判断以 `supabase.auth.getUser()` 为准（服务端重新校验 token），不以 `getSession()` 作为权限依据。
- 会话有效期遵循 Supabase 默认机制（access token 自动 refresh），不强制“24 小时必须重新登录”。

## 3. 角色与权限（功能权限 + 数据权限）

角色：
- Admin：本阶段全部管理权限。
- SA：本阶段与 Analyst 权限一致（预留后续扩展）。
- Analyst：本阶段不具备管理权限。

功能权限矩阵（本阶段）：

| 功能能力 | Admin | SA | Analyst |
|---|---|---|---|
| 登录/登出 | ✅ | ✅ | ✅ |
| 忘记密码（邮件重置） | ✅ | ✅ | ✅ |
| 用户管理（页面与操作） | ✅ | ❌ | ❌ |
| Region 管理（页面与操作） | ✅ | ❌ | ❌ |
| Analyst 信息管理（页面与操作） | ✅ | ❌ | ❌ |
| 管理员改密 | ✅ | ❌ | ❌ |

数据权限（RLS 兜底，供后续基础数据功能使用）：
- `region`/`analyst`：认证可读；写操作仅 Admin（以 JWT `app_metadata.role` 判定）。
- “认证可读”不等于开放管理页面入口；页面入口与写操作仍由功能权限控制。

## 4. 路由与页面

页面（本 change 覆盖）：
- `/login`
- `/desktop`
- `/users`（Admin-only）
- `/403`（文案 `No permission`）

Route Handlers（本 change 覆盖）：
- `/auth/callback`：统一回调入口（处理 code 或 token_hash/type），成功后跳转 `/desktop`
  - `code`：`exchangeCodeForSession(code)`（兼容 OAuth/PKCE 类回调参数）
  - `token_hash` + `type`：`verifyOtp({ token_hash, type })`（兼容邀请/确认/重置等邮件链接类回调）
- `/auth/auth-code-error`

路由保护：
- `proxy.ts` 刷新会话并拦截受保护路由：
  - 每个请求调用 `supabase.auth.getUser()` 触发刷新逻辑并回写 cookies（避免 token 过期导致的随机登出体验）。
  - 未登录 -> `/login`
  - 已登录但非 Admin 访问 Admin-only -> `/403`（文案 `No permission`）

回调重定向安全：
- `/auth/callback` 支持 `next` 参数（默认 `/desktop`），且必须校验为相对路径，避免 open redirect。
- 回调失败统一跳转到 `/auth/auth-code-error`。

## 5. Invite-only 与账号管理（单机制）

用户创建：
- Admin 在 `/users` 发起邀请：服务端调用 `inviteUserByEmail`
- public signups 必须关闭，避免绕过邀请创建账号
- 用户完成邀请流程后，系统 SHOULD 自动建立会话并跳转到 `/desktop`（不要求用户再手动登录一次）。
- 本阶段不提供“创建用户时设置初始密码”能力；用户通过邀请邮件自助设置初始密码。

角色：
- 仅使用 `app_metadata.role`（Admin/SA/Analyst）
- 角色更新通过 Admin API 写入 `app_metadata.role`
- 角色更新只允许在服务端执行（避免用户侧自行提权）

启用/禁用：
- 只用 ban/unban（单机制）
- 不使用 `app_metadata.is_active` 作为账号状态事实源；账号状态以 ban/unban 为准。

管理员改密：
- Admin 可直接为任意用户设置新密码（不要求旧密码）

编辑用户信息：
- 仅 Admin 可编辑用户信息（例如 email、user_metadata/profile 等），具体字段以实现阶段确定。
- 所有写入通过服务端 Admin API 执行，浏览器侧不直连管理接口。

## 6. 密码与忘记密码（规则）

- 忘记密码（邮件重置）：
  - 对不存在邮箱返回统一成功提示，避免邮箱枚举。
  - 重置链接有效期采用 Supabase 默认配置，不做额外自定义。
  - 不额外实现一次性失效等增强机制，沿用 Supabase 默认行为。
  - 应用层不额外增加频率限制，保持流程简单（依赖平台默认保护）。
- 管理员改密：不要求提供旧密码。
- 本阶段不要求密码修改审计日志。

## 7. 列表与分页（统一规则）

- 默认按 `created_at DESC`。
- 超过 12 条启用分页；每页固定 12 条；不提供用户自定义每页条数。

Users 列表搜索（基线）：
- 支持按姓名/邮箱搜索（姓名来源统一为 Supabase Auth `user_metadata.full_name`；若缺失则以邮箱为主）。

## 8. Desktop 导航契约

- Desktop 作为 launcher
- 桌面主页展示规划功能卡片；本阶段与后续新增功能页均应遵循该入口与导航方式。
- 非 Admin 默认不展示管理功能卡片（例如 Users/Regions/Analyst Info）。
- 功能页新标签页打开
- 功能页不提供返回 Desktop 的入口
- 上述导航方式为 Desktop-as-Launcher 契约；如需改变，必须通过新 proposal 明确变更。

## 9. 默认 Admin（Dev/引导）

- 默认 Admin 已由 migration 幂等初始化（email：`admin@neolyst.com`，password：`Admin123`）
- 生产必须改密/替换初始化方案

## 10. 运维与安全（补充）

- Dev 环境允许将 Supabase 连接信息与 key 提交到 Git 以提升上手速度；生产环境严禁提交与硬编码任何密钥。
- 禁止提交个人身份的 Supabase Access Token（例如 `SUPABASE_ACCESS_TOKEN`）。
- 生产环境必须关闭调试端点（如后续新增 `/debug/*` 类能力，必须有显式的 prod 禁用策略）。
