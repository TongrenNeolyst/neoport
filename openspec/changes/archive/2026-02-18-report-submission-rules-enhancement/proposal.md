## 目标与背景

当前报告流程已具备创建、提交、审批与版本记录能力，但在“入口一致性”和“提交流程校验”上仍有明显缺口：
- 报告创建入口不够统一，Desktop 的“Add Report”入口需要明确保留且固定位置。
- Reports 列表的“Add”交互需要统一到独立页面，避免弹窗模式导致信息承载不足与流程分叉。
- 报告字段口径缺少结构化矩阵，导致不同报告类型的必填规则不透明。
- 提交前模板匹配与 Company Model 必传校验不完整，存在误提交风险。
- Reject 缺少强制 Note 约束，影响驳回原因追溯与整改闭环。

本 change 目标是把上述规则沉淀为统一、可验收、可测试的产品需求基线，并为后续 specs/design/tasks 提供足够细节。

## 需求

### Why

通过统一“创建入口 + 独立创建页 + 提交校验 + 驳回备注”四条主线，降低错误提交流程和沟通成本，提升报告流程的一致性、可追溯性和可维护性。

### What Changes

1. Desktop 入口保留与排序
- 保留 Desktop 上独立“Add Report”功能入口。
- 该入口必须放在 Reports 分组第一个位置。
- 入口语义为“创建新报告”，不可与“查看报告列表”混用。
- 点击该入口时必须在新标签页打开独立创建页（遵循 Desktop-as-Launcher 契约）。

2. 报告创建统一为独立页面
- 报告创建必须使用独立页面（建议路由 `/reports/new`）。
- Reports 列表页上的“Add”按钮点击后，必须打开同一独立页面。
- 明确禁止通过小窗口/Modal 承载完整创建流程。

3. 报告字段矩阵与按类型必填规则
- 将字段矩阵作为正式需求口径纳入报告创建/编辑/提交流程。
- 矩阵外字段不作为本 change 强制范围。
- `Report Type` 在“添加报告”页必须使用下拉选择，不允许自由输入。
- `Report Type` 下拉数据源必须来自 `template` 表中的 `report_type`（去重后的可用值）。
- `Region`、`Sector` 在表单中必须使用下拉选择，不允许自由文本输入。
- 下拉数据源必须来自数据库对应表（`region`、`sector`）的有效记录。

4. Report Type 来源与模板匹配
- 报告主表 `report.report_type` 不再使用固定 5 值 `check constraint`。
- `report.report_type` 的合法值由 `template.report_type` 驱动。
- 提交时必须校验所选 Report Type 在 `template` 表存在有效模板（按业务口径定义“有效”，如启用版本）。
- 系统初始化时必须预置 5 种 `report_type`：`company`、`sector`、`company_flash`、`sector_flash`、`common`。
- 初始化阶段允许模板文件留空（即先有类型、后补文件）。

5. Company Model 必传校验
- Company 报告提交时 Model Excel 必传。

6. Reject Note 必填
- SA/Admin 执行 Reject 时，`Note` 为必填。
- 无 `Note` 时拒绝状态流转。

7. 范围边界
- 本 change 不引入外部发布站点能力。
- 本 change 不改变 owner 模型与角色体系。
- `Analyst` 多选与主次排序沿用现有已实现能力（非本 change 新增开发项）。
- 其余未纳入点位后续由用户继续补充到同一 proposal。

8. 报告创建页信息架构
- 报告创建/编辑页必须明确分区承载三类信息：
  - 报告基本信息（字段矩阵）
  - Report 文件（Word）
  - Model 文件（Excel）
- 报告基本信息字段在页面上采用纵向布局（字段逐行排列），不采用横向多列表单作为默认形态。

9. 文件必填规则（提交时）
- 所有报告类型在提交时都必须提供 Report Word 文件。
- Company 报告在提交时必须提供 Model Excel 文件。
- 非 Company 报告的 Model 文件可选。

10. 公司类报告与 Coverage 关系
- Company、Flash Company 报告提交前，必须能够关联到有效 Coverage 语义（Ticker + Analyst）。
- 若无法关联 Coverage，流程应阻断提交并引导先完成 Coverage 维护。

