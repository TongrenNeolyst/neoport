## MODIFIED Requirements

### Requirement: 系统支持邀请制创建用户（Invite-only）
系统 SHALL 仅允许 Admin 通过邀请制创建用户账号（public signups 必须关闭）。

#### Scenario: 邀请用户并发送确认邮件
- **WHEN** Admin 在 `/users` 发起邀请并提交目标邮箱、姓名、初始角色，且“是否邮件确认”开关为开启
- **THEN** 系统 MUST 调用 Supabase Auth Admin 邀请能力发送邀请确认邮件
- **AND** 系统 MUST 将姓名写入 `user_metadata.full_name`
- **AND** 系统 MUST 将角色写入 `app_metadata.role`

#### Scenario: 邀请用户且关闭邮件确认
- **WHEN** Admin 在 `/users` 发起创建并提交目标邮箱、姓名、初始角色，且“是否邮件确认”开关为关闭
- **THEN** 系统 MUST 创建可登录账号且无需邮件确认
- **AND** 系统 MUST 将姓名写入 `user_metadata.full_name`
- **AND** 系统 MUST 将角色写入 `app_metadata.role`

#### Scenario: 完成邀请后自动进入 Desktop
- **WHEN** 被邀请用户完成邀请流程
- **THEN** 用户 MUST 自动进入 `/desktop`（自动建立会话，不要求再次登录）
