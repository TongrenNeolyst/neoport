## Why

在基础数据（Coverage/Sector/Template）可用后，系统需要进入核心业务阶段：report 的创建、编辑、版本管理与审批发布闭环。如果缺少该能力，前序数据模块无法形成业务价值，也无法支撑 SA 的审批职责。

## What Changes

## 一、目标与范围

### 1.1 目标
- 建设 Reports 管理页面：创建、编辑、查看、提交、版本历史。
- 建设 Report Review 审批页面：SA/Admin 审批通过或拒绝。
- 落地 report 状态机：`draft -> submitted -> published/rejected`，支持 `rejected -> draft`。
- 落地内容版本记录与状态历史记录（两者解耦）。

### 1.2 范围边界
- 本 change 不包含外部发布站点（neoreport）展示能力。
- 不做移动端专项适配，仅保证桌面与常规响应式可用。
- 不引入实时协作编辑（同一报告多人同时编辑冲突处理不做 Realtime）。
- 不做批量审批。
- 不做统计面板（待审数/当日处理数不在本 change）。

## 二、需求

### 2.1 Reports 管理
- 列表展示：title、report_type、status、owner、updated_at。
- 最小必填：`title`、`report_type`（`owner_user_id` 自动取当前登录用户）。
- 文件上传非必填，可为空。
- `draft` 与 `submitted` 允许 owner 继续编辑；`published`/`rejected` 禁止直接编辑。
- `report` 主表新增发布快照字段：`published_by`（发布人）与 `published_at`（发布时间），用于已发布报告查询。
- Web 端 `Reports` 页面支持拖拽上传（drag-and-drop）报告文件，仍保留点击选择文件作为兜底入口。
- 支持“直接提交”快捷操作：前端一键触发，后端按两步执行（先保存 draft，再提交 submitted）。
- 若“直接提交”第二步失败，系统必须提示“已保存为 Draft，提交失败”，并允许重试提交。

### 2.2 版本管理（内容版本）
- 每次保存内容（基本信息、文件、作者关系）创建 `report_version` 新记录。
- 版本号规则：单报告内 `version_no` 从 1 递增，`(report_id, version_no)` 唯一。
- 版本快照 `snapshot_json` 存可读字段（如 owner_name、analyst_names），不以 ID 作为主要展示字段。
- 状态变化不强制新增 `report_version`。

### 2.3 状态历史（流程历史）
- 系统记录独立状态日志（`report_status_log`），用于展示“报告状态历史”。
- 状态日志字段至少包含：`from_status`、`to_status`、`action_by`、`action_at`、`reason`、`version_no`。
- `rejected -> draft` 时保留历史拒绝理由，不覆盖旧记录。
- 审批页展示当前报告的状态历史（非全局历史列表）。

### 2.4 审批管理（Report Review）
- SA/Admin 可查看并处理 `submitted` 报告。
- SA 默认筛选状态为 `submitted`；Admin 默认也为 `submitted`；不记忆上次筛选。
- 审批通过：状态改为 `published`，并同步写入 `published_by` 与 `published_at`。
- 审批拒绝：状态改为 `rejected`，必须填写 `reason`。
- SA/Admin 可执行 `rejected -> draft` 退回。
- 审批详情仅提供文件下载，不提供 Word 在线预览。

### 2.5 文件路径与命名
- 文件存储目录：`reports/{report_id}/`
- 文件命名规范：`{report_id}_{version_no(3位补零)}_{label}_{ts}.{ext}`
- `label`：`report` 或 `model`
- `ts`：UTC 秒级时间戳（`YYYYMMDDTHHMMSSZ`）

### 2.6 Web 上传交互（拖拽）
- `Reports` 页面支持将文件拖拽到上传区域完成选择/上传流程。
- `Report Template` 页面（`/templates`）支持将 Word/Excel 模板拖拽到上传区域完成上传流程。
- 拖拽上传不改变现有权限边界：Report 文件仍仅 owner/Admin 可上传；Template 文件仍仅 Admin 可上传。

## 三、权限模型

### 3.1 角色功能权限矩阵

以下为当前阶段全量功能权限矩阵（含已实现模块与本 change 新增模块）：

