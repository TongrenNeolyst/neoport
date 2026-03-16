## Why

当前系统已具备用户、Region、Analyst Info 管理能力，但报告业务的关键基础数据（Coverage、Sector 两级分类、报告模板文件）尚未落地，导致后续报告创建与审核流程无法完整运行。需要先补齐这些基础数据模块，作为 report 管理与审批 change 的前置依赖。

## What Changes

## 一、目标与范围

### 1.1 目标
- 交付 Coverage（公司覆盖）、Sector（行业分类，二级结构）、报告模板文件（Word/Excel）三类基础数据管理能力。
- 调整用户管理：创建用户时支持“是否邮件确认”开关。
- 为后续 report 管理 change 提供可复用的基础数据选择源（coverage、sector、template）。

### 1.2 范围边界
- 本 change 仅建设基础数据模块，不包含 report 创建/编辑/提交流程。
- 不做模板在线编辑，仅做文件上传与版本管理。
- 不引入 Edge Functions/Realtime，保持现有 Server Actions + Supabase 模式。

## 二、需求

### 2.1 Coverage 管理
- 列表字段：ticker、english_full_name、chinese_short_name、sector、reporting_currency、updated_at。
- 字段覆盖：`country_of_domicile`、`isin`、`ads_conversion_factor`、`is_duplicate`、`approved_by`、`approved_at`。
- 创建/编辑表单必填：`ticker`、`country_of_domicile`、`english_full_name`、`sector_id`、`isin`、`analyst`（至少 1 位）。
- 支持按 ticker/name/sector 搜索。
- 维护 coverage 与 analyst 的作者角色（lead/co-author）。
- 支持最多 4 位 analyst 排序维护（1/2/3/4 位）。
- 允许 Analyst 新增 coverage；编辑/删除仍仅 Admin。
- 删除 coverage 前需二次确认。

### 2.2 Sector 管理（两级）
- 一级行业：不可设置 parent。
- 二级行业：必须绑定一级 parent。
- 禁止形成循环层级、禁止二级再挂二级。
- 列表支持按层级与关键词筛选。
- 在 Coverage 关联 Sector 的选择器中，必须支持：
  - 关键字搜索。
  - 一级/二级层级展示（可视化缩进）。
  - 长列表滚动浏览。

### 2.3 报告模板文件管理（Word/Excel）
- 模板类型：`word`、`excel`。
- 模板分类：Company / Sector / Company Flash / Sector Flash / Common。
- 支持版本号递增管理，保留历史版本。
- 支持“当前启用版本”切换；同一 report_type + file_type 仅 1 个启用版本。

### 2.4 页面与交互边界
- Coverage 页面：列表、搜索、分页、创建/编辑弹窗、删除确认。
- Sector 页面：树形展示（一级/二级）、层级筛选、创建/编辑弹窗、删除确认。
- Template 页面：按 `report_type + file_type` 分组展示当前启用版本与历史版本，支持上传新版本与启用切换。
- Desktop 导航：新增 Coverage/Sector/Template 三个入口卡片；Coverage 对 Admin/Analyst 可见，Sector/Template 仅 Admin 可见，并保持新标签页打开契约。

## 三、权限模型

### 3.1 角色功能权限矩阵

以下为当前阶段全量功能权限矩阵（含已实现模块与本 change 新增模块）：

| 功能模块 | 功能能力 | Admin | SA | Analyst |
|---------|---------|-------|----|---------|
| **认证与会话** | - | - | - | - |
| 认证与会话 | 登录/登出 | ✅ | ✅ | ✅ |
| 认证与会话 | 忘记密码（邮件重置） | ✅ | ✅ | ✅ |
| **已有管理模块** | - | - | - | - |
| Users 管理 | 访问 Users 页面 | ✅ | ❌ | ❌ |
| Users 管理 | 查看用户列表 | ✅ | ❌ | ❌ |
| Users 管理 | 创建用户时选择是否邮件确认 | ✅ | ❌ | ❌ |
| Users 管理 | 编辑用户信息 | ✅ | ❌ | ❌ |
| Users 管理 | 修改用户角色 | ✅ | ❌ | ❌ |
| Users 管理 | 启用/禁用用户 | ✅ | ❌ | ❌ |
| Users 管理 | 管理员直接修改用户密码 | ✅ | ❌ | ❌ |
| Users 管理 | 删除用户 | ✅ | ❌ | ❌ |
| Region 管理 | 访问页面 | ✅ | ❌ | ❌ |
| Region 管理 | 列表/搜索 | ✅ | ❌ | ❌ |
| Region 管理 | 创建/编辑/删除 | ✅ | ❌ | ❌ |
| Analyst Info 管理 | 访问页面 | ✅ | ❌ | ❌ |
| Analyst Info 管理 | 列表/搜索 | ✅ | ❌ | ❌ |
| Analyst Info 管理 | 创建/编辑/删除 | ✅ | ❌ | ❌ |
| **本 change 新增模块** | - | - | - | - |
| Coverage 管理 | 访问页面 | ✅ | ❌ | ✅ |
| Coverage 管理 | 列表/搜索 | ✅ | ❌ | ✅ |
| Coverage 管理 | 新增 | ✅ | ❌ | ✅ |
| Coverage 管理 | 编辑/删除 | ✅ | ❌ | ❌ |
| Sector 管理 | 访问页面 | ✅ | ❌ | ❌ |
| Sector 管理 | 列表/搜索 | ✅ | ❌ | ❌ |
| Sector 管理 | 创建/编辑/删除 | ✅ | ❌ | ❌ |
| Template 管理 | 访问页面 | ✅ | ❌ | ❌ |
| Template 管理 | 上传新版本 | ✅ | ❌ | ❌ |
| Template 管理 | 启用/停用版本 | ✅ | ❌ | ❌ |
| **导航与消费侧读取** | - | - | - | - |
| Desktop 导航 | Users 卡片显示 | ✅ | ❌ | ❌ |
| Desktop 导航 | Regions 卡片显示 | ✅ | ❌ | ❌ |
| Desktop 导航 | Analyst Info 卡片显示 | ✅ | ❌ | ❌ |
| Desktop 导航 | Coverage 卡片显示 | ✅ | ❌ | ✅ |
| Desktop 导航 | Sector/Template 卡片显示 | ✅ | ❌ | ❌ |
| 报告业务引用基础数据 | 读取 Coverage/Sector/Template | ✅ | ✅ | ✅ |

