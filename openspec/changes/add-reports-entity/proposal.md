## 为什么

系统需要接收并存储来自外部系统推送的已发布报告（已发布报告，下称"外部报告"）。与现有的 `report` 表（内部报告草稿→提交→发布工作流）不同，外部报告由其他系统生成并通过接口推送，系统仅负责存储和展示，两者用途独立，不混用同一张表。

## 变更内容

1. **新增 `reports` 表**：用于存储外部系统推送的已发布报告，与内部报告管理表（`report` / `report_version`）完全解耦。
2. **新增 `report_attachments` 表**：存储每个外部报告的附件文件元信息，支持多附件。
3. **新增 Supabase Storage bucket**：用于存储外部报告的附件文件。
4. **新增外部报告接收 API**：外部系统通过接口推送报告基本数据和附件。

## 功能 (Capabilities)

### 新增功能

- `external-report-api`: 外部报告接收接口，支持接收报告基本数据和附件文件，接口鉴权采用约定的 API Key 机制。
- `external-report-storage`: 外部报告附件存储模型，基于 Supabase Storage，定义 bucket、路径规则和访问策略。

### 修改功能

（无）

## 影响

- **新增表**：`reports`、`report_attachments`（两个模块各自的 SQL migration）
- **Storage**：新增 `external-reports` bucket
- **API**：新增 `/api/external/reports` 接收接口（预计 POST 方式）
- **无现有表修改**：不影响现有的 `report` / `report_version` 工作流
- **docs 同步**：数据模型文档（`docs/DATA_MODEL.md`）需同步新增表结构口径
