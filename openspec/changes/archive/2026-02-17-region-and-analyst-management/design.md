# Region and Analyst Management 设计

## 一、设计基线与架构原则

### 1.1 继承的设计基线

本 change 完全继承 `auth-and-users-mvp` 建立的设计基线：

**技术栈**
- Next.js App Router 为唯一应用入口
- Supabase（Database + PostgREST + RLS + Auth）

**交互模式**
- Server-first 架构（Server Components + Server Actions）
- Repository 模式封装数据访问
- 写操作使用 Server Actions，不建设对外稳定的 REST API

**安全原则**
- `SUPABASE_SERVICE_ROLE_KEY` 仅服务端可用
- 浏览器不直连 Supabase Admin API

**UI 规范**
- UI 语言：英文
- 时间展示：Asia/Shanghai（UTC+8）

**工具链**
- `pnpm` + 项目本地 `node_modules`

### 1.2 Supabase 能力边界

**使用的 Supabase 能力**
- ✅ Database（PostgreSQL）
- ✅ PostgREST（业务数据 CRUD）
- ✅ RLS（行级安全策略）
- ✅ Auth（用户认证与会话）

**不使用的 Supabase 能力**
- ❌ Edge Functions（使用 Next.js Server Actions 替代）
- ❌ Realtime（本阶段不需要实时功能）
- ❌ Storage（本阶段不涉及文件上传）

### 1.3 依赖与前置

**数据层**
- 数据表与 RLS 迁移已存在：`supabase/migrations/20260214094418_auth_and_user_management_baseline.sql`
- 本 change 主要实现页面与交互，以及验证权限策略与 CRUD 流程

---

## 二、数据模型设计

### 2.1 数据表结构

**region 表**
- 地区字典，系统预置数据
- 唯一性约束：`name`、`code`

**analyst 表**
- 业务分析师信息
- 唯一性约束：`email`
- 外键：`region_id`（`ON DELETE SET NULL`）

### 2.2 系统预置数据

**预置 Regions**
- China、Hong Kong、Japan、Taiwan、Korea、India、Macau、US

### 2.3 数据关系与约束

**解耦原则**
- `analyst` 为业务信息表，与 Auth Users 完全解耦
- 创建/删除 Analyst 信息不自动创建/删除用户账号
- Analyst 业务数据通过 `email` 与未来业务逻辑关联，不做外键强绑定到 Auth 用户

**删除策略**
- Region 删除：若被 Analyst 引用，其 `region_id` 自动置空（数据库策略 `ON DELETE SET NULL`）
- 不做关联阻断，允许删除被引用的 Region

**数据完整性校验**
- Regions：`name`、`code` 唯一性
- Analyst Info：`email` 唯一性

---

## 三、权限与安全设计

### 3.1 双层权限架构

**功能权限（应用层）**
- UI 层控制：页面访问拦截、入口卡片显示控制
- Regions / Analyst Info 页面与写操作：Admin-only
- 非 Admin 访问受保护页面重定向到 `/403`

**数据权限（RLS，数据库层兜底）**
- `region`/`analyst` 表：认证用户可读
- 写操作：仅 Admin（以 JWT `app_metadata.role` 判定）
- 即使应用层有漏洞，RLS 也能保护数据

### 3.2 写操作安全保障

- 所有写操作必须通过 Server Actions（服务端执行）
- Server Actions 中进行权限验证（`requireAdmin()`）
- 浏览器不直连 Supabase Admin API

---

## 四、页面与交互设计

### 4.1 页面路由

**管理页面**
- `/regions`（Admin-only）：Regions 管理页面
- `/analyst-info`（Admin-only）：Analyst Info 管理页面

**导航入口**
- Desktop 增加两张卡片（Admin-only 显示）
- 点击卡片新标签页打开对应页面

### 4.2 列表与分页

**统一分页规则**
- 默认排序：`created_at DESC`
- 分页阈值：超过 15 条时分页
- 每页固定 15 条
- 不提供每页条数切换

**搜索功能**
- Regions：按 `name`、`code` 模糊匹配
- Analyst Info：按 `full_name`、`chinese_name`、`email` 模糊匹配

### 4.3 CRUD 交互流程

**Regions 管理**
- 列表展示：`name`、`code`、`created_at`
- 创建/编辑：使用 Modal 表单，字段 `name`、`code`（必填）
- 删除：需二次确认
- 唯一性冲突：字段级错误提示

**Analyst Info 管理**
- 列表展示：`full_name`、`chinese_name`、`email`、`region`、`is_active`
- 创建/编辑：使用 Modal 表单，必填字段 `full_name`、`email`、`region`
- 删除：需二次确认
- 唯一性冲突：字段级错误提示

---

## 五、技术实现方案

### 5.1 文件结构

