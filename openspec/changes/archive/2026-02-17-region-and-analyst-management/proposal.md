# Region and Analyst Management

## 一、目标与背景

### 1.1 背景

在系统框架与 Users 管理跑通之后，需要补齐基础数据管理能力（Regions、Analyst Info）与对应的权限控制，支撑后续业务（例如报告创建时选择 Region、按 Analyst 信息展示等）。

### 1.2 功能目标

**Regions 管理（Admin-only）**
- 列表、创建、编辑、删除
- 唯一性校验（name/code）
- 系统预置 Region：China、Hong Kong、Japan、Taiwan、Korea、India、Macau、US

**Analyst Info 管理（Admin-only）**
- 列表、创建、编辑、删除
- email 唯一性校验
- 关联 Region（`region_id`）
- 列表展示字段：`full_name`、`chinese_name`、`email`、`region`、`is_active`
- 支持按 `full_name`、`chinese_name`、`email` 搜索

**Desktop 入口**
- 增加两个管理入口卡片（Admin-only 展示）
- 遵循新标签页打开契约

**权限控制**
- 功能权限：只有 Admin 可见入口、访问页面、执行写操作
- 数据权限：RLS 兜底（认证可读，Admin 可写）

### 1.3 权限模型

本 change 继承并扩展 `auth-and-user-management` 建立的权限模型，采用**双层权限架构**：

**功能权限（应用层）**
- 控制页面入口、按钮显示、操作权限
- 在 UI 层和 Server Actions 层实施

**数据权限（数据库层）**
- 通过 RLS（Row Level Security）兜底
- 即使应用层有漏洞，RLS 也能保护数据

#### 1.3.1 角色功能权限矩阵

| 功能模块 | 功能能力 | Admin | SA | Analyst |
|---------|---------|-------|----|---------|
| **认证与会话** | | | | |
| | 登录/登出 | ✅ | ✅ | ✅ |
| | 忘记密码（邮件重置） | ✅ | ✅ | ✅ |
| **用户管理** | | | | |
| | 访问 Users 页面 | ✅ | ❌ | ❌ |
| | 查看用户列表 | ✅ | ❌ | ❌ |
| | 创建用户（邀请） | ✅ | ❌ | ❌ |
| | 编辑用户信息 | ✅ | ❌ | ❌ |
| | 修改用户角色 | ✅ | ❌ | ❌ |
| | 删除用户 | ✅ | ❌ | ❌ |
| | 启用/禁用用户 | ✅ | ❌ | ❌ |
| | 管理员直接修改用户密码 | ✅ | ❌ | ❌ |
| **Region 管理** | | | | |
| | 访问 Regions 页面 | ✅ | ❌ | ❌ |
| | 查看 Region 列表 | ✅ | ❌ | ❌ |
| | 创建 Region | ✅ | ❌ | ❌ |
| | 编辑 Region | ✅ | ❌ | ❌ |
| | 删除 Region | ✅ | ❌ | ❌ |
| **Analyst Info 管理** | | | | |
| | 访问 Analyst Info 页面 | ✅ | ❌ | ❌ |
| | 查看 Analyst 列表 | ✅ | ❌ | ❌ |
| | 创建 Analyst | ✅ | ❌ | ❌ |
| | 编辑 Analyst | ✅ | ❌ | ❌ |
| | 删除 Analyst | ✅ | ❌ | ❌ |
| **Desktop 入口** | | | | |
| | Users 卡片显示 | ✅ | ❌ | ❌ |
| | Regions 卡片显示 | ✅ | ❌ | ❌ |
| | Analyst Info 卡片显示 | ✅ | ❌ | ❌ |

**说明**：
- 所有管理功能（Users、Regions、Analyst Info）仅 Admin 可用
- SA 和 Analyst 角色本阶段权限一致，预留 SA 后续报告审核能力
- 非 Admin 访问受保护页面会被重定向到 `/403`

#### 1.3.2 角色数据表权限矩阵（RLS）

| 数据表 | SELECT | INSERT | UPDATE | DELETE | 说明 |
|-------|--------|--------|--------|--------|------|
| **auth.users** | | | | | Supabase Auth 用户表 |
| | 自己的记录 | ❌ | 自己的记录 | ❌ | 通过 Auth Admin API 管理读写 |
| **region** | | | | | 地区字典表 |
| | 所有已认证用户 | 仅 Admin | 仅 Admin | 仅 Admin | 基础数据允许读取，管理仅 Admin |
| **analyst** | | | | | 业务分析师表 |
| | 所有已认证用户 | 仅 Admin | 仅 Admin | 仅 Admin | 基础数据允许读取，管理仅 Admin |

**说明**：
- `auth.users`：通过 Supabase Auth Admin API 管理，不直接通过 RLS
- `region`/`analyst`：读权限向已认证用户开放，支持后续业务（如报告创建时选择 Region）
- 写操作（INSERT/UPDATE/DELETE）仅 Admin 可执行
- RLS 策略基于 JWT `app_metadata.role` 判定角色

---

## 二、需求

### 2.1 功能需求详情

**Regions 管理功能**
- 列表展示：name、code、created_at
- 创建必填：name、code
- 编辑：可修改 name、code
- 删除：需二次确认，删除 Region 时 Analyst 的 `region_id` 自动置空（`ON DELETE SET NULL`）
- 搜索：按 name、code 模糊匹配
- 访问控制：Admin 可访问 `/regions`，非 Admin 拦截到 `/403`

