## Context

该 change 承接基础数据模块。`proposal.md` 已定义业务范围、全量权限矩阵、验收标准与约束；本文仅说明技术实现方案与关键权衡。

## Goals / Non-Goals

**Goals:**
- 在现有架构内实现 report 生命周期、审批流、状态历史与内容版本追踪的数据与服务端链路。
- 通过数据库约束与事务策略保证状态流转、版本写入与权限一致性。

**Non-Goals:**
- 不建设外部查看站点（neoreport）及其对接接口。
- 不做多人实时协作冲突合并。
- 不做批量审批与统计面板。
- 不做 Word 在线预览（仅下载）。

## Decisions

### 1) 设计基线
- 技术基线继承既有项目约定（详见 `docs/LOGIC.md`、`docs/UI.md` 与相关规范文档）。
- 采用 Server-first（Server Components + Server Actions + repo）。

备选方案：全部 client-side + RPC。  
未选原因：权限边界更难统一，且与现有项目范式不一致。

### 2) 数据模型
- `report`：主体信息 + 所有权 + 当前状态 + 当前版本号 + 发布快照。
- `report_version`：内容版本历史（仅追加，不更新/删除）。
- `report_analyst`：报告与作者关系（可由 owner 或 Admin 维护）。
- `report_status_log`：状态流转历史（仅追加，含动作版本号）。

关键字段约束：
- `report.owner_user_id`：`not null`，创建时写入当前用户，后续不可转移。
- `report.report_type`：枚举 `company|sector|company_flash|sector_flash|common`。
- `report.current_version_no`：与 `report_version.version_no` 对齐。
- `report.published_by`：`uuid`，FK -> `auth.users.id`，仅在 `published` 时写入发布人。
- `report.published_at`：`timestamptz`，仅在 `published` 时写入发布时间。
- `report_version`：`(report_id, version_no)` 唯一，`version_no` 从 1 递增。
- `report_status_log`：记录 `from_status`、`to_status`、`action_by`、`action_at`、`reason`、`version_no`。
- `report` 仅保留 `published_by/published_at` 两个发布快照字段，用于高频“已发布报告”查询；其余状态动作仍以 `report_status_log` 为准，避免双写漂移。
- 删除策略：不做物理删除（`report DELETE = ❌`）。

### 3) 状态机与版本策略
状态机：
- 允许：`draft -> submitted`、`submitted -> published`、`submitted -> rejected`、`rejected -> draft`。
- 禁止：跨级跳转与回写（如 `published -> draft`）。

状态与版本解耦：
- 内容变化（基本信息、文件、作者关系）写 `report_version`。
- 状态变化写 `report_status_log`，并记录动作发生时 `version_no`。

发布字段写入规则：
- `submitted -> published`：同步写入 `report.published_by = action_by`、`report.published_at = action_at`。
- 其余状态流转不更新发布字段。

“直接提交”策略：
- 前端可一键“直接提交”，后端分两步执行：
  1. 保存 draft（写 `report`/`report_version`）；
  2. 执行 submit（写 `report_status_log` 并更新状态）。
- 第二步失败时，保留 draft，并返回明确提示：已保存为 Draft，提交失败。

### 4) 权限与安全
应用层：
- Reports：
  - Admin：全量。
  - SA：只读 submitted/published/rejected。
  - Analyst：仅 owner。
- 审批：SA/Admin 可审批与退回。
- 文件上传：owner/Admin；文件下载：owner/Admin/SA（SA 仅已授权状态范围）。

数据层（RLS）：
- `report`、`report_version`、`report_analyst`、`report_status_log` 按 owner + role + status 可见性组合实现。
- `report_status_log` 仅追加，不允许 UPDATE/DELETE。
- `report` 禁止 DELETE。

### 5) 文件路径规范
- 根目录：`reports/{report_id}/`
- 文件名：`{report_id}_{version_no3}_{label}_{ts}.{ext}`
- `label`：`report` / `model`
- `version_no3`：3 位补零（`001`）
- `ts`：UTC 秒级时间戳（`YYYYMMDDTHHMMSSZ`）

### 6) 页面上传交互（拖拽）
- `Reports` 页面与 `Report Template` 页面均提供拖拽上传区域（dropzone）。
- 拖拽上传与点击上传共用同一后端链路：文件类型校验、命名规则、权限校验、落盘路径保持一致。
- 无拖拽能力的环境（或用户不使用拖拽）下，点击上传流程必须可用（功能等价兜底）。

## 技术实现方案

- `web/features/reports/repo/*.ts`：列表、详情、保存、提交、作者关系维护、版本读取。
- `web/features/report-review/repo/*.ts`：待审批查询、审批动作、退回动作。
- `web/features/reports/actions.ts`：create/save/submit/direct-submit 与 owner 校验。
- `web/features/report-review/actions.ts`：approve/reject/reopen-draft。
- `web/features/report-status-history/*`：状态历史读取（或并入 reports）。
- `web/features/reports/components/*`：在 report 编辑页集成拖拽上传交互（report/model）。
- `web/features/templates/components/*`：在 Report Template 页集成模板拖拽上传交互（word/excel）。
- `web/components/ui/*`：可复用 dropzone/upload 组件（如抽象后可跨页面复用）。
- `web/domain/schemas/report*.ts`：表单、状态机、动作参数校验。
- `supabase/migrations/*`：表结构、索引、RLS、触发器、约束。

## Risks / Trade-offs

- [submitted 可继续编辑] -> 提升效率，但审批动作基于“动作当时版本号”留痕，避免审计歧义。
- [状态与版本解耦] -> 模型更清晰，但需维护两条日志链（内容版本 + 状态历史）。
- [owner-only 业务边界] -> 权限简单明确，但协作能力受限（符合当前阶段目标）。
- [路径扁平命名] -> 降低目录复杂度，但必须依赖数据库元数据管理文件关联。

## Migration Plan

1. 创建 `report`、`report_version`、`report_analyst`、`report_status_log` 表与索引约束。  
2. 创建/更新 RLS policy（owner + role + status 可见性）与 storage policy。  
3. 实现 reports/report-review 页面与 server actions。  
4. 打通文件上传下载路径命名策略并联调。  
5. 回滚策略：应用版本回滚 + 逆向迁移撤销新增对象（不删除已生成业务数据，先冻结入口）。

## Open Questions

- 本阶段是否需要 report 状态操作的通知机制（站内消息/邮件）？默认不做。  
- 后续阶段是否扩展 SA 的写能力（例如草稿辅助编辑）？默认不做。  
- 后续是否引入全局状态历史检索页？默认不做。
