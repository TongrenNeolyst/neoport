# Data Model (Logical)

本文件定义逻辑数据模型（表结构口径、关键约束、RLS 矩阵、Storage 命名）。

说明：
- 本文件是“业务可读模型”。
- `supabase/migrations/*.sql` 是“执行真相源”。
- 若二者冲突，以迁移 SQL 为准，并同步修正文档。

## 1. 建模约定

- 主键：默认 `uuid`。
- 通用审计字段：`created_at`, `updated_at`（`timestamptz`）。
- 关键操作日志：采用 append-only 表，不允许 UPDATE/DELETE。
- 约束优先级：DB 约束（PK/FK/UNIQUE/CHECK） > 应用层校验。
- 权限原则：应用层校验 + RLS 双层一致。

## 2. 数据实体总览

| 模块 | 表 | 状态 |
|------|----|------|
| 认证用户 | `auth.users` | 已上线（Supabase托管） |
| 区域 | `region` | 已上线 |
| 分析师信息 | `analyst` | 已上线 |
| 行业分类 | `sector` | 已实现（change 已归档） |
| 公司覆盖 | `coverage` | 已实现（change 已归档） |
| 覆盖-分析师关系 | `coverage_analyst` | 已实现（change 已归档） |
| 报告模板 | `template` | 已实现（change 已归档） |
| 报告主表 | `report` | 已实现（change 已归档） |
| 报告内容版本 | `report_version` | 已实现（change 已归档） |
| 报告作者关系 | `report_analyst` | 已实现（change 已归档） |
| 报告状态历史 | `report_status_log` | 已实现（change 已归档） |

## 3. 表结构口径

### 3.1 `region`（已上线）

关键字段：
- `id` (uuid, PK)
- `name` (text, unique)
- `code` (text, unique)
- `created_at` / `updated_at`

关键约束：
- `name` 唯一
- `code` 唯一
- 初始值域基线建议包含：China、Hong Kong、Japan、Taiwan、Korea、India、Macau、US（可扩展）

### 3.2 `analyst`（已上线）

关键字段：
- `id` (uuid, PK)
- `full_name` (text, not null)
- `chinese_name` (text, nullable)
- `email` (citext, unique, not null)
- `region_id` (uuid, FK -> `region.id`, `on delete set null`)
- `suffix` (text, nullable)
- `sfc` (text, nullable)
- `is_active` (boolean)
- `created_at` / `updated_at`

关键约束：
- `email` 唯一
- Analyst 业务信息与 `auth.users` 解耦

### 3.3 `sector`（已归档）

关键字段：
- `id` (uuid, PK)
- `level` (smallint, 1/2)
- `parent_id` (uuid, FK -> `sector.id`)
- `name_en`, `name_cn`, `wind_name`
- `is_active`
- `created_at` / `updated_at`

关键约束：
- 仅允许两级结构
- `level=1` 必须无父节点
- `level=2` 必须挂载 `level=1` 节点
- 禁止循环层级

### 3.4 `coverage`（已归档）

关键字段：
- `id` (uuid, PK)
- `ticker` (text, not null)
- `english_full_name` (text, not null)
- `chinese_short_name`, `traditional_chinese`
- `sector_id` (uuid, FK -> `sector.id`)
- `isin` (text, not null)
- `country_of_domicile` (text, not null)
- `reporting_currency`
- `ads_conversion_factor`
- `is_duplicate`, `is_active`
- `approved_by`, `approved_at`
- `created_at` / `updated_at`

关键约束：
- `ticker` 唯一（标准化比较）
- `isin` 唯一（标准化比较）

### 3.5 `coverage_analyst`（已归档）

关键字段：
- `id` (uuid, PK)
- `coverage_id` (uuid, FK -> `coverage.id`)
- `analyst_id` (uuid, FK -> `analyst.id`)
- `role` (smallint, 1..4)
- `sort_order` (smallint, 1..4)
- `created_at` / `updated_at`

关键约束：
- `(coverage_id, analyst_id)` 唯一
- `(coverage_id, sort_order)` 唯一
- 每个 coverage 最多 4 位 analyst

### 3.6 `template`（已归档）

关键字段：
- `id` (uuid, PK)
- `name` (text)
- `report_type` (text)
- `file_type` (`report` / `model`)
- `file_path` (text)
- `version` (integer, >=1)
- `is_active` (boolean)
- `uploaded_by` (uuid, FK -> `auth.users.id`, nullable for placeholder init)
- `created_at` / `updated_at`

关键约束：
- `(report_type, file_type, version)` 唯一
- 同一 `(report_type, file_type)` 仅一个 `is_active=true`
- `report_type` 为 Report 创建页下拉事实源（`distinct report_type`）
- 系统初始化至少包含：`company`、`sector`、`company_flash`、`sector_flash`、`common`
- 初始化占位模板允许 `file_path=''` 且 `is_active=false`（仅注册类型，不可用于提交）

### 3.7 `report`（已归档）

