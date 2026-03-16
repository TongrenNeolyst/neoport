## 1. 数据库模型与迁移

- [x] 1.1 新增 `report` 表（含 `owner_user_id`、`status`、`report_type`、`current_version_no`）
- [x] 1.2 新增 `report_version` 表并建立 `(report_id, version_no)` 唯一约束
- [x] 1.3 新增 `report_analyst` 表并建立作者关系约束与索引
- [x] 1.4 新增 `report_status_log` 表（append-only）并建立查询索引
- [x] 1.5 为 `report`、`report_version`、`report_analyst` 增加必要外键与状态 check 约束
- [x] 1.6 编写状态流转约束（`draft->submitted->published/rejected`、`rejected->draft`）与非法流转阻断

## 2. RLS 与存储策略

- [x] 2.1 为 `report` 实现 owner + role + status 可见性 RLS
- [x] 2.2 为 `report_version` 实现 owner + role + status 可见性 RLS
- [x] 2.3 为 `report_analyst` 实现 owner/Admin 可写，SA 按状态只读
- [x] 2.4 为 `report_status_log` 实现仅追加写入策略（禁 update/delete）
- [x] 2.5 为 reports bucket 实现文件权限：`SELECT`=owner/Admin/SA(限定状态)，写入=owner/Admin
- [x] 2.6 覆盖 RLS 策略测试（owner、SA、Admin 三角色）

## 3. Domain Schema 与仓储层

- [x] 3.1 新增 report 领域 schema（最小必填：`title`、`report_type`）
- [x] 3.2 新增状态动作 schema（submit/approve/reject/reopen）及 reason 校验
- [x] 3.3 实现 report 仓储：列表查询（含默认 `submitted` 筛选）与详情读取
- [x] 3.4 实现版本仓储：保存内容即新增 `report_version`（递增版本号）
- [x] 3.5 实现状态日志仓储：写入 `from_status/to_status/action_by/action_at/reason/version_no`
- [x] 3.6 实现作者关系仓储：owner/Admin 可维护，Analyst 仅 owner 可维护

## 4. Server Actions 与业务编排

- [x] 4.1 实现创建 report action（`owner_user_id` 固定为当前用户）
- [x] 4.2 实现保存内容 action（每次保存创建新版本）
- [x] 4.3 实现提交 action（`draft->submitted`，写状态日志）
- [x] 4.4 实现审批 action（approve/reject/reopen，写状态日志）
- [x] 4.5 实现“直接提交” action：先 save 再 submit（两步）
- [x] 4.6 实现“直接提交”第二步失败提示：`已保存为 Draft，提交失败`

## 5. 文件上传下载与命名规范

- [x] 5.1 实现文件命名：`{report_id}_{version_no3}_{label}_{ts}.{ext}`
- [x] 5.2 实现文件目录：统一写入 `reports/{report_id}/`
- [x] 5.3 实现 `label` 规范（`report` / `model`）与扩展名校验
- [x] 5.4 实现上传流程与 version_no 绑定（内容保存时落路径）
- [x] 5.5 实现下载流程与权限校验（owner/Admin/SA 限定状态）
- [x] 5.6 实现无文件场景 UI（显示 `No file`，不渲染预览）
- [x] 5.7 实现 Reports 页面拖拽上传（report/model）并保留点击上传兜底
- [x] 5.8 实现 Report Template 页面拖拽上传（word/excel）并保留点击上传兜底

## 6. 页面与交互

- [x] 6.1 实现 `/reports` 页面列表与筛选（SA/Admin 默认 `submitted`）
- [x] 6.2 实现 report 创建/编辑页面（文件非必填）
- [x] 6.3 实现 submitted 状态可编辑（owner/Admin）且状态不回退
- [x] 6.4 实现“直接提交”入口与交互反馈
- [x] 6.5 实现 `/report-review` 审批列表与详情（仅 SA/Admin）
- [x] 6.6 在详情页展示“报告状态历史”（按当前 report 维度）

## 7. 导航与权限入口

- [x] 7.1 Desktop 新增 Reports 卡片（Admin/SA/Analyst）并新标签打开
- [x] 7.2 Desktop 新增 Report Review 卡片（仅 Admin/SA）并新标签打开
- [x] 7.3 增加路由守卫：Analyst 禁止访问 `/report-review`
- [x] 7.4 增加页面守卫：Analyst 仅可访问 owner 报告

## 8. 测试与验收

- [x] 8.1 E2E：owner 访问控制（Analyst 仅自己）
- [x] 8.2 E2E：SA 仅可见 `submitted/published/rejected`
- [x] 8.3 E2E：状态机合法流转与非法流转阻断
- [x] 8.4 E2E：reject 必填 reason 与 `rejected->draft` 保留历史原因
- [x] 8.5 E2E：直接提交两步流程及失败提示
- [x] 8.6 E2E：文件命名规则、下载权限、无文件审批场景
- [x] 8.7 E2E：Reports 与 Report Template 的拖拽上传与点击上传兜底流程

## 9. 自动迁移与自动化测试

- [x] 9.1 使用 Supabase CLI 自动执行数据库迁移（`supabase db push --include-seed`）
- [x] 9.2 迁移后执行 `supabase migration list --linked`，确认本地与远端迁移一致
- [x] 9.3 在 CI 或本地脚本自动运行 Web 全量功能测试与 E2E
- [x] 9.4 测试失败时输出失败用例与日志，并阻断合并
