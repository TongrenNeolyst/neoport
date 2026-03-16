# Supabase CLI 版本管理（开发手册）

数据库规范以 `docs/SUPABASE_DB_VERSIONING.md` 为准；本文件只讲日常开发如何用 Supabase CLI 做版本管理。

## 1. 目录速览

```text
supabase/
  config.toml
  migrations/
  seed/
  seed.ts
```

## 2. 前置准备

1. 安装 Supabase CLI：`supabase --version`
2. 在仓库根目录执行命令（统一用 `pnpm` 脚本）
3. 若操作远端项目，先 `supabase link --project-ref <ref>`
4. 初始化默认从 `web/.env` 读取：
   - `NEXT_PUBLIC_SUPABASE_URL`（会映射为 `SUPABASE_URL`）
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Access Token 存放在 `supabase/supabase_access.token`，推送迁移时使用：
   ```bash
   SUPABASE_ACCESS_TOKEN=$(cat supabase/supabase_access.token) supabase db push --linked --yes
   ```

## 3. 日常工作流（推荐）

1. 新增迁移

```bash
pnpm exec supabase migration new <change_name>
```

2. 编写迁移 SQL（文件在 `supabase/migrations/`）
3. 本地重建验证（迁移 + seed）

```bash
pnpm exec supabase db reset --local
```

4. 推送到目标数据库（仅 migration）

```bash
pnpm run supabase:db:push
```

如需“迁移 + SQL seed”一起执行，使用：

```bash
pnpm exec supabase db push --linked --include-seed --yes
```

5. 核对迁移历史（本地/远端）

```bash
pnpm exec supabase migration list --linked
```

## 4. 数据初始化流程

SQL seed（由 `supabase/config.toml` 的 `[db.seed].sql_paths` 控制）：

```bash
pnpm exec supabase db reset --local
pnpm exec supabase db push --linked --include-seed --yes
```

Auth 初始化（`seed.ts`）：

```bash
pnpm run seed:auth
```

一键初始化（迁移 + SQL seed + Auth seed）：

```bash
pnpm run db:init
```

## 5. 常用命令速查

```bash
# 启停本地 Supabase 容器
pnpm run supabase:start
pnpm run supabase:stop

# 查看本地 Supabase 状态
pnpm exec supabase status

# 推送迁移
pnpm run supabase:db:push

# 推送迁移 + SQL seed（远端）
pnpm exec supabase db push --linked --include-seed --yes

# 本地重置数据库（默认会跑 seed）
pnpm exec supabase db reset --local
```

## 6. 提交前检查

1. `migrations/` 是否仅包含 schema/RLS/trigger 变更
2. `seed/` 是否保持幂等
3. `seed.ts` 是否只通过 Admin API 处理 Auth 用户
4. `pnpm exec supabase db reset --local` 是否通过

## 7. 回滚策略

- 已提交的迁移不回改，使用新迁移修复（forward-only）。
- 线上问题优先追加修复迁移，不手工改库。
