# role-control Specification

## Purpose
TBD - created by archiving change auth-and-users-mvp. Update Purpose after archive.
## Requirements
### Requirement: 系统支持三种角色并以 app_metadata.role 作为角色事实源
系统 SHALL 支持 `admin`、`sa`、`analyst` 三种角色，且角色信息 MUST 来源于 Supabase Auth `app_metadata.role`。

#### Scenario: 读取当前角色
- **WHEN** 系统处理受保护请求
- **THEN** 系统 MUST 从当前用户 `app_metadata.role` 读取角色
- **AND** 系统 MUST NOT 以客户端提交角色作为权限依据

### Requirement: 系统按角色实施功能权限（页面 + 写操作）
系统 SHALL 对管理类页面与管理类写操作执行角色权限控制。

#### Scenario: Admin 访问管理能力
- **WHEN** Admin 访问 Users、Regions、Analyst Info、Coverage、Sectors、Templates 页面或执行对应写操作
- **THEN** 系统 MUST 允许访问

#### Scenario: SA 访问管理能力
- **WHEN** SA 访问 Users、Regions、Analyst Info、Coverage、Sectors、Templates 页面或执行对应写操作
- **THEN** 系统 MUST 拒绝访问

#### Scenario: Analyst 访问 Coverage 管理能力
- **WHEN** Analyst 访问 Coverage 页面并执行创建操作
- **THEN** 系统 MUST 允许访问与创建

#### Scenario: Analyst 执行 Coverage 非创建写操作
- **WHEN** Analyst 对 Coverage 执行更新或删除操作
- **THEN** 系统 MUST 拒绝访问

### Requirement: 非 Admin 访问管理页面返回 403 页面
系统 SHALL 在已登录但无权限场景返回 403 页面，并展示 `No permission` 文案。

#### Scenario: 强行访问管理页面
- **WHEN** SA 或 Analyst 直接访问 `/users`
- **THEN** 系统 MUST 返回 403 页面
- **AND** 页面文案 MUST 包含 `No permission`

### Requirement: 非 Admin 默认不展示管理功能入口
系统 SHALL 在桌面页隐藏非 Admin 用户的管理功能卡片入口。

#### Scenario: 非 Admin 进入桌面页
- **WHEN** SA 访问 `/desktop`
- **THEN** 管理功能卡片（Users、Regions、Analyst Info、Coverage、Sector、Template）MUST 不显示

#### Scenario: Analyst 进入桌面页
- **WHEN** Analyst 访问 `/desktop`
- **THEN** 管理功能卡片（Users、Regions、Analyst Info、Sector、Template）MUST 不显示
- **AND** Coverage 卡片 MUST 显示

### Requirement: System SHALL enforce owner-based permissions for report operations
The system SHALL enforce owner-based permissions for report read and write actions for Analyst users.

#### Scenario: Analyst accesses own report
- **WHEN** Analyst accesses a report where `owner_user_id` equals current user id
- **THEN** system MUST allow read access

#### Scenario: Analyst accesses others report
- **WHEN** Analyst accesses a report where `owner_user_id` differs from current user id
- **THEN** system MUST deny read and write access

### Requirement: System SHALL scope SA report visibility to non-draft statuses
The system SHALL limit SA visibility to reports in `submitted|published|rejected`.

#### Scenario: SA reads submitted report
- **WHEN** SA requests a submitted report
- **THEN** system MUST allow read access

#### Scenario: SA reads draft report
- **WHEN** SA requests a draft report
- **THEN** system MUST deny access

### Requirement: System SHALL restrict report review actions to SA and Admin
The system SHALL allow only SA and Admin to execute report review actions.

#### Scenario: SA approves report
- **WHEN** SA executes approve action on submitted report
- **THEN** system MUST allow action

#### Scenario: Analyst attempts review action
- **WHEN** Analyst executes approve/reject/reopen action
- **THEN** system MUST deny action

