# password-reset Specification

## Purpose
TBD - created by archiving change auth-and-users-mvp. Update Purpose after archive.
## Requirements
### Requirement: 用户可以通过忘记密码流程请求重置邮件
系统 SHALL 在登录页提供“忘记密码”入口，向邮箱发送重置密码链接。

#### Scenario: 提交忘记密码请求
- **WHEN** 用户在 `/login` 提交忘记密码请求并输入邮箱
- **THEN** 系统 MUST 调用 Supabase Auth 的重置密码能力发送邮件
- **AND** 系统 MUST 返回统一提示文案

#### Scenario: 邮箱不存在
- **WHEN** 用户提交不存在的邮箱
- **THEN** 系统 MUST 返回与成功请求一致的统一提示
- **AND** 系统 MUST NOT 暴露邮箱是否存在（避免邮箱枚举）

### Requirement: 用户通过 Supabase 托管重置页设置新密码
系统 SHALL 使用 Supabase 托管重置页完成新密码设置，不要求实现站内重置页。

#### Scenario: 重置成功
- **WHEN** 用户点击邮件中的重置链接并在 Supabase 托管重置页提交新密码
- **THEN** 用户密码 MUST 被更新
- **AND** 用户后续可以使用新密码登录本系统

