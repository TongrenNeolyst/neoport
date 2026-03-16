## Context

该 change 基于 `proposal.md`，聚焦报告创建入口与提交流程校验的统一。当前系统已有报告主流程与审批流程，但存在以下技术口径分散问题：
- `Report Type` 目前由 `report` 表固定 `check constraint` 约束，与“由模板驱动类型”的新口径不一致。
- 添加报告入口与创建交互（Desktop/Reports）路径不统一。
- 报告创建页字段、下拉来源、证书确认与提交门禁缺少一致的服务端约束。
- 需要在不破坏既有 owner/RLS 模型的前提下落地跨模块改造（Desktop、Reports、Template、DB migration/seed）。

约束来源：
- 角色与 owner 模型保持现状（D-009、D-012）。
- Desktop-as-Launcher 契约保持（D-005）。
- `Report Type` 来源改为 `template.report_type`，并初始化 5 种类型，模板文件允许初始为空。

## Goals / Non-Goals

**Goals:**
- 统一报告创建入口：Desktop `Add Report` 与 Reports 页 `Add` 指向同一独立页面。
- 将 `Report Type` 来源切换为 `template.report_type`，并移除 `report.report_type` 的固定 5 值 check 约束。
- 落地“字段下拉来源 + 文件必填 + Certificate 勾选 + Reject Note”的服务端强校验。
- 初始化 5 种 `report_type`，支持“先有类型，后补模板文件”。

**Non-Goals:**
- 不新增外部发布站点能力。
- 不改变 SA 的审批职责边界（不引入 SA 编辑报告内容）。
- 不在本 change 内引入 AI 写作、Word 转 Markdown 等新增编辑器能力。
- 不重构现有报告版本模型与 RLS 主体策略。

## Decisions

### 1) 设计基线
- 继续采用 Server-first：页面负责展示与交互，写入与关键校验收敛到 Server Actions + repo + DB 约束。
- 单一真实来源原则：前端下拉仅作为 UX，服务端必须二次校验合法性。

备选方案：前端表单完全驱动、后端弱校验。  
未选原因：会引入绕过风险，不符合当前权限与审计要求。

### 2) 数据模型与迁移策略

#### 2.1 `report.report_type` 约束调整
- 在迁移中移除 `report` 表对 `report_type` 的固定枚举 check 约束。
- `report_type` 字段保留 `text not null`，合法值改由应用层/DB 查询 `template.report_type` 实时判定。

备选方案 A：保留现有 check，同时在 `template` 同步维护一套映射。  
未选原因：双事实源会漂移。  
备选方案 B：新增独立 `report_type` 字典表。  
未选原因：用户明确要求“放在 template 里定义”。

#### 2.2 `template` 作为 report type 事实源
- `Report Type` 下拉来源：`SELECT DISTINCT report_type FROM template`（按约定排序）。
- 初始化写入 5 种类型：`company`、`sector`、`company_flash`、`sector_flash`、`common`。
- 初始化阶段允许模板文件为空：采用占位模板记录（`file_path=''`，`is_active=false`），后续由模板管理上传并激活。

备选方案：把 `file_path` 改为 nullable。  
未选原因：当前表与代码已按非空文本使用，变更面更大；占位策略可满足“先初始化类型”。

#### 2.3 提交阶段“有效模板”定义
- “有效模板”定义为：模板记录存在且 `is_active=true` 且 `file_path` 非空。
- 报告提交时校验所选 `report_type` 至少存在一个有效模板（按业务要求可细分 word/excel）。

### 3) 权限与安全
- 维持现有角色边界：Admin/Analyst 可创建；SA 不可创建。
- 维持 owner 边界：Analyst 仅可操作本人报告。
- 服务端校验清单（submit 前）：
  - `report_type` 值必须来自 `template.report_type`。
  - `region`/`sector` 必须来自对应表有效记录。
  - `certificate` 必须勾选。
  - Report Word 必传；Company Model 必传。
  - Company/Flash Company 必须满足 Coverage 关联语义。
- Reject 动作必须提供 `Note`，否则阻断状态流转。

### 4) 页面交互设计
- Desktop Reports 分组中保留 `Add Report`，并置于第一项。
- Desktop 点击 `Add Report`：新标签打开独立页（`/reports/new`）。
- Reports 列表页点击 `Add`：跳转同一路由（非弹窗）。
- 创建页字段为纵向排列。
- `Investment thesis` 使用多行输入（textarea），语义为报告摘要。
- `Region`、`Sector`、`Report Type` 均为下拉：
  - `Region` -> `region` 表
  - `Sector` -> `sector` 表
  - `Report Type` -> `template.report_type`
- `Certificate` 为 checkbox 确认项；未勾选不可提交；页面展示用户给定英文条款文案。

### 5) 技术实现方案（模块级）
- DB：
  - 新增迁移：移除 `report.report_type` check 约束。
  - 新增 seed/migration 数据写入：初始化 5 种 `report_type` 占位模板。
- Web：
  - `web/app/desktop`：调整 Reports 分组卡片顺序与 `Add Report` 链接。
  - `web/app/reports`：新增/强化 `/reports/new` 路由与列表页 Add 跳转。
  - `web/features/reports/*`：汇总 submit 前校验（type/region/sector/certificate/files/coverage）。
  - `web/features/templates/*`：模板激活逻辑与“有效模板”判定复用。
- 校验层：
  - `web/domain/schemas/report.ts`：补充/强化 certificate、字段矩阵与提交态校验结构。

## Risks / Trade-offs

- [`template` 兼任“类型注册 + 模板版本”] → 语义耦合增加；通过“占位记录 + 有效模板判定”降低歧义。
- [移除 `report_type` DB check 后纯枚举保护消失] → 通过服务端强校验 + 事务内校验 + 回归测试兜底。
- [初始化占位模板可能被误认为可用模板] → 强制 `is_active=false` 且 `file_path` 非空才视为有效模板。
- [跨模块改动面较大（desktop/reports/template/db）] → 分阶段合并，先迁移和校验，再入口和页面交互。

## Migration Plan

1. 新增 migration：删除 `report.report_type` 固定枚举 check 约束。  
2. 新增 seed（或 migration data patch）：向 `template` 初始化 5 种 `report_type` 占位记录（文件可空、默认不激活）。  
3. 上线服务端校验：`report_type` 来源、下拉合法性、certificate 门禁、文件门禁、coverage 门禁。  
4. 上线页面改动：Desktop `Add Report` 排序与跳转、Reports Add 跳转、创建页纵向字段布局。  
5. 回滚策略：
- 应用回滚：恢复旧前端入口与旧校验路径。
- DB 回滚：恢复 `report.report_type` 约束（如需）并保留已写入数据。
- 占位模板记录可保留，不影响旧流程读取。

## Open Questions

- “有效模板”是否必须同时要求 word/excel 双文件类型，还是按报告类型分别要求（当前先按 proposal 的提交规则执行）？
- 初始化 5 种类型时，占位记录采用单条（word）还是双条（word+excel）更符合后续模板管理体验？
- `Report Type` 下拉是否需要只展示已激活模板类型，还是展示全部初始化类型（当前按“展示全部类型，提交时校验有效模板”执行）？
