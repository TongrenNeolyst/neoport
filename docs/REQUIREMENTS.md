# Requirements (Project-Wide)

本文件定义项目级业务需求（WHAT）。
不承载代码分层、数据库字段细节、迁移命令等实现内容。

## 1. 目标与范围

### 1.1 目标
- 建立可演进的研究报告管理系统：从认证与基础数据，到报告创建、版本、审批闭环。
- 用统一 RBAC 与验收口径保障后续变更不漂移。

### 1.2 已上线能力（当前基线）
- 认证闭环：登录、登出、忘记密码、统一认证回调。
- Desktop：登录后默认落地页 `/desktop`，作为 Launcher。
- Users 管理（Admin-only）：列表/搜索/分页、邀请创建、编辑信息、改角色、禁用/启用、管理员改密、删除。
- Region 管理（Admin-only）：列表/搜索/分页、创建、编辑、删除。
- Analyst Info 管理（Admin-only）：列表/搜索/分页、创建、编辑、删除。
- Coverage / Sector / Template 管理（含权限与路由守卫）。

### 1.3 已实现能力（本次归档）
- Report 管理与审批：owner 模型、版本管理、状态历史、审批流。

### 1.4 非目标（当前阶段）
- 外部发布站点（neoreport）。
- 实时协作编辑（Realtime）。
- 批量审批与统计面板。

## 2. 角色与权限（业务层）

角色：
- `admin`：系统管理员。
- `sa`：审批角色。
- `analyst`：分析师角色。

角色事实源：
- 统一遵循 `docs/DECISIONS.md` 的 `D-003`（角色事实源）。

## 3. 需求分组

### 3.1 认证与会话
- 系统 MUST 提供登录、登出、忘记密码。
- 系统 MUST 提供统一认证回调入口。
- 未登录访问受保护页面 MUST 跳转 `/login`。
- 无权限访问管理页面 MUST 进入 `/403`（文案包含 `No permission`）。

### 3.2 Desktop 导航契约
- 契约长期约束遵循 `docs/DECISIONS.md` 的 `D-005`。
- `/desktop` MUST 为登录后默认落地页。
- Desktop 功能卡片 MUST 在新标签页打开。
- 功能页 MUST NOT 提供“返回 Desktop”主导航入口。
- Desktop `Reports` 分组 MUST 保留独立 `Analyst Submit` 入口（原 `Add Report`），且排序为分组第一项。
- Desktop `Analyst Submit` MUST 仅对 Admin/Analyst 可见（SA 不可见），并在新标签打开 `/reports/new`。

### 3.3 Users 管理（Admin-only）
- MUST 支持列表、搜索、分页（固定 12 条/页）。
- MUST 支持邀请制创建（Invite-only）。
- MUST 支持创建用户时配置“是否邮件确认”开关。
- MUST 支持角色调整、启用/禁用、管理员改密、删除用户。
- 账号状态 MUST 遵循 `docs/DECISIONS.md` 的 `D-004`（ban/unban 单机制）。

### 3.4 Region 与 Analyst Info（Admin-only）
- Region：MUST 支持列表、搜索、分页（固定 15 条/页）、创建、编辑、删除。
- Analyst Info：MUST 支持列表、搜索、分页（固定 15 条/页）、创建、编辑、删除。
- Analyst 信息与认证账号 MUST 保持解耦（不自动建/删账号）。
- Region 初始值域基线 MUST 至少包含：China、Hong Kong、Japan、Taiwan、Korea、India、Macau、US（允许后续扩展）。

### 3.5 Coverage / Sector / Template（已归档）
- Coverage：
  - MUST 支持列表、搜索、新增、编辑、删除。
  - Coverage 表单中的 `sector` 与 `analyst` MUST 从有效列表中选择（不允许自由文本/非法 ID）。
  - MUST 支持最多 4 位 analyst 排序维护。
  - Coverage 中的 analyst MUST 唯一（同一 coverage 不可重复选择同一 analyst）。
  - Analyst MUST 可新增 Coverage；编辑/删除仅 Admin。
- Sector：
  - MUST 支持两级结构管理。
  - MUST 支持层级搜索与选择。
- Template：
  - MUST 支持 Word/Excel 模板管理、版本递增、启用版本切换。
  - Template 管理页 MUST 支持拖拽上传，并保留点击上传作为等价兜底。

