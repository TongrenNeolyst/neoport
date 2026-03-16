## ADDED Requirements

### Requirement: 系统在初始化时创建默认 Admin 账号（幂等）
系统 SHALL 通过 Supabase migration 初始化默认 Admin 账号，用于 Dev/引导。

#### Scenario: 初始化默认账号
- **WHEN** 数据库迁移执行完成
- **THEN** 系统 MUST 存在邮箱为 `admin@neolyst.com` 的 Auth 用户
- **AND** 该用户的 `app_metadata.role` MUST 为 `admin`

#### Scenario: 幂等执行
- **WHEN** 初始化 migration 重复执行或默认邮箱对应用户已存在
- **THEN** 系统 MUST 不重复创建账号
- **AND** 系统 MUST 补齐管理员角色元数据（`app_metadata.role=admin`）
- **AND** 系统 MUST NOT 重置该用户密码

### Requirement: 默认凭据仅用于 Dev/引导
系统 SHALL 将默认凭据限制为 Dev/引导用途，生产环境必须在对外开放前完成改密或替换初始化方案。

#### Scenario: 生产环境上线前处理默认凭据
- **WHEN** 系统准备部署到生产环境并对外开放访问
- **THEN** 运维流程 MUST 完成默认 Admin 的改密或替换初始化方案