11. 版本与审计展示细节
- 对报告基本信息、Report 文件、Model 文件任一项发生变更，均需生成新版本并记录修改人。
- 报告详情需可查看“当前报告”的历史版本，至少包含：版本号、修改人、修改时间、Note/Reason。

### 报告字段矩阵（来自 `temp/report-fields-matrix.md`）

| 字段 | Company | Sector | Flash Company | Flash Sector | Common |
|---|:---:|:---:|:---:|:---:|:---:|
| Ticker | ✅ |  | ✅ |  |  |
| Rating | ✅ |  |  |  |  |
| Target price | ✅ |  |  |  |  |
| Region |  | ✅ |  | ✅ | ✅ |
| Sector |  | ✅ |  | ✅ |  |
| Report language | ✅（中/英） | ✅（中/英） | ✅（中/英） | ✅（中/英） | ✅（中/英） |
| Report title | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analyst | ✅（支持多个） | ✅（支持多个） | ✅（支持多个） | ✅（支持多个） | ✅（支持多个） |
| Contact Person | ✅ | ✅ | ✅ | ✅ | ✅ |
| Investment thesis | ✅ | ✅ | ✅ | ✅ | ✅ |
| Certificate | ✅ | ✅ | ✅ | ✅ | ✅ |

### 字段与业务规则补充

- Company/Flash Company：必须填写 `Ticker`；其中 Company 额外必须填写 `Rating`、`Target price`。
- Sector/Flash Sector：必须填写 `Region`、`Sector`。
- Common：必须填写 `Region`。
- `Region` 初始值域基线：China、Hong Kong、Japan、Taiwan、Korea、India、Macau、US；并允许后续扩展。
- `Region` 字段必须从 `region` 表有效数据下拉选择（提交值为合法 `region` 记录标识）。
- `Sector` 字段必须从 `sector` 表有效数据下拉选择（提交值为合法 `sector` 记录标识）。
- `Report language` 取值限定为中文或英文。
- `Investment thesis` 为多行文本输入（textarea），语义为“报告摘要”。
- `Analyst` 支持多选并保留主次关系（沿用现有实现，specs 只补口径不重复造能力）。
- `Certificate` 为确认型 checkbox 组件，不是自由文本输入；提交前必须勾选确认。
- 若 `Certificate` 未勾选，系统必须阻断提交报告并返回可见错误提示。

### Certificate 条款基线