| 功能模块 | 功能能力 | Admin | SA | Analyst |
|---------|---------|-------|----|---------|
| **认证与会话** | - | - | - | - |
| 认证与会话 | 登录/登出 | ✅ | ✅ | ✅ |
| 认证与会话 | 忘记密码（邮件重置） | ✅ | ✅ | ✅ |
| **已有管理模块** | - | - | - | - |
| Users 管理 | 访问/列表/创建/编辑/角色/禁用/改密/删除 | ✅ | ❌ | ❌ |
| Region 管理 | 访问/列表/创建/编辑/删除 | ✅ | ❌ | ❌ |
| Analyst Info 管理 | 访问/列表/创建/编辑/删除 | ✅ | ❌ | ❌ |
| **基础数据模块（前置 change）** | - | - | - | - |
| Coverage 管理 | 访问/列表搜索 | ✅ | ❌ | ✅ |
| Coverage 管理 | 新增 | ✅ | ❌ | ✅ |
| Coverage 管理 | 编辑/删除 | ✅ | ❌ | ❌ |
| Sector 管理 | 访问/列表/创建/编辑/删除 | ✅ | ❌ | ❌ |
| Template 管理 | 访问/上传/启停版本 | ✅ | ❌ | ❌ |
| **本 change 新增模块** | - | - | - | - |
| Reports | 访问列表 | ✅（全部状态） | ✅（仅 submitted/published/rejected） | ✅（仅 owner） |
| Reports | 创建报告 | ✅（为自己） | ❌ | ✅（为自己） |
| Reports | 编辑 draft/submitted | ✅（全部） | ❌ | ✅（仅 owner） |
| Reports | 提交审核（`draft->submitted`） | ✅（全部） | ❌ | ✅（仅 owner） |
| Reports | 维护作者关系 | ✅（全部） | ❌ | ✅（仅 owner） |
| Reports | 查看版本历史 | ✅（全部） | ✅（仅 submitted/published/rejected） | ✅（仅 owner） |
| Reports 文件 | 下载 | ✅（全部） | ✅（submitted/published/rejected） | ✅（仅 owner） |
| Reports 文件 | 上传/替换 | ✅（全部） | ❌ | ✅（仅 owner） |
| Report Review | 访问审批工作台 | ✅ | ✅ | ❌ |
| Report Review | 审批通过/拒绝 | ✅ | ✅ | ❌ |
| Report Review | 退回 draft（`rejected->draft`） | ✅ | ✅ | ❌ |
| **导航与消费侧读取** | - | - | - | - |
| Desktop 导航 | Reports 卡片显示 | ✅ | ✅ | ✅ |
| Desktop 导航 | Report Review 卡片显示 | ✅ | ✅ | ❌ |

### 3.2 角色数据表权限矩阵（RLS）

以下为当前阶段全量数据权限矩阵（含已实现表、前置 change 表与本 change 新增表）：

| 数据表 | SELECT | INSERT | UPDATE | DELETE | 说明 |
|-------|--------|--------|--------|--------|------|
| **已有表** | - | - | - | - | - |
| `auth.users` | Admin（通过 Admin API） | 仅 Admin | 仅 Admin | 仅 Admin | Auth 用户管理通过 Admin API，不走业务表 RLS |
| `region` | 所有已认证用户 | 仅 Admin | 仅 Admin | 仅 Admin | 已有基础字典表 |
| `analyst` | 所有已认证用户 | 仅 Admin | 仅 Admin | 仅 Admin | 业务分析师信息，保持与 auth.users 解耦 |
| **基础数据模块（前置 change）** | - | - | - | - | - |
| `coverage` | 所有已认证用户 | Admin/Analyst | 仅 Admin | 仅 Admin | 前置 change 已确定：Analyst 可新增 |
| `coverage_analyst` | 所有已认证用户 | Admin/Analyst | 仅 Admin | 仅 Admin | 前置 change 已确定：Analyst 可新增 |
| `sector` | 所有已认证用户 | 仅 Admin | 仅 Admin | 仅 Admin | 两级行业分类 |
| `template` | 所有已认证用户 | 仅 Admin | 仅 Admin | 仅 Admin | 模板元数据 |
| **本 change 新增表** | - | - | - | - | - |
| `report` | Admin 全部；SA 仅 submitted/published/rejected；Analyst 仅 owner | Admin/Analyst | Admin；Analyst 仅 owner 且 `draft/submitted` | ❌ | owner 固定，不做所有权转移，不做物理删除 |
| `report_version` | Admin 全部；SA 仅 submitted/published/rejected；Analyst 仅 owner | Admin/Analyst | ❌ | ❌ | 内容版本，仅追加 |
| `report_analyst` | Admin 全部；SA 仅 submitted/published/rejected；Analyst 仅 owner | Admin/Analyst | Admin；Analyst 仅 owner | Admin；Analyst 仅 owner | 作者关系可由 owner 维护 |
| `report_status_log` | Admin 全部；SA 仅 submitted/published/rejected；Analyst 仅 owner | owner/Admin（submit）；SA/Admin（审批/退回） | ❌ | ❌ | 状态历史，仅追加 |
| **存储层** | - | - | - | - | - |
| `storage.objects`（reports bucket） | owner/Admin/SA（SA 仅 submitted/published/rejected） | owner/Admin | owner/Admin | owner/Admin | 文件读写与业务权限一致 |

