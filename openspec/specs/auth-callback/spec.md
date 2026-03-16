# auth-callback Specification

## Purpose
TBD - created by archiving change auth-and-users-mvp. Update Purpose after archive.
## Requirements
### Requirement: 系统提供统一认证回调入口（/auth/callback）
系统 SHALL 提供统一认证回调入口，用于处理邀请、确认、重置等 Supabase Auth 回调场景。

#### Scenario: code 回调（exchange）
- **WHEN** 浏览器访问 `/auth/callback` 且携带查询参数 `code`
- **THEN** 系统 MUST 调用 `exchangeCodeForSession(code)` 建立 cookies 会话

#### Scenario: token_hash + type 回调（verify）
- **WHEN** 浏览器访问 `/auth/callback` 且携带查询参数 `token_hash` 与 `type`
- **THEN** 系统 MUST 调用 `verifyOtp({ token_hash, type })` 建立 cookies 会话

### Requirement: 回调成功后默认进入 /desktop
系统 SHALL 在回调成功后将用户引导到登录后默认落地页。

#### Scenario: 回调成功重定向
- **WHEN** `/auth/callback` 成功建立会话
- **THEN** 系统 MUST 将用户重定向到 `/desktop`

### Requirement: next 重定向必须防止 open redirect
系统 SHALL 支持 `next` 参数用于回调后重定向，但必须防止 open redirect。

#### Scenario: next 为相对路径
- **WHEN** `/auth/callback` 携带 `next` 且其值为相对路径（以 `/` 开头且不包含协议/域名）
- **THEN** 系统 SHOULD 将用户重定向到该相对路径

#### Scenario: next 非法
- **WHEN** `/auth/callback` 携带 `next` 但其值为外部 URL 或非法路径
- **THEN** 系统 MUST 忽略该值并重定向到 `/desktop`

### Requirement: 回调失败必须进入统一错误页
系统 SHALL 在回调失败时进入统一错误页，避免暴露内部错误细节。

#### Scenario: 回调失败
- **WHEN** `/auth/callback` 处理失败（无法 exchange/verify 或参数非法）
- **THEN** 系统 MUST 重定向到 `/auth/auth-code-error`