页面需在`Certificate` checkbox旁边显示`I and all the names listed as the authors of this uploaded notes, certify that'
下面显示这些条款：
1. `members of my household and I have not traded any financial interest in the subject company since I started the coverage nor currently hold any financial interest in the subject company (including, without limitation, any securities, option, right, warrant, future, long or short position;`
2. `I did not receive any compensation from the subject company in the previous 12 months;`
3. `I have not served as an officer, director or employee of the subject company;`
4. `none of my household serve as an officer of the subject company;`
5. `I comply with the Group Compliance Policy with regards to gifts and entertainment in dealing with subject companies and investors;`
6. `this research report contains no material non-public information.`

### 模板匹配规则

- `Report Type` 可选项来自 `template.report_type`（去重）。
- 所选 `Report Type` 必须能在 `template` 表中匹配到可用模板记录。
- 当前业务基线期望支持 5 种报告类型：Company、Sector、Flash Company、Flash Sector、Common。
- 上述 5 种类型必须在初始化脚本中写入（可先无实际文件内容）。

### 提交与驳回校验规则

- 提交时必须同时通过：
  - 字段矩阵必填校验
  - `Report Type` 下拉值合法性校验（必须来自 `template.report_type`）
  - `Region` / `Sector` 下拉值合法性校验（必须存在于对应表的有效记录）
  - `Certificate` 勾选校验（未勾选则不可提交）
  - 模板匹配校验
  - Report Word 必传校验
  - Company Model 必传校验（适用时）
  - Company/Flash Company 的 Coverage 关联校验（适用时）
- Reject 时必须校验 `Note` 非空。

### Capabilities

### New Capabilities

- `report-submission-validation`: 统一报告提交校验规则（字段矩阵、模板匹配、Company Model 校验、错误提示口径）。

### Modified Capabilities

- `desktop-nav`: 保留独立 `Add Report` 入口，并固定在 Reports 分组第一个。
- `report-management`: 报告创建入口统一到独立页面；Reports 列表 Add 按钮跳转同一路由；引入字段矩阵、文件必填与 Coverage 关联规则。
- `template-file-management`: `report_type` 成为报告类型事实源（下拉数据源）并承担模板匹配校验口径。
- `template-file-management`: 增加 5 种 `report_type` 初始化规则（支持初始文件留空）。
- `report-review`: 增加 Reject 时 `Note` 必填约束。
- `coverage-management`: 增加公司类报告提交流程对 Coverage 的前置依赖口径。
- `report-versioning`: 补充版本生成触发条件与历史展示字段口径（版本号/修改人/修改时间/Note）。

### 权限模型

本 change 不新增角色，不改变既有 RBAC；仅补充既有角色下的页面可见性与提交流程规则。

角色功能权限矩阵（本 change 相关）：

| 功能 | Admin | SA | Analyst |
|---|---|---|---|
| Desktop 显示 `Add Report` 入口 | ✅ | ❌ | ✅ |
| 从 Desktop 打开 `Add Report` 页面（新标签） | ✅ | ❌ | ✅ |
| Reports 列表点击 Add 跳转独立创建页 | ✅ | ❌ | ✅（仅 owner 创建） |
| 报告提交（含字段/模板/Model 校验） | ✅ | ❌ | ✅（仅 owner） |
| Reject 报告（Note 必填） | ✅ | ✅ | ❌ |

角色数据表权限矩阵（RLS，本 change 相关表）：

| 表 | Admin | SA | Analyst |
|---|---|---|---|
| `report` | R/W（无 DELETE） | R（submitted/published/rejected） | R/W（仅 owner） |
| `report_version` | R + INSERT | R（submitted/published/rejected） | R + INSERT（仅 owner） |
| `report_status_log` | R + INSERT | R + INSERT（审批/退回） | R + INSERT（仅 owner 执行 submit） |

## 设计约束与规范

- Proposal 仅定义 WHAT，不展开 HOW；实现细节放入后续 design。
- 必须与长期决策保持一致：
  - `docs/DECISIONS.md` D-005：Desktop-as-Launcher
  - `docs/DECISIONS.md` D-009：owner 不可转移
  - `docs/DECISIONS.md` D-010：内容版本与状态历史解耦
  - `docs/DECISIONS.md` D-012：SA 负责审批不编辑内容
- Desktop 新入口需遵循现有 Desktop 契约（入口组织清晰、行为一致）。
- Desktop 的 `Add Report` 入口必须与其他功能卡片一致，采用新标签页打开目标页面。
- 报告创建独立页应作为创建入口的唯一承载，不允许并行维护“弹窗版创建流程”。
- 所有新增规则在 specs 中必须转化为 SHALL/MUST 场景，并可在 `docs/TESTING.md` 口径下验收。

## Impact

- Affected specs:
  - `openspec/specs/desktop-nav/spec.md`（modified）
  - `openspec/specs/report-management/spec.md`（modified）
  - `openspec/specs/template-file-management/spec.md`（modified）
  - `openspec/specs/report-review/spec.md`（modified）
  - `openspec/specs/coverage-management/spec.md`（modified）
  - `openspec/specs/report-versioning/spec.md`（modified）
  - `openspec/specs/report-submission-validation/spec.md`（new）
- Affected product flows:
  - Desktop 报告入口排序与可见性
  - Reports 列表 Add 交互路径
  - 报告创建/提交校验链路
  - Reject 退回链路
- Affected implementation areas (预计):
  - `supabase/migrations/*`（`report.report_type` 约束调整：移除固定枚举 check，改为由模板表驱动校验）
  - `supabase/seed/*`（初始化 5 种 report_type，模板文件可空）
  - `web/app/desktop`
  - `web/app/reports`
  - `web/features/reports/*`
  - `web/features/report-review/*`
  - 相关 schema 与 server actions 校验逻辑
