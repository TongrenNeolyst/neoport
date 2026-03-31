## 1. 数据库 Migration

- [x] 1.1 创建 `supabase/migrations/YYYYMMDDNNMM_create_reports_table.sql`，定义 `reports` 表，字段如下：
  - `id` (uuid, PK)
  - `external_id` (text, unique, not null) — 外部系统唯一标识
  - `title` (text, not null) — 报告标题
  - `report_type` (text, not null) — 报告类型（如 sector/company）
  - `ticker` (text, nullable) — 公司股票代码
  - `rating` (text, nullable) — 评级
  - `target_price` (numeric, nullable, > 0) — 目标价
  - `sector` (text, nullable) — 行业
  - `region` (text, nullable) — 地区
  - `report_language` (text, nullable) — 报告语言
  - `investment_thesis` (text, nullable) — 投资摘要
  - `analyst` (text, nullable) — 报告分析师名字（关联邮箱通过 report_analyst 表维护）
  - `contact_person` (text, nullable) — 报告联系人名字（关联邮箱通过 report_contact 表维护）
  - `published_at` (timestamptz, not null) — 报告发布时间
  - `created_at` / `updated_at` (timestamptz)
- [x] 1.2 创建 `supabase/migrations/YYYYMMDDNNMM_create_report_attachments_table.sql`，定义 `report_attachments` 表（字段：id, report_id FK, original_name, file_path, file_size, mime_type, created_at）
- [x] 1.3 创建 `supabase/migrations/YYYYMMDDNNMM_create_report_analyst_table.sql`，定义 `report_analyst` 表（字段：id, report_id FK -> reports.id, analyst_email citext not null），建立 `(report_id, analyst_email)` 唯一约束
- [x] 1.4 创建 `supabase/migrations/YYYYMMDDNNMM_create_report_contact_table.sql`，定义 `report_contact` 表（字段：id, report_id FK -> reports.id, contact_email citext not null, created_at），建立 `(report_id, contact_email)` 唯一约束
- [ ] 1.5 验证 migration 语法并在本地 Supabase 实例执行

## 2. Storage Bucket 配置

- [x] 2.1 在 Supabase Console 或 migration 中创建 `external-reports` Storage bucket
- [x] 2.2 配置 bucket 访问策略（public 或签名 URL 访问）
- [ ] 2.3 验证附件文件可成功上传到 Storage

## 3. API 接口实现

- [x] 3.1 在 web/src/routes/ 下创建外部报告接收接口 `POST /api/external/reports`
- [x] 3.2 实现 API Key 鉴权中间件，从 Header `X-API-Key` 读取并与环境变量校验
- [x] 3.3 实现 multipart/form-data 解析，提取报告字段和附件文件
- [x] 3.4 实现字段校验逻辑（必填字段、长度限制、日期格式）
- [x] 3.5 实现附件大小和数量限制（单文件≤50MB，附件≤20个）
- [x] 3.6 实现幂等处理：根据 `external_id` 查重，已存在则返回 200 + 已有报告 ID
- [x] 3.7 实现报告元信息写入 `reports` 表
- [x] 3.8 实现附件上传到 Storage 并将元信息写入 `report_attachments` 表
- [x] 3.9 实现事务一致性：Storage 上传失败时回滚数据库记录

## 4. 文档同步

- [x] 4.1 更新 `docs/DATA_MODEL.md`，添加 `reports` 和 `report_attachments` 表结构口径
- [x] 4.2 在数据实体总览表中新增两项

## 5. 测试验证

- [ ] 5.1 用有效 API Key 和完整数据测试接口（期望 201）
- [ ] 5.2 测试无效 API Key（期望 401）
- [ ] 5.3 测试必填字段缺失（期望 400）
- [ ] 5.4 测试 `external_id` 重复推送（期望 200，幂等）
- [ ] 5.5 测试单文件超限（期望 413）
- [ ] 5.6 测试附件数量超限（期望 413）
- [ ] 5.7 验证 Storage 中文件路径格式正确
