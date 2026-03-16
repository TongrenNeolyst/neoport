## 1. 数据库迁移与约束

- [x] 1.1 新增迁移文件，创建 `sector`、`coverage`、`coverage_analyst`、`template` 四张表
- [x] 1.2 为 `sector` 落地两级层级约束（level/parent 规则）与唯一索引
- [x] 1.3 为 `coverage` 落地必需字段、唯一约束（ticker/isin）与查询索引
- [x] 1.4 为 `coverage_analyst` 落地 1..4 角色/排序约束与唯一约束
- [x] 1.5 为 `template` 落地版本唯一约束与"同组仅一个 active"的部分唯一索引
- [x] 1.6 为四张表配置 `updated_at` 触发器

## 2. RLS 与安全策略

- [x] 2.1 为四张表开启 RLS，并实现 authenticated 可读策略
- [x] 2.2 为 `coverage` 实现 `INSERT` 允许 `admin/analyst`，`UPDATE/DELETE` 仅 `admin`
- [x] 2.3 为 `coverage_analyst` 实现 `INSERT` 允许 `admin/analyst`，`UPDATE/DELETE` 仅 `admin`
- [x] 2.4 为 `sector`、`template` 实现写入仅 `admin`
- [x] 2.5 为模板文件 bucket 配置读写权限策略（上传/替换/删除仅 Admin）

## 3. Domain Schema 与数据访问层

- [x] 3.1 新增 `coverage`、`sector`、`template` 的 zod schema 与类型定义
- [x] 3.2 在 `features/*/repo/*.ts` 实现 coverage 列表/搜索与 create/update/delete
- [x] 3.3 在 `features/*/repo/*.ts` 实现 sector 树形查询与 CRUD
- [x] 3.4 在 `features/*/repo/*.ts` 实现 template 分组查询、版本上传、启用切换
- [x] 3.5 在 repo 层实现 coverage 创建时 analyst 关系批量写入与 1..4 校验

## 4. Server Actions 与权限编排

- [x] 4.1 新增 coverage/sectors/templates 的 server actions
- [x] 4.2 在 coverage create action 放开 Analyst，update/delete action 保持 Admin-only
- [x] 4.3 在 sectors/templates 的全部写操作保持 Admin-only
- [x] 4.4 统一数据库错误映射（唯一冲突、外键冲突、层级约束失败）
- [x] 4.5 在 `web/features/users/actions.ts` 增加"是否邮件确认"参数处理

## 5. 页面与交互实现

- [x] 5.1 实现 `/coverage` 页面（列表、搜索、分页、创建/编辑弹窗、删除确认）
- [x] 5.2 实现 coverage 表单必填校验（ticker/country_of_domicile/english_full_name/sector_id/isin/analyst）
- [x] 5.3 实现 coverage analyst 最多 4 位排序录入交互
- [x] 5.4 实现 `/sectors` 页面（两级结构展示、筛选、创建/编辑、删除确认）
- [x] 5.5 实现 coverage 中 sector 选择器（搜索 + 两级缩进 + 滚动）
- [x] 5.6 实现 `/templates` 页面（分组、历史版本、上传新版本、启用切换）

## 6. Desktop 导航与路由守卫

- [x] 6.1 在 Desktop 新增 Coverage/Sector/Template 卡片并保持新标签页打开
- [x] 6.2 实现卡片可见性：Coverage 对 Admin/Analyst 可见，Sector/Template 仅 Admin
- [x] 6.3 实现页面路由守卫：`/coverage` 允许 Admin/Analyst，`/sectors` 与 `/templates` 仅 Admin
- [x] 6.4 校验 403 行为：无权限访问返回 `/403` 且文案符合现有约定

## 7. 集成与联调

- [x] 7.1 联调 coverage 创建流程（主记录 + coverage_analyst 一次性成功）
- [x] 7.2 联调 template 上传与版本切换（元数据与存储路径一致）
- [x] 7.3 联调用户创建"邮件确认开关"两条路径（开启/关闭）
- [x] 7.4 验证 report 前置读取链路可消费 Coverage/Sector/Template 基础数据

## 8. 测试与验收

- [x] 8.1 编写/更新 E2E：coverage CRUD 与 analyst 仅可新增权限
- [x] 8.2 编写/更新 E2E：sector 两级约束、搜索与选择器交互
- [x] 8.3 编写/更新 E2E：template 上传、版本历史、active 切换
- [x] 8.4 编写/更新权限测试：Desktop 卡片可见性与路由访问矩阵
- [x] 8.5 编写/更新 RLS 测试：`coverage`/`coverage_analyst` INSERT 为 admin+analyst，其余写仅 admin
- [x] 8.6 执行全量回归并修复阻断问题，完成 change 验收打勾