关键字段：
- `id` (uuid, PK)
- `owner_user_id` (uuid, FK -> `auth.users.id`, not null)
- `title` (text, not null)
- `report_type` (text, not null; 合法值由 `template.report_type` 事实源驱动)
- `ticker` (text, nullable)
- `rating` (text, nullable)
- `target_price` (numeric, nullable, > 0)
- `region_id` (uuid, FK -> `region.id`, nullable)
- `report_language` (`zh|en`, nullable)
- `contact_person_id` (uuid, FK -> `auth.users.id`, nullable) - 联系人
- `investment_thesis` (text, nullable)
- `certificate_confirmed` (boolean, not null, default false)
- `status` (`draft|submitted|published|rejected`)
- `current_version_no` (integer)
- `published_by` (uuid, FK -> `auth.users.id`, nullable)
- `published_at` (timestamptz, nullable)
- `coverage_id` / `sector_id`（允许空，后续补）
- `created_at` / `updated_at`

关键约束：
- owner 一经创建不可转移
- 报告不做物理删除（`DELETE` 关闭）
- `submitted` 状态允许 owner 继续编辑
- 仅 `submitted -> published` 时更新发布快照（`published_by`/`published_at`），其余状态流转不改动
- 提交门禁在服务端校验：字段矩阵必填、文件必填、模板有效性、Coverage 关联、Certificate 勾选

### 3.8 `report_version`（已归档）

关键字段：
- `id` (uuid, PK)
- `report_id` (uuid, FK -> `report.id`)
- `version_no` (integer, per report increment)
- `snapshot_json` (jsonb, 可读字段为主)
- `word_file_path` (nullable)
- `model_file_path` (nullable)
- `changed_by` (uuid, FK -> `auth.users.id`)
- `changed_at` (timestamptz)

关键约束：
- `(report_id, version_no)` 唯一
- append-only（禁止 update/delete）

### 3.9 `report_analyst`（已归档）

关键字段：
- `id` (uuid, PK)
- `report_id` (uuid, FK -> `report.id`)
- `analyst_id` (uuid, FK -> `analyst.id`)
- `role` / `sort_order`
- `created_at` / `updated_at`

关键约束：
- 维护作者关系
- owner 可维护自己报告的作者关系；Admin 可全局维护

### 3.10 `report_status_log`（已归档）

关键字段：
- `id` (uuid, PK)
- `report_id` (uuid, FK -> `report.id`)
- `from_status`, `to_status`
- `action_by` (uuid, FK -> `auth.users.id`)
- `action_by_name` (text, nullable)
- `action_at` (timestamptz)
- `reason` (reject 时必填，业务语义为 Note)
- `version_no` (动作发生时对应版本号)

关键约束：
- append-only（禁止 update/delete）
- 记录完整状态流转链

## 4. 状态机口径（report）

允许流转：
- `draft -> submitted`
- `submitted -> published`
- `submitted -> rejected`
- `rejected -> draft`

禁止流转：
- 任意跨级跳转与逆向非法回写（如 `published -> draft`）

## 5. RLS 矩阵（目标态）

说明：以下为业务目标口径；实现需在 migration 中严格落地。

| 表 | Admin | SA | Analyst |
|----|-------|----|---------|
| `region` | R/W | R | R |
| `analyst` | R/W | R | R |
| `sector` | R/W | R | R |
| `coverage` | R/W | R | R + INSERT |
| `coverage_analyst` | R/W | R | R + INSERT |
| `template` | R/W | R | R |
| `report` | 全量 R/W（无 DELETE） | R（仅 submitted/published/rejected） | R/W（仅 owner；状态限 `draft/submitted`） |
| `report_version` | R + INSERT | R（仅 submitted/published/rejected） | R + INSERT（仅 owner） |
| `report_analyst` | 全量 R/W | R（仅 submitted/published/rejected） | R/W（仅 owner） |
| `report_status_log` | R + INSERT | R + INSERT（审批与退回） | R + INSERT（仅 owner 执行 submit） |

注：`storage.objects` 不在本表内，见下一节。

## 6. Storage 模型与命名

### 6.1 模板文件
- bucket：模板专用 bucket
- 路径：`templates/{template_id}/{version}/...`
- 读取：所有已认证用户（受路径约束）
- 写入（上传/替换/删除）：仅 Admin

### 6.2 报告文件
- bucket：reports bucket
- 目录：`reports/{report_id}/`
- 文件名：`{report_id}_{version_no3}_{label}_{ts}.{ext}`
- `label`：`report` / `model`
- `ts`：UTC 秒级（`YYYYMMDDTHHMMSSZ`）

### 6.3 报告文件权限
- 读取：owner / Admin / SA（SA 仅 `submitted|published|rejected` 范围）
- 写入（上传/替换/删除）：owner / Admin

## 7. 与迁移 SQL 的同步规则

- 每次新增/修改表结构或 RLS，必须同步更新：
  1. `supabase/migrations/*.sql`
  2. `docs/DATA_MODEL.md`
  3. 如涉及长期约束，再更新 `docs/DECISIONS.md`