```
web/
├── app/
│   ├── regions/
│   │   └── page.tsx                     # Regions 列表页（Server Component）
│   └── analyst-info/
│       └── page.tsx                     # Analyst Info 列表页（Server Component）
│
├── features/
│   ├── regions/
│   │   ├── index.ts                     # 公共入口
│   │   ├── actions.ts                   # Server Actions
│   │   ├── repo/
│   │   │   └── regions-repo.ts          # 数据访问层（server-only）
│   │   └── components/
│   │       ├── regions-page.tsx         # 服务端页面组件
│   │       ├── regions-page-client.tsx  # 客户端交互组件（'use client'）
│   │       └── region-form.tsx          # 创建/编辑表单
│   │
│   └── analyst-info/
│       ├── index.ts
│       ├── actions.ts
│       ├── repo/
│       │   └── analysts-repo.ts         # 数据访问层（server-only）
│       └── components/
│           ├── analysts-page.tsx
│           ├── analysts-page-client.tsx
│           └── analyst-form.tsx
│
└── domain/
    └── schemas/
        ├── region.ts                    # Zod schema for Region
        └── analyst.ts                   # Zod schema for Analyst
```

### 5.2 数据访问层（Repository 模式）

**职责**
- 封装所有数据库操作（CRUD）
- 统一错误处理
- 标记为 `server-only`，确保不被客户端组件直接引用

**Supabase 客户端选择**
- Regions/Analyst 业务数据：使用 `createServerClient()`（RLS 保护）
- 如需绕过 RLS 的敏感操作：使用 `createAdminClient()`

**调用关系**
```
Server Component        Server Action
      │                       │
      └─────────┬─────────────┘
                ▼
         Repository (server-only)
                │
                ▼
        createServerClient()
        或 createAdminClient()
```

### 5.3 Server Actions 接口设计

**Regions Actions**

```typescript
// features/regions/actions.ts

// 列表查询（支持分页、搜索）
export async function listRegionsAction(params: {
  page: number;
  query: string | null;
}): Promise<Result<PaginatedList<Region>>>

// 创建 Region
export async function createRegionAction(data: {
  name: string;
  code: string;
}): Promise<Result<Region>>

// 更新 Region
export async function updateRegionAction(
  id: string,
  data: { name?: string; code?: string }
): Promise<Result<Region>>

// 删除 Region
export async function deleteRegionAction(id: string): Promise<Result<null>>
```

**Analyst Info Actions**

```typescript
// features/analyst-info/actions.ts

// 列表查询（支持分页、搜索）
export async function listAnalystsAction(params: {
  page: number;
  query: string | null;
}): Promise<Result<PaginatedList<Analyst>>>

// 创建 Analyst
export async function createAnalystAction(data: {
  full_name: string;
  chinese_name?: string;
  email: string;
  region_id: string;
  suffix?: string;
  sfc?: string;
}): Promise<Result<Analyst>>

// 更新 Analyst
export async function updateAnalystAction(
  id: string,
  data: Partial<{
    full_name: string;
    chinese_name: string;
    email: string;
    region_id: string;
    suffix: string;
    sfc: string;
    is_active: boolean;
  }>
): Promise<Result<Analyst>>

// 删除 Analyst
export async function deleteAnalystAction(id: string): Promise<Result<null>>

// 获取所有 Regions（用于表单下拉选择）
export async function getRegionsForSelectAction(): Promise<Result<Region[]>>
```

**实现要点**
- 每个 Action 都使用 `"use server"` 指令
- 写操作 Action 调用 `requireAdmin()` 验证权限
- 返回统一类型 `Result<T>`（ok/err）
- 写操作成功后调用 `revalidatePath()` 刷新缓存

### 5.4 错误处理策略

**唯一性冲突处理**
- 识别 Supabase 错误码 `23505`（unique_violation）
- 根据约束名称返回字段级错误提示：
  - `region_name_unique` → "Region name already exists"
  - `region_code_unique` → "Region code already exists"
  - `analyst_email_unique` → "Email already exists"
- 未识别错误返回通用提示

**删除关联处理**
- Region 删除：依赖数据库 `ON DELETE SET NULL`，不做应用层检查
- Analyst 删除：当前无关联表，直接删除

**权限错误处理**
- 未登录：返回 401
- 非管理员：返回 403
- Server Action 层和 RLS 层双重保障

### 5.5 数据验证（Zod Schemas）

**Region Schema**
```typescript
// domain/schemas/region.ts
export const regionSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10),
});

export const regionUpdateSchema = regionSchema.partial();
```

**Analyst Schema**
```typescript
// domain/schemas/analyst.ts
export const analystSchema = z.object({
  full_name: z.string().min(1).max(200),
  chinese_name: z.string().max(100).optional(),
  email: z.string().email(),
  region_id: z.string().uuid(),
  suffix: z.string().max(50).optional(),
  sfc: z.string().max(50).optional(),
  is_active: z.boolean().optional(),
});

export const analystUpdateSchema = analystSchema.partial();

// 创建时必填字段
export const analystCreateSchema = analystSchema.pick({
  full_name: true,
  chinese_name: true,
  email: true,
  region_id: true,
  suffix: true,
  sfc: true,
});
```

**使用位置**
- Server Actions 接收参数时验证
- 表单组件字段验证
- Repository 层作为兜底验证
