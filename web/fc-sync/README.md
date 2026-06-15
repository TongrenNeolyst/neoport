# neoport-sync — 同步定时任务

把 neolyst 已发布的报告定时同步到 neoport（每 5 分钟）。

## 是什么

- 独立的阿里云 FC event 函数 `neoport-sync`，挂 `@every 5m` 定时触发器
- 每次触发跑一遍 `syncOnce()`（在 `../scripts/sync-reports-from-neolyst.ts`）：
  从 neolyst 库读最近发布的报告 → 写入 neoport 库 + 复制附件到 `external-reports` bucket
- 幂等：已同步的报告会跳过

> 为什么单独一个函数：neoport 前端是 HTTP 函数，FC 规定 HTTP 函数不能再加其它触发器，
> 所以定时任务必须用独立的 event 函数。

## 文件

| 文件 | 作用 |
|------|------|
| `handler.ts` | FC event 入口，调一次 syncOnce |
| `s.yaml` | FC 部署声明（含定时触发器；环境变量用占位，部署时从环境注入） |
| `dist/index.js` | esbuild 打的单文件 bundle（构建产物，gitignore，部署前现打） |

## 构建 + 部署

```bash
cd web
# 1. 打包 handler 为单文件（含 @supabase/supabase-js 依赖）
node_modules/.bin/esbuild fc-sync/handler.ts \
  --bundle --platform=node --target=node20 --format=cjs \
  --outfile=fc-sync/dist/index.js

# 2. 设环境变量（4 个，值见仓库 docs/DEPLOYMENT.md 凭据节）
export NEXT_PUBLIC_SUPABASE_URL=...        # neoport 库
export SUPABASE_SERVICE_ROLE_KEY=...        # neoport service key
export NEOLYST_SUPABASE_URL=...             # neolyst 库
export NEOLYST_SUPABASE_SERVICE_ROLE_KEY=... # neolyst service key

# 3. 部署（含定时触发器）
cd fc-sync && s deploy -y
```

## 手动测试

```bash
cd web/fc-sync && s invoke
# 输出 synced=N skipped=M errors=0 即正常
```

## 调整频率

改 `s.yaml` 的 `cronExpression`（`@every 5m` 或标准 6 段 cron），重新 `s deploy`。