## 四、验收标准

- [ ] Analyst 可创建并提交自己的报告。
- [ ] Admin 可创建自己的报告并提交。
- [ ] SA 无法创建/编辑报告，但可审批 submitted 报告。
- [ ] `submitted` 状态下 owner 仍可编辑，且不自动回退状态。
- [ ] report 状态机按规则流转，非法流转被阻断。
- [ ] `submitted -> published` 时写入 `published_by` 与 `published_at`，用于已发布报告查询。
- [ ] 每次保存内容都会新增 `report_version` 记录。
- [ ] 系统保留“报告状态历史”，且日志含 `version_no`。
- [ ] “直接提交”失败时，系统提示“已保存为 Draft，提交失败”。
- [ ] 文件路径与命名符合 `{report_id}_{version_no3}_{label}_{ts}.{ext}` 规范。
- [ ] Reports 页面与 Report Template 页面均支持拖拽上传，并保留点击上传兜底能力。
- [ ] RLS 生效：Analyst 不能读取/修改非 owner 报告；SA 仅可见 `submitted/published/rejected`。

## 五、设计约束与规范

- owner 规则：谁创建归谁，`owner_user_id` 固定且不可转移。
- 文件上传/替换：仅 owner 或 Admin。
- 文件下载：owner/Admin/SA（SA 仅可见状态范围）。
- 状态与版本解耦：状态变化写 `report_status_log`；内容变化写 `report_version`。
- 发布快照字段：仅 `submitted -> published` 时更新 `published_by/published_at`；其他状态流转不改动该快照字段。
- Web 上传交互：拖拽上传仅作为交互增强，不改变文件校验、命名、落盘与权限规则。

## Capabilities

### New Capabilities
- `report-management`: 报告创建、编辑、提交、状态管理。
- `report-versioning`: 报告内容版本与 Word/Excel 文件版本追踪。
- `report-status-history`: 报告状态历史记录与展示。
- `report-review`: SA/Admin 审批工作台与审批动作。

### Modified Capabilities
- `role-control`: 扩展 report/review 场景的角色判定与 owner 模型。
- `desktop-nav`: 新增 Reports / Report Review 导航入口与可见性规则。
- `template-file-management`: 模板上传新增拖拽交互（Report Template 页面）。

## Impact

- Affected code:
  - `web/app/reports/*`, `web/app/report-review/*`
  - `web/app/templates/*`
  - `web/features/reports/*`, `web/features/report-review/*`
  - `web/features/templates/*`
  - `web/features/report-status-history/*`（或并入 reports）
- Database:
  - `report`、`report_version`、`report_analyst`、`report_status_log` 表与状态流转约束
  - RLS policy（按角色 + owner + 状态可见性）
- Storage:
  - reports 文件 bucket 与命名策略
- Integration:
  - 读取 Coverage/Sector/Template 作为 report 创建依赖
- Testing:
  - E2E 覆盖 report 生命周期、owner 权限矩阵、审批流、状态历史
