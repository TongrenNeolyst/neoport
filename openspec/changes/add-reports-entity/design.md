## 上下文

现有系统中已存在 `report` / `report_version` 表，用于管理内部报告的草稿→提交→发布工作流。现需要新增一个独立的报告存储机制，用于接收并存储来自外部系统推送的"已发布报告"。

外部报告由其他系统生成，系统仅负责接收、存储和展示，不参与报告创建流程。两者在数据模型、生命周期和使用场景上完全独立，不共享同一张表。

## 目标 / 非目标

**目标：**
- 新增 `reports` 表，存储外部报告基本数据
- 新增 `report_attachments` 表，存储每个外部报告的附件元信息
- 新增 `external-reports` Storage bucket，存放附件文件
- 新增 API 接口，接收外部系统推送的报告数据和附件
- 接口鉴权采用 API Key 机制

**非目标：**
- 不修改现有的 `report` / `report_version` 表和工作流
- 不支持外部报告的编辑、提交、审批等生命周期管理（仅存储和展示）
- 不复用现有的模板机制（外部报告不需要模板）

## 决策

### 1. 新建独立表而非复用 `report` 表

**决策**：外部报告使用独立的 `reports` 表，不复用现有的 `report` 表。

**理由**：现有 `report` 表与提交审批工作流强耦合，字段（如 `owner_user_id`、`status`、`current_version_no`）对外部报告无意义。独立表避免语义污染和复杂的状态逻辑。

### 2. 附件存储：元信息入表 + 文件存 Storage

**决策**：附件元信息（文件名、大小、MIME 类型等）存入 `report_attachments` 表，物理文件存入 Supabase Storage。

**理由**：附件元信息需要可查询、可关联报告；大文件不适合存数据库。复用现有 Storage 基础设施，路径规则独立于内部报告。

### 3. Storage bucket 命名

**决策**：bucket 命名为 `external-reports`。

**理由**：与现有的 `reports` bucket（内部报告）明确区分，避免路径冲突。

### 4. Storage 路径规则

**决策**：`external-reports/{report_id}/{attachment_id}_{original_name}.{ext}`

**理由**：`report_id` 作为顶层目录便于按报告组织；`attachment_id` 前缀保证同一报告下多附件文件名唯一性。

### 5. API 鉴权

**决策**：采用 API Key 机制，通过 HTTP Header `X-API-Key` 传递。

**理由**：外部系统推送场景下，API Key 优于 OAuth/OIDC，集成成本低。Key 存储在环境变量中，不硬编码。

### 6. API 请求方式：multipart/form-data

**决策**：基本数据字段和附件文件通过 `multipart/form-data` 一次性提交。

**理由**：附件文件无法与 JSON 字段共用单一请求体，multipart 是标准做法，便于外部系统对接。

### 7. 数据库主键策略

**决策**：`reports.id` 和 `report_attachments.id` 均采用 `uuid`。

**理由**：与现有数据模型（`report` 等）保持一致，UUID 无需数据库序列，不依赖中心化发号器。

## 风险 / 权衡

| 风险 | 缓解措施 |
|------|---------|
| 外部系统推送重复报告（如网络重试导致） | 在 `reports` 表对外部报告 ID 建立唯一约束，防止重复写入；接口返回幂等响应 |
| 大文件附件撑爆 Storage quota | 在接口层对单文件大小和总附件数量做校验（建议单文件≤50MB，附件≤20个/报告） |
| API Key 泄露 | Key 仅存储在服务端环境变量；日志中脱敏打印；定期轮换机制（留待后续实现） |
| 外部报告数据格式不兼容 | 接口层做字段校验，缺失必填字段返回 400 错误并附带具体字段名 |
| 附件存储失败导致报告数据不一致 | 采用数据库事务：附件元信息写入和 Storage 上传在同一事务边界内（或先写元信息，Storage 上传失败时回滚） |

## 迁移计划

1. **Migration**：新增 `reports` 和 `report_attachments` 表，参考现有 migration 规范放在 `supabase/migrations/` 下
2. **Storage**：在 Supabase Console 或 migration 中创建 `external-reports` bucket
3. **API**：在 web/src/routes/ 或独立 API 模块中实现接收接口
4. **文档**：同步更新 `docs/DATA_MODEL.md`，添加新表结构口径
5. **回滚**：如有问题，删除 migration 文件并回退代码即可；已有数据需手动清理

## 开放问题

1. 外部报告是否需要在前端页面展示？展示页面的权限如何控制（所有人可看，还是登录用户）？
2. 外部报告是否需要与现有的 `coverage` 表关联（如按 ticker 对应）？
3. API Key 如何管理：存储在哪里、是否支持多 key、是否有 key 有效期？
4. 外部系统推送时，附件是否可以分片上传（大文件场景）？
