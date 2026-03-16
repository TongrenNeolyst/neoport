# Neoport

研报查看系统。

## 目录结构

```
neolyst/                      # 开发环境根目录
│
├─ .claude/                   # Claude Code 配置
├─ .codex/                    # Codex 配置
├─ CLAUDE.md                  # Claude Code 指令
├─ AGENTS.md                  # 通用 AI Agent 指令
│
├─ supabase/                  # 基础设施
├─ openspec/                  # 变更管理
│
├─ web/                       # Next.js 应用（交付物）
│
├─ package.json               # 根目录脚本（supabase）
└─ README.md
```

## 开发环境

### 前置要求

- Node.js 18+
- pnpm 10+
- Supabase CLI（可选，本地数据库开发）

### 快速开始

```bash
# 1. 安装依赖
cd web && pnpm install

# 2. 启动开发服务器
pnpm dev
```

访问 http://localhost:3001

### Supabase

```bash
pnpm supabase:start           # 启动本地 Supabase
pnpm supabase:stop            # 停止
pnpm supabase:db:push         # 推送数据库迁移
```

## 项目约定

- 包管理：使用 **pnpm**，禁止 npm/yarn
- 环境变量：`web/.env` 可提交到 Git
- AI 工具：Claude Code (`.claude/`)、Codex (`.codex/`)

## 相关文档

| 文档 | 说明 |
|------|------|
| [docs/README.md](./docs/README.md) | Next.js 应用（含 Web 启动/规范入口） |
| [supabase/README.md](./supabase/README.md) | 数据库版本管理 |
| [docs/README.md](./docs/README.md) | 跨目录规范与约定入口（Decisions/Conventions/Testing） |
| [openspec/](./openspec/) | 变更管理 |
| [CLAUDE.md](./CLAUDE.md) | Claude Code 指令 |
