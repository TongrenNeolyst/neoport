## Context

该 change 是 report 业务前置层。`proposal.md` 已定义业务范围、权限矩阵、验收标准与实现约束；本文仅说明技术实现方案与关键权衡。

## Goals / Non-Goals

**Goals:**
- 在现有架构内实现 Coverage/Sector/Template 的可维护数据模型与服务端写入链路。
- 通过数据库约束与事务策略保证层级、版本和启用态一致性。
- 保证权限实现“应用层校验 + RLS 兜底”的双层一致。

**Non-Goals:**
- 不实现 report 创建、编辑、提交、审批。
- 不实现模板内容在线编辑和 diff 对比。
- 不开放 SA 对基础数据写入权限；Analyst 仅开放 Coverage 新增能力。

## Decisions

### 1) 设计基线
- 技术基线继承既有项目约定（详见 `docs/LOGIC.md`、`docs/UI.md` 与相关规范文档）。

备选方案：Route Handlers + client fetch。  
未选原因：与现有项目风格不一致，且会增加权限校验分散风险。

### 2) 数据模型
- `sector`：`id`,`level`,`parent_id`,`name_en`,`name_cn`,`wind_name`,`is_active`,`created_at`,`updated_at`。
- `coverage`：`id`,`ticker`,`english_full_name`,`chinese_short_name`,`traditional_chinese`,`sector_id`,`isin`,`reporting_currency`,`ads_conversion_factor`,`is_active`,`created_at`,`updated_at`。
- `coverage` 扩展字段：`country_of_domicile`,`is_duplicate`,`approved_by`,`approved_at`。
- `coverage_analyst`：`coverage_id`,`analyst_id`,`role`,`sort_order`，唯一约束 `(coverage_id, analyst_id)`。
- `template`：`id`,`name`,`report_type`,`file_type`,`file_path`,`version`,`is_active`,`created_at`,`updated_at`,`uploaded_by`。

关键约束：
- `sector.level=1` 时 `parent_id is null`；`level=2` 时 `parent_id` 必须引用 `level=1`。
- 同一 `(report_type, file_type, version)` 唯一。
- 同一 `(report_type, file_type)` 同时仅允许一个 `is_active=true`（部分唯一索引）。
- `coverage_analyst.role` 约束为 1..4。

### 2.1 数据库表设计（DDL 级）

#### `public.sector`
| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `level` | `smallint` | not null, check (`level in (1,2)`) |
| `parent_id` | `uuid` | FK -> `public.sector(id)` on delete restrict |
| `name_en` | `text` | not null |
| `name_cn` | `text` | null |
| `wind_name` | `text` | null |
| `is_active` | `boolean` | not null, default `true` |
| `created_at` | `timestamptz` | not null, default `now()` |
| `updated_at` | `timestamptz` | not null, default `now()` |

约束与索引：
- check：`level=1 -> parent_id is null`，`level=2 -> parent_id is not null`。
- 触发器校验：`level=2` 的 `parent_id` 必须指向 `level=1`，并阻断循环层级。
- 唯一约束：`(parent_id, lower(name_en))` 唯一（同级英文名不重复）。
- 索引：`idx_sector_level_parent(level, parent_id)`、`idx_sector_name_en(lower(name_en))`、`idx_sector_active(is_active)`。

#### `public.coverage`
| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `ticker` | `text` | not null |
| `english_full_name` | `text` | not null |
| `chinese_short_name` | `text` | null |
| `traditional_chinese` | `text` | null |
| `sector_id` | `uuid` | not null, FK -> `public.sector(id)` on delete restrict |
| `isin` | `text` | not null |
| `country_of_domicile` | `text` | not null |
| `reporting_currency` | `text` | null |
| `ads_conversion_factor` | `numeric(18,6)` | null, check (`ads_conversion_factor > 0`) |
| `is_duplicate` | `boolean` | not null, default `false` |
| `approved_by` | `uuid` | null, FK -> `auth.users(id)` on delete set null |
| `approved_at` | `timestamptz` | null |
| `is_active` | `boolean` | not null, default `true` |
| `created_at` | `timestamptz` | not null, default `now()` |
| `updated_at` | `timestamptz` | not null, default `now()` |

约束与索引：
- 唯一约束：`lower(ticker)` 唯一、`upper(isin)` 唯一。
- 索引：`idx_coverage_sector(sector_id)`、`idx_coverage_name(lower(english_full_name))`、`idx_coverage_updated_at_desc(updated_at desc)`。

#### `public.coverage_analyst`
| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `coverage_id` | `uuid` | not null, FK -> `public.coverage(id)` on delete cascade |
| `analyst_id` | `uuid` | not null, FK -> `public.analyst(id)` on delete restrict |
| `role` | `smallint` | not null, check (`role between 1 and 4`) |
| `sort_order` | `smallint` | not null, check (`sort_order between 1 and 4`) |
| `created_at` | `timestamptz` | not null, default `now()` |
| `updated_at` | `timestamptz` | not null, default `now()` |

