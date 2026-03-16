## ADDED Requirements

### Requirement: 系统支持三种角色并以 app_metadata.role 作为角色事实源
系统 SHALL 支持 `admin`、`sa`、`analyst` 三种角色，且角色信息 MUST 来源于 Supabase Auth `app_metadata.role`。

#### Scenario: 读取当前角色
- **WHEN** 系统处理受保护请求
- **THEN** 系统 MUST 从当前用户 `app_metadata.role` 读取角色
- **AND** 系统 MUST NOT 以客户端提交角色作为权限依据

### Requirement: 系统按角色实施功能权限（页面 + 写操作）
系统 SHALL 对管理类页面与管理类写操作执行角色权限控制。

#### Scenario: Admin 访问管理能力
- **WHEN** Admin 访问 Users 页面或执行用户管理写操作
- **THEN** 系统 MUST 允许访问

#### Scenario: SA 或 Analyst 访问管理能力
- **WHEN** SA 或 Analyst 访问 Users 页面或执行用户管理写操作
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
- **WHEN** SA 或 Analyst 访问 `/desktop`
- **THEN** 管理功能卡片（例如 Users）MUST 不显示

