## ADDED Requirements

### 需求:外部报告 Storage Bucket 必须存在
系统必须在 Supabase Storage 中创建名为 `external-reports` 的 bucket，用于存储外部报告的附件文件。

#### 场景:bucket 已创建
- **当** 系统完成初始化部署
- **那么** `external-reports` bucket 已存在，设置为 public 或配置适当访问策略

### 需求:附件文件路径规则
附件文件在 Storage 中的路径必须遵循统一规则。

#### 场景:路径格式
- **当** 系统存储附件文件时
- **那么** 路径格式为 `external-reports/{report_id}/{attachment_id}_{original_name}.{ext}`

#### 场景:路径冲突处理
- **当** 同一报告下存在重名附件文件
- **那么** 使用 `attachment_id` 作为前缀保证唯一性，`attachment_id` 为 UUID 全量，避免文件名冲突

### 需求:附件元信息持久化
每个附件的元信息必须存入 `report_attachments` 表。

#### 场景:元信息包含字段
- **当** 系统处理附件上传时
- **那么** 必须向 `report_attachments` 表写入以下字段：`id`（UUID）、`report_id`（FK）、`original_name`、`file_path`（Storage 路径）、`file_size`（字节）、`mime_type`、`created_at`

### 需求:报告分析师关联
`reports` 表与 `analyst` 表通过邮箱建立多对多关联。

#### 场景:分析师关联表字段
- **当** 系统存储外部报告的分析师信息时
- **那么** 创建 `report_analyst` 表，包含字段：`id`（UUID, PK）、`report_id`（FK -> `reports.id`）、`analyst_email`（citext, not null），并建立 `(report_id, analyst_email)` 唯一约束

#### 场景:关联到现有分析师
- **当** `analyst_email` 在 `analyst` 表中存在对应记录时
- **那么** 系统应同时建立与 `analyst.id` 的关联（通过 FK 或查询）
- **那么** 若邮箱不存在则仅记录 `analyst_email`，不报错

### 需求:报告联系人关联
`reports` 表与联系人通过邮箱建立多对多关联。

#### 场景:联系人关联表字段
- **当** 系统存储外部报告的联系人信息时
- **那么** 创建 `report_contact` 表，包含字段：`id`（UUID, PK）、`report_id`（FK -> `reports.id`）、`contact_email`（citext, not null）、`created_at`，并建立 `(report_id, contact_email)` 唯一约束

### 需求:附件访问策略
- **当** 用户或外部系统需要访问附件时
- **那么** 通过 Storage 签名 URL 或公开路径访问；写入权限仅限服务端 API 操作

### 需求:附件删除规则
- **当** 关联的报告被删除时
- **那么** Storage 中的附件文件应一并删除（通过数据库触发器或服务端逻辑实现）
