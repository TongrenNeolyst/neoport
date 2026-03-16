# Decisions (ADR, Cross-Cutting)

本文件只记录“长期稳定、跨模块”的决策。
不记录短期实现细节与操作步骤。

## 使用规则

- 每条决策使用唯一编号（D-xxx）。
- 每条决策包含：结论、影响、变更条件。
- 若决策被更新，不删除历史，使用“Superseded by”标记。

## 决策清单

### D-001：技术栈固定为 Next.js + Supabase
- 状态：Accepted
- 结论：应用入口固定 Next.js（App Router），后端能力固定 Supabase。
- 影响：业务能力默认不引入第二套后端框架。
- 变更条件：需新 change 明确提出并通过评审。

### D-002：交互策略采用 Server-first
- 状态：Accepted
- 结论：优先 Server Components + Server Actions，客户端仅承担必要交互。
- 影响：权限和写操作在服务端收敛。
- 变更条件：性能或场景证明需要更重 client-side。

### D-003：角色事实源固定为 `app_metadata.role`
- 状态：Accepted
- 结论：RBAC 统一以 Auth 元数据角色为准。
- 影响：禁止以客户端传入角色作为授权依据。
- 变更条件：认证系统替换。

### D-004：账号启用/禁用只用 ban/unban
- 状态：Accepted
- 结论：不用 `app_metadata.is_active` 作为状态事实源。
- 影响：避免双状态源冲突。
- 变更条件：Auth 能力模型发生根本变化。

### D-005：Desktop-as-Launcher 导航契约长期保留
- 状态：Accepted
- 结论：`/desktop` 为默认落地页，功能卡片新标签页打开。
- 影响：功能页不承担返回 Desktop 导航。
- 变更条件：整体信息架构重构。

### D-006：数据时间语义统一
- 状态：Accepted
- 结论：数据库存储使用 UTC `timestamptz`；展示按业务时区转换（当前 Asia/Shanghai）。
- 影响：禁止把本地时间直接写入 DB 时间字段。
- 变更条件：跨时区策略变更。

### D-007：Analyst 业务信息与 Auth 账号解耦
- 状态：Accepted
- 结论：`analyst` 表不自动创建/删除 Auth 用户。
- 影响：业务档案与登录账号生命周期分离。
- 变更条件：未来引入强绑定身份模型。

### D-008：Coverage 写权限部分放开
- 状态：Accepted
- 结论：`coverage` 与 `coverage_analyst` 对 Analyst 放开 INSERT；UPDATE/DELETE 仍仅 Admin。
- 影响：Analyst 可新增覆盖标的，但不可改删既有记录。
- 变更条件：协作流程升级。

### D-009：Report owner 模型固定
- 状态：Accepted
- 结论：谁创建报告归谁（`owner_user_id`），owner 不可转移。
- 影响：Analyst 默认只操作 owner 报告。
- 变更条件：明确引入“转移所有权”业务流程。

### D-010：报告“内容版本”与“状态历史”解耦
- 状态：Accepted
- 结论：内容变化写 `report_version`，状态变化写 `report_status_log`。
- 影响：审计与回溯更清晰。
- 变更条件：版本模型简化为单链（不推荐）。

### D-011：报告文件路径采用扁平命名
- 状态：Accepted
- 结论：文件落 `reports/{report_id}/`，命名 `{report_id}_{version_no3}_{label}_{ts}.{ext}`。
- 影响：目录简单，依赖 DB 元数据做关联。
- 变更条件：文件系统与检索策略重构。

### D-012：SA 可审批但不可编辑报告内容
- 状态：Accepted
- 结论：SA 负责审批动作（approve/reject/reopen），不参与内容编辑。
- 影响：职责边界清晰，避免审批与编辑混淆。
- 变更条件：流程角色设计调整。

### D-013：交付边界固定（`web/` 仅放交付代码）
- 状态：Accepted
- 结论：`web/` 目录只放交付代码（`app/`、`components/`、`domain/`、`features/`、`lib/`）；测试与脚本不得放入 `web/`。
- 影响：
  - 测试代码统一放 `tests/`
  - 开发/运维脚本统一放 `scripts/`
  - 数据库开发脚本放 `supabase/scripts/`
  - 临时输出统一放 `temp/`
- 变更条件：目录结构体系整体重构并通过评审。

### D-014：Auth 用户写入路径固定为 Admin API
- 状态：Accepted
- 结论：创建/邀请/更新/禁用/改密/删除 Auth 用户必须通过 `supabase.auth.admin.*`；禁止对 `auth.users` 直接执行 `INSERT/UPDATE/DELETE`。
- 影响：
  - Web 服务端用户管理统一走 admin client。
  - `seed.ts` / 运维脚本初始化 Auth 用户时必须走 Admin API。
  - migration/SQL seed 禁止直接写入 Auth 用户记录。
- 变更条件：Supabase Auth 能力模型发生根本变化并通过评审。

### D-015：Report Type 事实源固定为 `template.report_type`
- 状态：Accepted
- 结论：报告创建页的 `Report Type` 仅从 `template.report_type` 读取；`report.report_type` 不再使用固定枚举 check 约束。
- 影响：
  - `template` 同时承担“类型注册 + 模板版本管理”。
  - 初始化阶段允许占位模板（`is_active=false` 且文件空）用于先注册类型。
  - 提交链路必须额外校验“存在有效模板”（激活且有文件）后才允许 submit。
- 变更条件：后续若引入独立 `report_type` 字典表并通过评审。

### D-016：Archive 历史冲突口径收敛（2026-02-19）
- 状态：Accepted
- 结论：针对已归档 change 中存在的历史口径冲突，统一采用以下收敛规则：
  - 有效模板定义固定为：`is_active=true` 且 `file_path` 非空。
  - `report.report_type` 合法值由 `template.report_type` 驱动，不恢复固定枚举 check。
  - `template.uploaded_by` 允许为空，仅用于占位模板初始化场景。
  - `auth.users` 写入路径固定为 Admin API，不作为业务 RLS 矩阵对象。
  - 报告文件规则固定为：draft 可无文件；submit 必须有 Word，且 `company` 必须有 Model。
  - Node.js 命令入口统一 `pnpm`，不使用 `npm/npx` 作为日常入口。
- 影响：
  - 文档评审与回填时，出现历史描述冲突按本条收敛口径判定。
  - 迁移、服务端校验、测试验收和运维脚本需要与本条保持一致。
  - Archive 中与本条不一致的旧表述视为被后续口径覆盖，不作为当前实现依据。
- 变更条件：出现新的 OpenSpec change 明确提出替代口径并通过评审。