### 3.2 角色数据表权限矩阵（RLS）

以下为当前阶段全量数据权限矩阵（含已实现表与本 change 新增表）：

| 数据表 | SELECT | INSERT | UPDATE | DELETE | 说明 |
|-------|--------|--------|--------|--------|------|
| **已有表** | - | - | - | - | - |
| `auth.users` | Admin（通过 Admin API） | 仅 Admin | 仅 Admin | 仅 Admin | Auth 用户管理通过 Admin API，不走业务表 RLS |
| `region` | 所有已认证用户 | 仅 Admin | 仅 Admin | 仅 Admin | 已有基础字典表 |
| `analyst` | 所有已认证用户 | 仅 Admin | 仅 Admin | 仅 Admin | 业务分析师信息，保持与 auth.users 解耦 |
| **本 change 新增表** | - | - | - | - | - |
| `coverage` | 所有已认证用户 | Admin/Analyst | 仅 Admin | 仅 Admin | 基础数据可读；新增允许 Analyst |
| `coverage_analyst` | 所有已认证用户 | Admin/Analyst | 仅 Admin | 仅 Admin | 覆盖关系新增允许 Analyst |
| `sector` | 所有已认证用户 | 仅 Admin | 仅 Admin | 仅 Admin | 支持两级行业分类 |
| `template` | 所有已认证用户 | 仅 Admin | 仅 Admin | 仅 Admin | 模板元数据 |
| **存储层** | - | - | - | - | - |
| `storage.objects`（模板桶） | 所有已认证用户（受路径约束） | 仅 Admin | 仅 Admin | 仅 Admin | 模板文件上传/替换/删除 |

## 四、验收标准

- [ ] Admin 可访问 Coverage/Sector/Template；Analyst 可访问 Coverage，访问 Sector/Template 返回 `/403`。
- [ ] Coverage/Sector/Template 均可完成 CRUD（Template 的 D 为停用或删除元数据）。
- [ ] Sector 层级约束生效（无循环、二级必须有一级父节点）。
- [ ] Coverage 创建/编辑时，必填字段校验生效（ticker/country_of_domicile/english_full_name/sector/isin/analyst）。
- [ ] Coverage 的 analyst 角色排序可维护至 4 位。
- [ ] 模板支持上传新版本并切换启用版本。
- [ ] RLS 生效：已认证用户可读；Coverage 与 coverage_analyst 的 INSERT 允许 Admin/Analyst，其余写操作仅 Admin。
- [ ] 创建用户时支持“是否邮件确认”：开启则发邀请确认邮件，关闭则可直接创建可登录账号。

## 五、设计约束与规范

- 继承既有约定：`analyst` 业务信息与 `auth.users` 解耦，创建/删除 Analyst 信息不自动创建/删除账号。
- 存储路径规范：
  - 模板文件：`templates/{template_id}/{version}/template.docx|xlsx`
  - 报告文件预留（供后续 report change 使用）：`reports/{report_id}/word|model/{version}/...`

## Capabilities

### New Capabilities
- `coverage-management`: Coverage 信息与 coverage-analyst 关系管理。
- `sector-management`: 两级行业分类管理与层级约束。
- `template-file-management`: 报告模板（Word/Excel）上传、版本与启用状态管理。

### Modified Capabilities
- `desktop-nav`: 新增 Coverage/Sector/Template 管理入口（Coverage 对 Admin/Analyst 可见，Sector/Template 仅 Admin）。
- `role-control`: 扩展这三个管理模块的功能权限判定与路由守卫。
- `user-management`: 创建用户支持“是否邮件确认”开关。

## Impact

- Affected code:
  - `web/app/coverage/*`, `web/app/sectors/*`, `web/app/templates/*`
  - `web/features/coverage/*`, `web/features/sectors/*`, `web/features/templates/*`
  - `web/domain/schemas/*`（新增 coverage/sector/template schema）
- Database:
  - 新增/完善 `coverage`、`coverage_analyst`、`sector`、`template` 表与约束
  - 增补 RLS policies 与索引
- Storage:
  - 新增模板存储 bucket/路径规范与权限策略
- Testing:
  - 新增 E2E：coverage/sectors/templates CRUD、权限、RLS、模板版本切换
