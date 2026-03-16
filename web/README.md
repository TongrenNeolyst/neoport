# Web - Next.js Application

Neoport 系统的前端应用，使用 Next.js 16 (App Router) + Supabase 构建。

## 目录结构

```
web/
├── app/              # Next.js App Router (页面和路由)
├── components/       # React 组件
├── domain/           # 业务类型和规则
├── features/         # 业务功能模块
├── lib/              # 基础设施和工具
└── proxy.ts          # Supabase 认证代理
```

## 开发

### 安装依赖

```bash
pnpm install
```

### 环境变量配置

创建或编辑 `.env` 文件：

```bash
# Supabase (Cloud or Local)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**获取方式：**
- Cloud: [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API
- Local: 使用 `npx supabase status` 获取本地环境变量

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3001

### 构建

```bash
pnpm build
```

### 生产运行

```bash
pnpm start
```

## 技术栈

- **框架**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4
- **语言**: TypeScript 5
- **后端**: Supabase (Auth + Postgres + RLS)

## 开发规范

- 逻辑处理规范: `../../docs/LOGIC.md`
- UI 组件规范: `../../docs/UI.md`
- 测试规范: `../../docs/TESTING.md`

## 默认账号

```
Email: admin@neolyst.com
Password: Admin123
Role: Admin
```
