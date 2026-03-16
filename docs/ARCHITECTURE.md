# Architecture (Project-Wide)

本文件定义系统架构与技术边界（HOW-系统级）。
不承载业务需求细节（见 `REQUIREMENTS.md`）和代码级规则（见 `LOGIC.md`）。

## 1. 系统总览

```text
Browser
  -> Next.js (App Router)
      - Server Components / Server Actions / Route Handlers
      - Request boundary gate: proxy.ts（会话刷新 + 轻量门禁）
      -> Supabase Auth
      -> Supabase PostgREST + RLS
      -> Supabase Storage（模板/报告文件）
```

核心原则：
- Next.js 是唯一应用入口。
- Supabase 承担认证、数据访问与数据权限兜底。
- 应用层权限控制 + RLS 双层防护。

## 2. 技术栈与边界

- 前端：Next.js App Router + React + TypeScript。
- 后端能力：Supabase（Auth / Postgres / RLS / PostgREST / Storage）。
- 当前不使用：Edge Functions、Realtime（除非后续 change 明确引入）。

## 3. 分层架构（系统层）

- 路由与页面组合：`web/app`
- 业务模块：`web/features`
- 业务领域类型与纯规则：`web/domain`
- 基础 UI：`web/components`
- 基础设施：`web/lib`

说明：
- 详细依赖方向、触库规则、Server Actions 约束统一以 `docs/LOGIC.md` 为准。

## 4. 认证与授权架构

- 会话载体：SSR cookies（`@supabase/ssr`）。
- 服务端鉴权事实源：`getUser()`。
- 角色事实源遵循 `docs/DECISIONS.md` 的 `D-003`。
- 路由门禁：`proxy.ts` 做“未登录拦截 + 轻量权限拦截”。
- 资源级权限：通过应用层权限 + RLS 共同实现。

## 5. 数据架构与数据库规范

### 5.1 数据模型分层
- 逻辑模型（业务可读）：`docs/DATA_MODEL.md`
- 物理模型（执行真相）：`supabase/migrations/*.sql`

### 5.2 数据库规范（系统级）
- 主键：默认 `uuid`。
- 时间字段：`created_at` / `updated_at`，使用 `timestamptz`。
- 外键：显式声明 `ON DELETE` 语义（如 `set null` / `cascade` / `restrict`）。
- 唯一性：通过唯一约束或唯一索引在 DB 层保证。
- 审计：关键流程使用 append-only 日志表（例如状态历史）。
- 删除策略：优先逻辑删除或状态驱动；是否允许物理删除由数据模型定义。

### 5.3 RLS 规范（系统级）
- RLS 是最终授权裁判。
- 角色判断统一来源于 JWT 角色字段。
- 表级 RLS 矩阵与细节规则统一在 `docs/DATA_MODEL.md` 维护。

## 6. 存储架构规范

- 模板文件与报告文件统一使用 Supabase Storage。
- 存储路径规则、命名规范、读写权限矩阵在 `docs/DATA_MODEL.md` 定义。
- 前端不直持高权限凭据；上传/下载由服务端编排。

## 7. 迁移与演进原则

- 所有 Schema/RLS 变更必须走 `supabase/migrations/*.sql`。
- `supabase/seed/` 仅放开发初始数据；测试数据由测试脚本创建与清理。
- 文档更新顺序：先更新 `REQUIREMENTS`/`DATA_MODEL`/`DECISIONS`，再落实现。

## 8. 相关文档

- 需求：`docs/REQUIREMENTS.md`
- 数据模型：`docs/DATA_MODEL.md`
- Web 实现规范：`docs/LOGIC.md`
- 测试规范：`docs/TESTING.md`
- 长期决策：`docs/DECISIONS.md`
