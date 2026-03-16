# rls-security Specification

## Purpose
TBD - created by archiving change auth-and-users-mvp. Update Purpose after archive.
## Requirements
### Requirement: 核心业务表必须启用 RLS
系统 SHALL 在 `region` 与 `analyst` 表启用 Row Level Security（RLS），作为后续基础数据管理能力的数据层兜底。

#### Scenario: 表级安全启用
- **WHEN** 数据库迁移完成
- **THEN** `region` 与 `analyst` 表 MUST 处于 RLS 启用状态

### Requirement: 数据权限执行“认证可读，Admin 可写”
系统 SHALL 对 `region` 和 `analyst` 实施统一数据权限矩阵。

#### Scenario: 认证用户读取
- **WHEN** 任意已认证用户执行 `SELECT` 读取 `region` 或 `analyst`
- **THEN** RLS policy MUST 允许读取

#### Scenario: 非 Admin 写入
- **WHEN** SA 或 Analyst 执行 `INSERT`、`UPDATE`、`DELETE`
- **THEN** RLS policy MUST 拒绝写操作

#### Scenario: Admin 写入
- **WHEN** Admin 执行 `INSERT`、`UPDATE`、`DELETE`
- **THEN** RLS policy MUST 允许写操作

### Requirement: RLS 角色判断必须来源于 Supabase JWT
系统 SHALL 使用 `auth.jwt()->'app_metadata'->>'role'` 作为 RLS 角色判断依据。

#### Scenario: RLS 以 JWT 的 app_metadata.role 判定权限
- **WHEN** 任意已认证用户触发 `region` 或 `analyst` 的写入授权判断
- **THEN** RLS policy MUST 使用 `auth.jwt()->'app_metadata'->>'role'` 读取当前角色

### Requirement: 数据库存储时间使用 UTC（timestamptz 默认行为）
系统 SHALL 使用 `timestamptz` 的 UTC 存储语义；应用层展示按 `Asia/Shanghai` 转换。

#### Scenario: created_at/updated_at 默认值
- **WHEN** 记录被创建或更新
- **THEN** 数据库写入的 `created_at` / `updated_at` MUST 使用 UTC 语义写入
- **AND** 系统 MUST NOT 通过 `timezone('Asia/Shanghai', now())` 将本地时间写入 `timestamptz` 字段

### Requirement: 数据库变更必须使用 Supabase 迁移机制管理
系统 SHALL 使用 Supabase CLI migration 进行数据库变更管理，不自建版本记录表。

#### Scenario: Schema 变更必须通过 migration 管理
- **WHEN** 需要对数据库 schema 或 RLS policy 做变更
- **THEN** 开发者 MUST 通过 Supabase CLI migrations 机制提交变更（例如在 `supabase/migrations/` 新增 migration）
- **AND** 系统 MUST NOT 依赖手工在 Dashboard 中直接修改作为唯一事实源

