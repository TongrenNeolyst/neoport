# 技术栈

本文档整理 Neoport 项目的技术选型。

## 技术栈总览

```
┌─────────────────────────────────────────────────┐
│                   前端 (Web)                     │
│  Next.js 16 + React 19 + Tailwind CSS 4        │
│  Tiptap (富文本) + Zod (验证)                   │
└────────────────────┬────────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────────┐
│              Supabase 平台                      │
│  PostgreSQL 17 + PostgREST + Auth + RLS        │
│  本地开发: Supabase CLI                         │
└─────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              外部服务                            │
│  SMTP 邮件服务                                   │
└─────────────────────────────────────────────────┘
```

## 前端框架

| 技术 | 版本 | 说明 |
|------|------|------|
| Next.js | ^16.1.6 | 主框架，使用 App Router |
| React | ^19.2.4 | UI 库 |
| TypeScript | ^5.9.3 | 类型系统 |

## UI / 样式

| 技术 | 版本 | 说明 |
|------|------|------|
| Tailwind CSS | ^4.1.18 | CSS 框架 |
| PostCSS | ^8.5.6 | CSS 处理 |
| Lucide React | ^0.574.0 | 图标库 |
| next-themes | ^0.4.6 | 主题切换 |
| tailwindcss-animate | ^1.0.7 | 动画工具 |

## 状态与表单

| 技术 | 版本 | 说明 |
|------|------|------|
| Zod | ^4.3.6 | 数据验证 |
| clsx | ^2.1.1 | 条件类名合并 |
| tailwind-merge | ^3.5.0 | Tailwind 类合并 |

## 后端即服务 (BaaS)

| 技术 | 版本 | 说明 |
|------|------|------|
| @supabase/supabase-js | ^2.95.3 | 数据库客户端 |
| @supabase/ssr | ^0.8.0 | 服务端渲染支持 |

## 数据库

| 技术 | 版本 | 说明 |
|------|------|------|
| PostgreSQL | 17 | 主数据库 |
| PostgREST | - | REST API 生成 |
| RLS | - | Row Level Security 行级安全 |
| Supabase CLI | - | 本地开发环境 |

## 富文本编辑

| 技术 | 版本 | 说明 |
|------|------|------|
| Tiptap | ^3.20.0 | React 富文本编辑器 |
| @tiptap/react | ^3.20.0 | React 绑定 |
| @tiptap/starter-kit | ^3.20.0 | 基础扩展 |
| @tiptap/extension-placeholder | ^3.20.0 | 占位符扩展 |

## 邮件

| 技术 | 版本 | 说明 |
|------|------|------|
| Nodemailer | ^8.0.1 | 邮件发送 |

## 测试

| 技术 | 版本 | 说明 |
|------|------|------|
| Playwright | ^1.58.2 | E2E 测试 |

## 开发工具

| 技术 | 说明 |
|------|------|
| pnpm | ^10.29.3 包管理器 |
| Supabase CLI | 本地数据库开发 |
| ESLint | 代码检查 |
| tsx | TypeScript 执行器 |

## 部署

| 技术 | 说明 |
|------|------|
| Docker | 容器化部署 Next.js 应用 |
| Node.js | 20 运行时 |
| Docker Compose | 本地开发环境编排 |

## 目录结构

```
neoport/
├── web/                  # Next.js 应用
│   ├── app/             # App Router 页面
│   ├── components/      # React 组件
│   └── lib/             # 工具函数
├── supabase/            # 数据库配置
│   ├── migrations/      # 数据库迁移
│   └── seed/           # 数据种子
├── tests/              # Playwright 测试
├── docs/               # 文档
├── openspec/           # 变更管理
└── scripts/            # 构建脚本
```

## 环境配置

### 开发环境要求

- Node.js 18+
- pnpm 10+

## 服务器需求

### 生产环境

| 类型 | 配置 | 说明 |
|------|------|------|
| **前端应用** | Docker 容器 | Next.js 应用，Node.js 20 运行时 |
| **数据库** | Supabase 托管 | PostgreSQL 17，由 Supabase 提供托管服务 |
| **邮件服务** | SMTP 服务 | 推荐阿里云邮件推送或其他 SMTP 服务商 |

### 开发环境

| 类型 | 配置 | 说明 |
|------|------|------|
| 本地数据库 | Supabase CLI | Docker 容器运行 PostgreSQL 17 |
| Node.js 运行时 | v18+ | 本地开发调试 |
| 包管理器 | pnpm 10+ | 依赖管理 |

### 存储需求

| 用途 | 需求 | 说明 |
|------|------|------|
| 代码仓库 | - | Git 托管 (如 GitHub/Gitee) |
| 数据库备份 | 自动 | Supabase 提供每日备份 |
| 静态资源 | - | Next.js 静态导出或 CDN |

### 网络与安全

| 项目 | 需求 |
|------|------|
| HTTPS | 必需，Docker 部署可通过 Nginx/Caddy 实现自动 HTTPS |
| 环境变量 | 使用 .env 存储敏感信息，不提交到代码仓库 |
| CORS | 前端域名需在 Supabase 控制台配置允许 |

## 相关文档

- [README.md](./README.md) - 项目概览
- [web/docs/README.md](./web/docs/README.md) - Next.js 应用文档
- [supabase/README.md](./supabase/README.md) - 数据库文档
