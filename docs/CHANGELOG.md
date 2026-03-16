# Changelog

记录项目级关键变更（按时间倒序）。

## 2026-02-23

### Desktop 卡片标题更新
- Desktop 功能卡片标题重命名：
  - `Add Report` → `Analyst Submit`
  - `Reports` → `Analyst Revise`
  - `Report Review` → `Quality Review`
- 同步更新页面标题（Reports 列表页、New Report 页、Report Review 页）。
- 文档同步更新：`docs/REQUIREMENTS.md`、`docs/UI.md`。

### Vercel 部署配置
- 新增 `vercel.json` 配置文件，指定 Next.js 项目位于 `web/` 子目录。
- 配置 GitHub webhook 实现 push 自动部署。

## 2026-02-19

### Archive 口径漏项回填（docs 对齐）
- 按已归档 change（截止 `2026-02-18-report-submission-rules-enhancement`）复核并补齐 docs 口径。
- 回填 `docs/REQUIREMENTS.md`：
  - 补充报告字段矩阵（按 report type 必填）
  - 补充 Certificate 6 条英文条款原文
  - 补充 Reports/Template 拖拽上传 + 点击兜底
  - 补充 `submitted -> published` 发布快照写入规则
  - 补充 Region 初始值域基线
- 回填 `docs/DATA_MODEL.md`：
  - 补充 `report.published_by` / `report.published_at`
  - 补充发布快照字段写入约束
  - 补充模板存储路径的读写权限口径
- 回填 `docs/UI.md` 与 `docs/TESTING.md`：
  - 增加拖拽上传与点击上传等价验收口径
  - 增加发布快照字段回归校验口径
- 回填 `docs/LOGIC.md`：
  - 补充 `/auth/callback` 分支处理与失败跳转规则
- 修正 `docs/SUPABASE_DB_VERSIONING.md`：
  - 将 `seed:auth` 示例改为 `pnpm exec tsx`，与 `pnpm-only` 口径一致。

## 2026-02-18

### Report Submission Rules 增强归档回填
- OpenSpec change `report-submission-rules-enhancement` 已归档：`openspec/changes/archive/2026-02-18-report-submission-rules-enhancement/`。
- specs 已同步到主线：
  - `openspec/specs/report-submission-validation/spec.md`（新增）
  - `openspec/specs/desktop-nav/spec.md`
  - `openspec/specs/report-management/spec.md`
  - `openspec/specs/template-file-management/spec.md`
  - `openspec/specs/report-review/spec.md`
  - `openspec/specs/coverage-management/spec.md`
  - `openspec/specs/report-versioning/spec.md`
- 新增数据库迁移与 seed：
  - `supabase/migrations/20260218213000_report_submission_rules_enhancement.sql`
  - `supabase/seed/02_template_report_types.sql`
- 报告创建入口统一为 `/reports/new`，Desktop `Add Report` 保留并置顶，提交门禁补齐（模板有效性、下拉合法性、文件必填、Certificate、Reject Note）。
- 回填文档：
  - `docs/REQUIREMENTS.md`
  - `docs/DATA_MODEL.md`
  - `docs/UI.md`
  - `docs/TESTING.md`
  - `docs/DECISIONS.md`

### Report 管理与审批归档回填
- OpenSpec change `report-management-and-approval` 已归档：`openspec/changes/archive/2026-02-18-report-management-and-approval/`。
- 报告能力口径从“已确认待开发/进行中”更新为“已实现/已归档”，并回填到：
  - `docs/REQUIREMENTS.md`
  - `docs/DATA_MODEL.md`
- 新增数据库原子化迁移，保障报告保存与状态流转的一致性：
  - `supabase/migrations/20260218170000_report_atomic_rpc.sql`
  - `supabase/migrations/20260218170100_report_change_status_atomic.sql`
- 执行 `bash scripts/db-init.sh` 完成云端迁移推送、迁移一致性核验与 Auth 种子用户刷新。

### Analyst 字段迁移补齐
- 修复云端重置后 `analyst` 表缺少 `suffix` / `sfc` 字段的问题。
- 新增迁移：`supabase/migrations/20260218150000_add_analyst_suffix_sfc.sql`。
- 初始化流程验收补充：`supabase db push --linked` 后需确认迁移已应用并与业务字段口径一致。

### Coverage 表单选择约束收敛
- Coverage 创建/编辑中，`sector` 与 `analyst` 改为“必须从活跃列表选择”，禁止提交非列表值。
- Coverage 作者（analyst）选择增加唯一性约束，禁止重复 analyst。
- Coverage 服务端 action 增加二次校验，防止绕过前端提交非法 `sector_id` / `analyst_id`。

### `.gitignore` 规则修正
- 将 `coverage/` 修正为 `/coverage/`，避免误忽略 `web/features/coverage/` 业务源码目录。

## 2026-02-17

### OpenSpec 归档触发流程调整
- 新增 `docs/OPENSPEC_ARCHIVE_BACKFILL.md`，统一归档并回填 docs 的触发语句、执行步骤与输出要求。
- `docs/README.md` 重整为“启动全量加载清单”，将 `README` 与 `OPENSPEC_ARCHIVE_BACKFILL` 一并纳入启动必读。
- `docs/README.md` 去除回填映射重复内容，改为只保留唯一入口引用（以 `OPENSPEC_ARCHIVE_BACKFILL` 为准）。
- 移除自定义 skill：`.codex/skills/openspec-archive-change-docs`。

### 文档治理重构
- 新增 `docs/DATA_MODEL.md` 作为逻辑数据模型唯一入口。
- 新增 `docs/CHANGELOG.md` 作为项目变更摘要入口。
- 重写 `docs/README.md`：加入启动必读协议、文档边界、冲突优先级、OpenSpec 回填映射。
- 重写 `docs/REQUIREMENTS.md`：按“已上线 + 已确认待开发”统一业务需求口径。
- 重写 `docs/ARCHITECTURE.md`：收敛为系统级架构与数据库规范，不再承载表级细节。
- 重写 `docs/DECISIONS.md`：整理为 ADR 风格长期决策清单。
- 重写 `docs/TESTING.md`：明确分层测试、覆盖要求与通过门槛。
- 合并视觉规范到 `docs/UI.md`（并入原前端视觉一致性内容）。

### OpenSpec 进展（摘要）
- `coverage-sector-template-management`：已归档（`2026-02-17-coverage-sector-template-management`），specs 已合并到主线。
- `report-management-and-approval`：进行中（tasks `0/50`），proposal/design/specs 已创建，文档口径已统一到 owner 模型与状态历史方案。
- 归档完成：`region-and-analyst-management`。

## 2026-02-15 ~ 2026-02-17

### 基线能力建设
- 完成认证与用户管理 MVP（登录、邀请、角色、禁用/启用、改密、删除）。
- 完成 Region 与 Analyst Info 管理基线。
- 建立 `region` / `analyst` RLS 基线策略。