### 3.6 Report 管理与审批（已实现）
- 报告 owner 模型：谁创建归谁（owner 不可转移）。
- `draft` 与 `submitted`：owner 可继续编辑；`published/rejected` 禁止直接编辑。
- 报告创建 MUST 使用独立路由 `/reports/new`，不再使用弹窗承载完整创建流程。
- `Analyst Revise`（原 Reports）列表页 Add 与 Desktop `Analyst Submit` MUST 进入同一创建路由 `/reports/new`。
- 系统 MUST 支持“直接提交”快捷操作（后端分两步：先保存 draft，再提交）。
- 直接提交第二步失败 MUST 提示：`已保存为 Draft，提交失败`。
- 提交前 MUST 通过字段矩阵校验（按 report type 必填）。
- `Report Type` MUST 来自 `template.report_type` 去重结果，且提交时必须匹配至少一个有效模板（`is_active=true` 且有文件路径）。
- `Region` / `Sector` MUST 来自对应表有效记录（`region` / `sector`），服务端必须二次校验。
- 所有报告类型提交时 MUST 有 Report Word 文件；`company` 类型提交时 MUST 有 Model 文件。
- `company` / `company_flash` 提交时 MUST 满足 Coverage 关联语义（Ticker + Analyst 关系存在）。
- `Certificate` MUST 以 checkbox 确认；未勾选 MUST 阻断提交；页面 MUST 展示 6 条英文条款原文。
- Reports 创建/编辑页 MUST 支持 Report/Model 文件拖拽上传，并保留点击上传作为等价兜底。
- 审批：SA/Admin 可审批通过、拒绝、`rejected -> draft`。
- Reject MUST 要求填写 Note；无 Note MUST 阻断状态流转。
- 审批页面仅提供文件下载，不做 Word 在线预览。
- 报告列表默认筛选：SA/Admin 默认为 `submitted`（不记忆上次筛选）。
- SA 可见报告范围：`submitted/published/rejected`；不可见他人 `draft`。
- 审批通过（`submitted -> published`）MUST 同步写入 `published_by` 与 `published_at`；其他状态流转 MUST NOT 修改发布快照字段。

#### 3.6.1 报告字段矩阵（提交态必填）

| 字段 | company | sector | company_flash | sector_flash | common |
|---|:---:|:---:|:---:|:---:|:---:|
| Ticker | ✅ |  | ✅ |  |  |
| Rating | ✅ |  |  |  |  |
| Target price | ✅ |  |  |  |  |
| Region |  | ✅ |  | ✅ | ✅ |
| Sector |  | ✅ |  | ✅ |  |
| Report language（`zh/en`） | ✅ | ✅ | ✅ | ✅ | ✅ |
| Report title | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analyst（可多选） | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contact Person | ✅ | ✅ | ✅ | ✅ | ✅ |
| Investment thesis | ✅ | ✅ | ✅ | ✅ | ✅ |
| Certificate（checkbox） | ✅ | ✅ | ✅ | ✅ | ✅ |

补充规则：
- `company` / `company_flash` MUST 提供合法 `ticker`；其中 `company` 额外 MUST 提供 `rating` 与 `target_price`。
- `sector` / `sector_flash` MUST 提供合法 `region` 与 `sector`。
- `common` MUST 提供合法 `region`。

#### 3.6.2 Certificate 英文条款原文（必须展示）

页面在 Certificate checkbox 旁 MUST 展示以下英文条款原文：
1. `members of my household and I have not traded any financial interest in the subject company since I started the coverage nor currently hold any financial interest in the subject company (including, without limitation, any securities, option, right, warrant, future, long or short position;`
2. `I did not receive any compensation from the subject company in the previous 12 months;`
3. `I have not served as an officer, director or employee of the subject company;`
4. `none of my household serve as an officer of the subject company;`
5. `I comply with the Group Compliance Policy with regards to gifts and entertainment in dealing with subject companies and investors;`
6. `this research report contains no material non-public information.`

### 3.7 报告版本与状态历史（已实现）
- 长期约束遵循 `docs/DECISIONS.md` 的 `D-010`。
- 内容版本（`report_version`）与状态历史（`report_status_log`）MUST 解耦。
- 每次内容保存 MUST 追加新版本。
- 状态流转 MUST 记录状态日志，并记录动作对应版本号。
- 状态历史展示范围：按“当前报告”展示，不做全局历史列表。
- 报告详情中的版本历史 MUST 至少展示：版本号、修改人、修改时间、关联 Note/Reason（存在时）。

## 4. 功能权限矩阵（目标态）

| 功能 | Admin | SA | Analyst |
|------|-------|----|---------|
| 登录/登出/忘记密码 | ✅ | ✅ | ✅ |
| Users 管理 | ✅ | ❌ | ❌ |
| Region 管理 | ✅ | ❌ | ❌ |
| Analyst Info 管理 | ✅ | ❌ | ❌ |
| Coverage 列表/搜索 | ✅ | ❌ | ✅ |
| Coverage 新增 | ✅ | ❌ | ✅ |
| Coverage 编辑/删除 | ✅ | ❌ | ❌ |
| Sector 管理 | ✅ | ❌ | ❌ |
| Template 管理 | ✅ | ❌ | ❌ |
| Desktop Analyst Submit 入口 | ✅ | ❌ | ✅ |
| Reports 列表 | ✅（全部） | ✅（submitted/published/rejected） | ✅（仅 owner） |
| Reports 创建 | ✅（为自己） | ❌ | ✅（为自己） |
| Reports 编辑（draft/submitted） | ✅ | ❌ | ✅（仅 owner） |
| Reports 提交审核 | ✅ | ❌ | ✅（仅 owner） |
| Report Review 审批 | ✅ | ✅ | ❌ |
| Report Review 退回 draft | ✅ | ✅ | ❌ |

## 5. 验收口径（项目级）

- 所有角色权限与页面可见性 MUST 与矩阵一致。
- 关键流程（创建、编辑、提交、审批）MUST 可回归测试。
- 非目标能力不得“隐式实现”（例如批量审批、统计面板、外部发布）。

## 6. 变更来源

- `auth-and-users-mvp`（归档）
- `region-and-analyst-management`（归档）
- `coverage-sector-template-management`（归档）
- `report-management-and-approval`（归档：`2026-02-18-report-management-and-approval`）
- `report-submission-rules-enhancement`（归档：`2026-02-18-report-submission-rules-enhancement`）