约束与索引：
- 唯一约束：`(coverage_id, analyst_id)`。
- 唯一约束：`(coverage_id, sort_order)`（同一 coverage 的排序位不可重复）。
- 索引：`idx_cov_analyst_coverage(coverage_id)`、`idx_cov_analyst_analyst(analyst_id)`。
- 业务约束：同一 `coverage_id` 最多 4 条 analyst 关系（触发器或写入前检查）。

#### `public.template`
| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | not null |
| `report_type` | `text` | not null |
| `file_type` | `text` | not null, check (`file_type in ('word','excel')`) |
| `file_path` | `text` | not null |
| `version` | `integer` | not null, check (`version >= 1`) |
| `is_active` | `boolean` | not null, default `false` |
| `uploaded_by` | `uuid` | not null, FK -> `auth.users(id)` on delete restrict |
| `created_at` | `timestamptz` | not null, default `now()` |
| `updated_at` | `timestamptz` | not null, default `now()` |

约束与索引：
- 唯一约束：`(report_type, file_type, version)`。
- 部分唯一索引：`(report_type, file_type)` where `is_active=true`（同分组仅一个启用版本）。
- 索引：`idx_template_group(report_type, file_type)`、`idx_template_created_desc(created_at desc)`。

统一规则：
- 四张表都使用 `updated_at` 触发器（复用 `public.set_updated_at_utc()`）。
- RLS 策略按 proposal 权限矩阵落地：`authenticated` 可读；`coverage`/`coverage_analyst` 允许 `admin` 与 `analyst` 执行 INSERT，其余写操作仅 `admin`。

### 3) 权限与安全
- 功能层：`/coverage` 页面允许 Admin/Analyst 访问；Coverage 新增允许 Admin/Analyst，编辑/删除仅 Admin；`/sectors` 与 `/templates` 保持 Admin-only。
- 数据层：RLS 按 proposal 的表级权限矩阵实现（authenticated 可读；coverage/coverage_analyst insert: admin+analyst；其余写仅 Admin）。
- Storage：模板 bucket 权限按 proposal 的存储与权限约束实现。
- 上传流程：Server Action 生成路径并执行写入，避免客户端直接持有高权限凭据。
- 用户策略：保持 Analyst Info 与 Auth Users 解耦；“是否邮件确认”映射为用户邀请确认流程开关，仅 Admin 可操作。

### 4) 技术实现方案
- `web/app/*/page.tsx` 负责鉴权与初始数据装配。
- `web/features/*/repo/*.ts` 负责查询与事务处理。
- `web/features/*/actions.ts` 负责写入命令、权限校验、错误映射。
- `web/domain/schemas/*.ts` 提供 zod 校验与表单类型。
- `supabase/migrations/*` 完成表结构、索引、RLS、Storage policy。
- `web/features/users/actions.ts` 增补“是否邮件确认”参数的服务端处理逻辑。
- Coverage 表单：必填字段在 schema 层强校验（ticker/country_of_domicile/english_full_name/sector_id/isin/analyst）。
- Sector 选择器：实现“可搜索 + 两级缩进展示 + 固定高度滚动列表”交互。

### 5) 存储路径规范
- 采用 proposal 已定义的模板与报告文件路径规范，不在 design 中重复展开。

## Risks / Trade-offs

- [Sector 层级约束复杂] → 用 DB CHECK + 触发器双重校验，并在 Server Action 做前置校验。  
- [模板版本并发上传冲突] → 通过事务内计算 `version=max+1` 与唯一约束兜底。  
- [放开 Analyst 新增 Coverage 的越权风险] → 在应用层仅开放 create 动作，RLS 仅放开 INSERT，UPDATE/DELETE 继续由 Admin 独占。  
- [Storage 权限误配导致越权] → 先在测试环境执行白盒用例验证 read/write/delete 策略。

## Migration Plan

1. 新增迁移：创建/调整 `sector`、`coverage`、`coverage_analyst`、`template` 及索引约束。  
2. 新增迁移：配置 RLS policy 和模板 bucket policy。  
3. 部署应用代码与页面路由守卫。  
4. 回填最小种子数据（可选）：示例 sector、template。  
5. 回滚策略：回滚应用版本；DB 采用逆向迁移恢复新增对象。

## Open Questions

- 是否需要在本 change 就支持 template “软删除 + 恢复”？默认仅停用。  
- Coverage 的 `is_duplicate` 与审批字段是否本阶段纳入 UI？默认先不开放。  
- 模板下载是否需要记录审计日志（谁在何时下载）？默认下一阶段补充。
