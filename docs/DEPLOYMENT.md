# 部署

本文档说明 Neoport 的生产部署架构、自动部署流程和运维要点。

## 架构总览

```
本地改代码 → push 到 master
     │
     ▼
GitHub Actions（.github/workflows/deploy-fc.yml）
     │  pnpm build → 打包 standalone → s deploy
     ▼
阿里云函数计算 FC 3.0（cn-hongkong）
     │
     ▼
https://neoport.opendeip.ai  （自定义域名 + HTTPS）
```

前端用阿里云 FC（函数计算）托管，是 Vercel 的国内平替：push 到 `master`，
2-3 分钟自动构建并上线，无需手动部署。

## 运行环境

| 项 | 值 |
|----|-----|
| 平台 | 阿里云 FC 3.0，地域 cn-hongkong |
| 运行时 | custom.debian10（自带 Node 20 二进制，见下方「为什么自带 Node」） |
| 规格 | 0.5 vCPU + 512MB，按量付费（低流量约 ¥5-8/月） |
| 域名 | neoport.opendeip.ai，CNAME 到 FC，Let's Encrypt 证书 |
| 冷启动 | 闲置后首次访问 1-3 秒，之后 <0.3s |

## 自动部署

工作流文件：`.github/workflows/deploy-fc.yml`

**触发条件：**
- push 到 `master` 且改动了 `web/**` 或工作流本身
- 手动触发（Actions 页面 → Run workflow）

**流程：**
1. `pnpm install` + `pnpm build`（Next.js standalone 输出）
2. `scripts/build-fc-package.sh` 打包：standalone 产物 + 静态资源 + Node 20 + bootstrap
3. `s config add` 配置阿里云凭据
4. `s deploy` 部署到 FC

**分支约定：** `master` 是生产分支，push 即上线。日常开发在 `test`
分支进行，不会触发部署；完成后合并到 `master` 才发布。

## 环境变量

通过 GitHub Secrets 注入，分两类（Next.js 特性）：

| 变量 | 注入时机 | 说明 |
|------|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 构建时 | 烤进前端包，浏览器用 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 构建时 | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | 运行时 | FC 函数环境变量，服务端用 |
| `NEOLYST_SUPABASE_URL` | 运行时 | 连 neolyst 库取已发布报告 |
| `NEOLYST_SUPABASE_ANON_KEY` | 运行时 | 同上 |
| `NEOLYST_SUPABASE_SERVICE_ROLE_KEY` | 运行时 | 同上 |

> `NEXT_PUBLIC_*` 是构建时烤进 JS 的，改了必须重新部署才生效。
> 本地开发把这些写在 `web/.env`（已 gitignore），参考 `web/.env.example`。

## 数据库

Neoport 连两个独立的 Supabase：

| 用途 | 地址 |
|------|------|
| Neoport 自己的库 | https://neoport-db.opendeip.ai |
| 取 neolyst 已发布报告 | https://supabase.opendeip.ai |

两个库都是阿里云 RDS Supabase（cn-hongkong），通过 hermes prod 的
nginx 反向代理提供 HTTPS（避免 HTTPS 页面请求 HTTP 接口的混合内容拦截）。

迁移推送见 `docs/SUPABASE_DB_VERSIONING.md`，初始用户见 `supabase/seed.ts`。

## 凭据

> 本节含敏感凭据，仅供内部交接。neoport 是私有仓库。

### 前端登录

| 项 | 值 |
|----|-----|
| 地址 | https://neoport.opendeip.ai/login |
| 账号 | admin@opendelp.com |
| 密码 | 99VPOVt4ZZHK@Port26 |

### 数据库（neoport 自己的 RDS Supabase）

| 项 | 值 |
|----|-----|
| 阿里云实例 | ra-supabase-mjhjahz2tioehk |
| API（HTTPS） | https://neoport-db.opendeip.ai |
| API（直连） | http://47.56.57.12 |
| Studio | http://47.56.57.12 （supabase / P2oudyyrBW3X84oRTiAa9_） |
| PG 公网直连 | pgm-j6ct7fx4163ih85f-port.pg.cnhk.rds.aliyuncs.com:5432 |
| PG 用户/密码 | postgres / P2oudyyrBW3X84oRTiAa9_ |
| 数据库名 | supabase_db |

### 环境变量完整值（GitHub Secrets / FC 函数）

```
NEXT_PUBLIC_SUPABASE_URL=https://neoport-db.opendeip.ai
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgxMjY2NDM3LCJleHAiOjEzMjkxOTA2NDM3fQ.5J18DrmYeQDw0i5cjR4cX-UR2kTw4eg-kQxrHo-5zCg
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3ODEyNjY0MzcsImV4cCI6MTMyOTE5MDY0Mzd9.-8Y5oYG2QMxlADNf6NzkUq9Jww4u9_ATjYEAc3NS_zE
NEOLYST_SUPABASE_URL=https://supabase.opendeip.ai
NEOLYST_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgwOTEwNzc5LCJleHAiOjEzMjkxNTUwNzc5fQ.K-kKy9GtZdhNfww_V7pQ-GSEgrRaDySBr2eNyQoDPHE
NEOLYST_SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3ODA5MTA3NzksImV4cCI6MTMyOTE1NTA3Nzl9.ZBuEvncVIVqTprA6xO74xZj3b_DHbbZA9uCp1EZ_htI
```

另需阿里云凭据 Secret：`ALIYUN_AK_ID`、`ALIYUN_AK_SECRET`。

## 同步定时任务（neolyst → neoport）

把 neolyst 已发布的报告每 5 分钟同步到 neoport（含报告数据 + 附件文件）。

- 实现：独立 FC event 函数 `neoport-sync`（不在前端函数里，因为 HTTP 函数不能挂触发器）
- 代码：`web/fc-sync/`（handler + s.yaml），同步逻辑复用 `web/scripts/sync-reports-from-neolyst.ts`
- 触发：FC 定时触发器 `@every 5m`
- 构建/部署/测试方法见 `web/fc-sync/README.md`

> 注意：这只同步报告数据，不发邮件。邮件分发是另一个脚本
> （`scripts/process-auto-distribution-queue-standalone.ts`），未部署。

## 关键约定（踩过的坑）

- **为什么自带 Node**：FC custom runtime 基础镜像 GLIBC 太旧（<2.27），
  跑不了官方 Node 20。所以 runtime 用 `custom.debian10`（GLIBC 2.28），
  并把 Node 20 二进制打进部署包，由 `bootstrap` 启动。
- **standalone 打包**：必须 `cp -a .next/standalone/.`（带点复制隐藏的
  `.next/server`），否则函数启动秒退。打包逻辑已封装在 `scripts/build-fc-package.sh`。
- **customRuntimeConfig 要带 command**：FC 函数配置里 `command` 必须指向
  `/code/bootstrap`，否则不知道如何启动，健康检查超时。已在 `web/s.yaml` 配好。
- **HTTPS 必需**：前端走 HTTPS，数据库接口也必须 HTTPS，否则浏览器拦截混合内容。

## 手动部署（应急）

```bash
cd web
# 设好 6 个环境变量后
pnpm build
bash scripts/build-fc-package.sh
s deploy -y
```
