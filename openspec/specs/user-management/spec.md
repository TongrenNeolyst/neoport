# user-management Specification

## Purpose
TBD - created by archiving change auth-and-users-mvp. Update Purpose after archive.
## Requirements
### Requirement: 用户管理能力仅对 Admin 开放
系统 SHALL 对用户管理相关页面和写操作强制执行 Admin 权限。

#### Scenario: 非 Admin 访问用户管理
- **WHEN** SA 或 Analyst 访问 `/users` 或尝试执行用户管理写操作
- **THEN** 系统 MUST 返回 403 页面（文案包含 `No permission`）

### Requirement: 系统提供用户管理列表与搜索能力
系统 SHALL 提供用户管理列表，并支持按姓名或邮箱搜索。

#### Scenario: 查询用户列表
- **WHEN** Admin 访问用户管理页面 `/users`
- **THEN** 系统 MUST 返回用户列表
- **AND** 系统 MUST 支持按 `email` 与 `user_metadata.full_name` 搜索（大小写不敏感、包含匹配）

### Requirement: 用户列表遵循统一排序与分页规则（12 条/页）
系统 SHALL 按统一规则返回 Users 列表数据。

#### Scenario: 排序与分页
- **WHEN** Admin 查询用户列表
- **THEN** 系统 MUST 按 `created_at DESC` 排序
- **AND** 当记录超过 12 条时 MUST 启用分页
- **AND** 每页条数 MUST 固定为 12

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

### Requirement: 系统支持用户信息编辑（最小字段）
系统 SHALL 支持 Admin 编辑用户的最小必要信息。

#### Scenario: 编辑姓名与邮箱
- **WHEN** Admin 更新用户 `full_name` 或 `email`
- **THEN** 系统 MUST 更新对应用户信息

### Requirement: 系统支持用户角色调整且以 app_metadata.role 作为事实源
系统 SHALL 支持调整用户角色，角色信息 MUST 存储在 Supabase Auth `app_metadata.role`。

#### Scenario: 调整角色
- **WHEN** Admin 将用户角色调整为 `admin`、`sa` 或 `analyst`
- **THEN** 系统 MUST 更新目标用户的 `app_metadata.role`

### Requirement: 系统支持禁用/启用账号（单机制：ban/unban）
系统 SHALL 使用 Supabase Auth ban/unban 作为禁用/启用账号的唯一机制。

#### Scenario: 禁用账号
- **WHEN** Admin 禁用指定用户
- **THEN** 系统 MUST 通过 ban 机制禁用该账号
- **AND** 被禁用用户 MUST 无法继续登录或访问受保护页面

#### Scenario: 启用账号
- **WHEN** Admin 启用指定用户
- **THEN** 系统 MUST 通过 unban 机制恢复该账号

#### Scenario: 禁止使用 app_metadata.is_active
- **WHEN** 系统判断账号启用/禁用状态
- **THEN** 系统 MUST NOT 以 `app_metadata.is_active` 作为事实源

### Requirement: 系统支持管理员改密（不要求旧密码）
系统 SHALL 提供管理员改密能力，允许 Admin 为指定用户设置新密码且不要求旧密码。

#### Scenario: Admin 改密成功
- **WHEN** Admin 为指定用户设置新密码
- **THEN** 系统 MUST 更新目标用户密码
- **AND** 目标用户后续登录 MUST 使用新密码

### Requirement: 系统支持删除用户
系统 SHALL 允许 Admin 删除用户账号。

#### Scenario: 删除用户
- **WHEN** Admin 删除指定用户
- **THEN** 系统 MUST 删除目标 Auth 用户账号

### Requirement: 管理操作必须仅在服务端使用 Service Role Key
系统 SHALL 确保所有用户管理写操作仅由服务端执行。

#### Scenario: Service Role Key 不得下发浏览器
- **WHEN** 浏览器加载任何页面或执行任何用户管理操作
- **THEN** `SUPABASE_SERVICE_ROLE_KEY` MUST NOT 出现在浏览器侧代码与网络请求中