**Analyst Info 管理功能**
- 列表展示：full_name、chinese_name、email、region、is_active
- 创建必填：full_name、email、region
- 编辑：可修改所有字段
- 删除：需二次确认
- 搜索：按 full_name、chinese_name、email 模糊匹配
- 访问控制：Admin 可访问 `/analyst-info`，非 Admin 拦截到 `/403`

**Desktop 入口功能**
- Admin 可见 Regions 和 Analyst Info 卡片
- 非 Admin 不可见上述卡片
- 点击卡片在新标签页打开对应页面

### 2.2 业务约束

**数据关系约束**
- Analyst 信息与 Auth Users 解耦：创建/删除 Analyst 信息不自动创建/删除用户账号
- Analyst 业务数据通过 email 与未来业务逻辑关联，不做外键强绑定到 Auth 用户
- 删除 Region 时，若被 Analyst 引用，其 `region_id` 自动置空（`ON DELETE SET NULL`）

**数据完整性与校验**
- Regions：name、code 必须唯一
- Analyst Info：email 必须唯一
- 字段级错误提示：唯一性冲突时明确提示具体字段

### 2.3 验收标准

**Regions 管理**
- [ ] Admin 可访问 `/regions` 页面，非 Admin 被拦截到 `/403`
- [ ] 列表正确显示所有 Region（name、code、created_at）
- [ ] 创建 Region 成功，name/code 唯一性冲突有明确字段级错误提示
- [ ] 编辑 Region 成功，唯一性冲突处理同上
- [ ] 删除 Region 需二次确认，删除后若被 Analyst 引用则其 `region_id` 自动置空
- [ ] 搜索按 name/code 模糊匹配

**Analyst Info 管理**
- [ ] Admin 可访问 `/analyst-info` 页面，非 Admin 被拦截到 `/403`
- [ ] 列表正确显示：full_name、chinese_name、email、region、is_active
- [ ] 创建 Analyst 成功，必填字段校验（full_name、email、region）
- [ ] email 唯一性冲突有明确错误提示
- [ ] 编辑 Analyst 成功，可修改所有字段
- [ ] 删除 Analyst 需二次确认
- [ ] 搜索按 full_name、chinese_name、email 模糊匹配

**Desktop 入口**
- [ ] Admin 可见 Regions 和 Analyst Info 卡片
- [ ] 非 Admin 不可见上述卡片
- [ ] 点击卡片在新标签页打开对应页面

**权限与安全**
- [ ] 所有写操作仅 Admin 可执行（功能层 + RLS 双重保障）
- [ ] RLS 策略：认证用户可读，仅 Admin 可写

### 2.4 非目标

- 不引入 Edge Functions
- 不使用 Realtime
- 本阶段不做字段脱敏（例如 `analyst.email` 不做部分隐藏）
- 本阶段不涉及文件上传

---

## 三、设计约束与规范

### 3.1 依赖与前置

**数据层**
- 数据表与 RLS 迁移已存在：`supabase/migrations/20260214094418_auth_and_user_management_baseline.sql`
- 本 change 主要实现页面与交互，以及验证权限策略与 CRUD 流程

### 3.2 Supabase 能力边界

**使用的 Supabase 能力**
- ✅ Database（PostgreSQL）
- ✅ PostgREST（业务数据 CRUD）
- ✅ RLS（行级安全策略）
- ✅ Auth（用户认证与会话）

**不使用的 Supabase 能力**
- ❌ Edge Functions（使用 Next.js Server Actions 替代）
- ❌ Realtime（本阶段不需要实时功能）

**架构原则**
- 复用 Supabase PostgREST + RLS 进行业务数据 CRUD
- 不自建对外稳定的 REST API
- 本阶段不涉及文件上传（Storage）

### 3.3 技术架构决策

**技术栈**
- Next.js App Router
- Supabase（Database + PostgREST + RLS + Auth）
- TypeScript

**交互策略**
- Server-first 架构（Server Components + Server Actions）
- Server Components：页面主体，直接查询 Supabase 渲染 UI
- Server Actions：处理写操作（创建、编辑、删除）
- Client Components：仅在需要状态管理和交互时局部引入

**数据访问模式**
- Repository 模式：数据访问逻辑封装在 `features/*/repo/*.ts`（server-only）
- Server Components 和 Server Actions 都调用 Repository，不直接访问数据库
- Repository 层使用 `createServerClient()` 或 `createAdminClient()`

**不建设的内容**
- 不建设对外稳定的 REST API
- 不使用 Route Handlers 作为主要业务接口（仅在必要时如认证回调）

### 3.4 安全与权限

**双层权限保障**
- 功能权限：UI 层控制（页面访问拦截、按钮显示控制）
- 数据权限：RLS 兜底（认证用户可读，仅 Admin 可写）

**写操作安全**
- 所有写操作必须通过 Server Actions（服务端执行）
- 浏览器不直连 Supabase Admin API
- RLS 作为数据层兜底，即使应用层有漏洞也能保护数据

### 3.5 交互规范

**列表分页**
- 默认排序：`created_at DESC`
- 分页策略：超过 15 条分页，每页固定 15 条
- 不提供每页条数切换功能

**删除操作**
- 所有删除操作需二次确认
- Region 删除：Analyst 的 `region_id` 自动置空（数据库策略 `ON DELETE SET NULL`）
- 不做关联阻断（允许删除被引用的 Region）
