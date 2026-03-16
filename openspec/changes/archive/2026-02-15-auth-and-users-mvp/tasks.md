# 实施任务清单（按 proposal + design + specs）

## 使用说明

- 本清单以 `proposal.md`、`design.md`、`specs/*/spec.md` 为准。
- 技术路线固定为：Next.js（App Router）+ Supabase（Auth/Postgres/RLS/PostgREST），不使用 Edge Functions。
- 交互策略固定为：Server-first（Server Components + Server Actions），必要时使用 Route Handlers（例如 auth callback）。

---

## 阶段 0：文档与参数收口（保证一致性）

- [x] 0.1 回写 `design.md`：Users 分页参数统一为 12（与 specs 一致）
- [x] 0.2 回写 `design.md`：Users 搜索姓名字段明确为 `user_metadata.full_name`

---

## 阶段 1：Supabase 云 Dev 环境约束落地

- [x] 1.1 确认当前仓库 Supabase 云 Dev 工程可访问（以 `supabase/config.toml` 的 project 为准）
- [x] 1.2 关闭 public signups（必须）：仅允许邀请制创建账号
- [x] 1.3 校验 Auth Redirect 配置：
- [x] 1.3.1 `site_url` 指向 `http://localhost:3000`
- [x] 1.3.2 redirect urls 覆盖 `http://localhost:3000/**`
- [x] 1.4 校验默认 Admin 初始化（Dev/引导）migration 在云 Dev 可执行且幂等（不重置密码）

---

## 阶段 2：数据库基线（RLS + UTC 存储语义修正）

> 目标：数据库存储使用 UTC（`timestamptz` 默认语义），展示层按 `Asia/Shanghai` 转换；并保留 RLS 兜底策略。

- [x] 2.1 新增 migration：修正 `region` / `analyst` 的 `created_at` / `updated_at` 默认值与 updated_at trigger，避免 `timezone('Asia/Shanghai', now())` 写入 `timestamptz`
- [x] 2.2 评估并处理 seed 写入时间的语义（避免以本地时间写入 `timestamptz`）
- [x] 2.3 推送 migrations 到云 Dev：执行 `pnpm supabase db push` 并验证成功
- [x] 2.4 数据权限验收（SQL 层）：`region` / `analyst` 认证可读、仅 Admin 可写（符合 `specs/rls-security/spec.md`）

---

## 阶段 3：Next.js + Supabase SSR 基线（会话与路由保护）

- [x] 3.1 安装依赖：`@supabase/supabase-js`、`@supabase/ssr`
- [x] 3.2 补齐环境变量（Dev 可提交，Prod 禁止硬编码密钥）：
- [x] 3.2.1 `NEXT_PUBLIC_SUPABASE_URL`
- [x] 3.2.2 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（或 legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
- [x] 3.2.3 `SUPABASE_SERVICE_ROLE_KEY`（仅服务端）
- [x] 3.3 实现 Supabase 客户端分层封装：
- [x] 3.3.1 Browser client（仅 publishable/anon key）
- [x] 3.3.2 Server client（publishable/anon key + cookies 读写）
- [x] 3.3.3 Admin client（service role key；禁止浏览器可达）
- [x] 3.4 实现 `proxy.ts`：
- [x] 3.4.1 刷新会话并回写 cookies（以 `getUser()` 为准）
- [x] 3.4.2 未登录访问受保护路由 -> `/login`
- [x] 3.4.3 非 Admin 访问 Admin-only（`/users`）-> `/403`
- [x] 3.5 实现认证回调：
- [x] 3.5.1 `GET /auth/callback`（支持 `code` 与 `token_hash+type`）
- [x] 3.5.2 回调失败页 `/auth/auth-code-error`
- [x] 3.6 增加 403 页面 `/403`（文案包含 `No permission`）

---

## 阶段 4：登录/登出/忘记密码（替换原型 mock）

- [x] 4.1 `/login` 登录：从 mock 改为真实 Supabase `signInWithPassword`（成功进入 `/desktop`，失败提示明确）
- [x] 4.2 `/login` 忘记密码：触发 Supabase 重置邮件并返回统一成功提示（避免邮箱枚举）
- [x] 4.3 实现真实登出（清理 cookies 会话），并替换 `/desktop` 的 Logout 为真实登出
- [x] 4.4 UI 验收：`/login` 风格与 `openspec/specs/ui-prototype-login/spec.md` 一致

---

## 阶段 5：Desktop 与权限入口（RBAC）

- [x] 5.1 `/desktop`：服务端读取当前用户角色（`app_metadata.role`）
- [x] 5.2 非 Admin：隐藏管理功能卡片入口（Users 等）
- [x] 5.3 Desktop-as-Launcher：功能卡片新标签页打开；功能页不提供“返回桌面”链接
- [x] 5.4 UI 验收：`/desktop` 风格与 `openspec/specs/ui-prototype-desktop/spec.md` 一致

---

## 阶段 6：Users 管理闭环（Admin-only）

> 目标：把 `/users` 从 mock 数据升级为真实 Supabase Admin API（写操作全部服务端）。

- [x] 6.1 `/users` 访问控制：非 Admin -> `/403`
- [x] 6.2 用户列表（真实数据）：
- [x] 6.2.1 排序：`created_at DESC`
- [x] 6.2.2 分页：每页 12，超过 12 显示分页
- [x] 6.2.3 搜索：按 `email` / `user_metadata.full_name`（包含匹配、大小写不敏感）
- [x] 6.2.4 Created 时间展示：按 `Asia/Shanghai` 格式化显示（不依赖浏览器本地时区）
- [x] 6.3 Invite user：
- [x] 6.3.1 发送邀请邮件（invite-only）
- [x] 6.3.2 写入 `user_metadata.full_name`
- [x] 6.3.3 写入 `app_metadata.role`
- [x] 6.4 Edit user：编辑 `full_name` / `email`
- [x] 6.5 Change role：更新 `app_metadata.role`
- [x] 6.6 Ban/Unban：仅使用 Supabase ban/unban 单机制（不使用 `app_metadata.is_active`）
- [x] 6.7 Admin reset password：设置新密码（不要求旧密码）
- [x] 6.8 Delete user：删除 Auth 用户（需二次确认）
- [x] 6.9 安全验收：`SUPABASE_SERVICE_ROLE_KEY` 不出现在浏览器 bundle/网络请求中

---

## 阶段 7：联调验收（云 Dev）

- [x] 7.1 认证闭环验收：登录、登出、会话刷新、忘记密码、回调（邀请完成后自动进入 `/desktop`）
- [x] 7.2 权限验收：Admin/SA/Analyst 三角色访问控制正确（页面 + 写操作）
- [x] 7.3 禁用账号验收：被 ban 用户无法继续登录/访问受保护页面
- [x] 7.4 路由保护验收：未登录访问 `/desktop`、`/users` 会跳转到 `/login`

---

## 完成定义（DoD）

- [x] `tasks.md` 全部勾选完成后，进入 `/opsx:verify` 验证实现与文档一致。
