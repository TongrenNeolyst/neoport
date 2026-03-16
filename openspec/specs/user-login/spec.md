# user-login Specification

## Purpose
TBD - created by archiving change auth-and-users-mvp. Update Purpose after archive.
## Requirements
### Requirement: 用户可以通过邮箱密码登录并建立 cookies 会话（Supabase SSR）
系统 SHALL 使用 Supabase Auth 验证邮箱与密码，并在验证成功后建立基于 cookies 的会话（用于 SSR）。

#### Scenario: 登录成功
- **WHEN** 用户在登录页 `/login` 提交有效邮箱和密码
- **THEN** 系统 MUST 调用 Supabase Auth `signInWithPassword` 完成身份验证
- **AND** 系统 MUST 建立 cookies 会话（遵循 Supabase SSR 默认 cookie 行为，不使用 `localStorage`）
- **AND** 用户 MUST 进入桌面页 `/desktop`

#### Scenario: 登录失败
- **WHEN** 用户在 `/login` 提交无效邮箱或密码
- **THEN** 系统 MUST 返回认证失败提示
- **AND** 系统 MUST NOT 建立登录会话

### Requirement: 用户可以登出并清理 cookies 会话
系统 SHALL 提供登出能力，并在登出时清除当前 cookies 会话凭据。

#### Scenario: 登出成功
- **WHEN** 已登录用户触发登出
- **THEN** 系统 MUST 清除 cookies 会话
- **AND** 系统 MUST 将用户引导回 `/login`

### Requirement: 系统可在服务端获取当前用户信息用于鉴权与展示
系统 SHALL 在服务端获取当前登录用户信息，并以 `app_metadata.role` 作为角色事实源。

#### Scenario: 访问受保护页面
- **WHEN** 用户访问 `/desktop`、`/users` 等受保护页面
- **THEN** 系统 MUST 在服务端获取当前用户的 `id`、`email`、`app_metadata.role`
- **AND** 系统 SHOULD 在服务端获取当前用户的 `user_metadata.full_name`（用于展示与搜索）

### Requirement: 受保护路由必须强制登录态（proxy）
系统 SHALL 使用 `proxy.ts` 刷新会话并拦截受保护路由。

#### Scenario: 未登录访问受保护页面
- **WHEN** 未登录用户访问受保护页面
- **THEN** 系统 MUST 跳转到 `/login`

#### Scenario: 会话刷新
- **WHEN** 用户携带 cookies 会话访问任意受保护页面
- **THEN** 系统 MUST 在 proxy 中触发会话刷新逻辑并回写 cookies（遵循 Supabase SSR 推荐做法）

#### Scenario: 会话失效或 refresh 失败
- **WHEN** 用户会话无效或 refresh 失败
- **THEN** 系统 MUST 将用户视为未登录
- **AND** 系统 MUST 跳转到 `/login`

### Requirement: 会话有效期遵循 Supabase 默认机制
系统 SHALL 遵循 Supabase 默认会话机制（access token 自动 refresh），不强制 24 小时重新登录。

#### Scenario: 正常使用场景保持登录态
- **WHEN** 用户在 access token 即将过期前持续访问受保护页面
- **THEN** 系统 SHOULD 通过自动 refresh 保持会话有效（除非登出、被禁用或 refresh 失败）

