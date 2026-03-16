# Supabase 问题排查备忘

> 本文件记录 Supabase 开发过程中遇到的问题和解决方案。

---

## 1. Auth API 500 错误排查

### 症状
- 登录/注册请求返回 500 Internal Server Error
- Supabase Dashboard 中 Auth 相关操作失败

### 排查步骤

1. **检查 auth.users 表完整性**
   ```sql
   -- 查看是否有 NULL 字段导致的约束违规
   SELECT id, email, created_at, updated_at
   FROM auth.users
   WHERE email IS NULL OR created_at IS NULL;
   ```

2. **使用诊断脚本**
   ```powershell
   cd tests
   node scripts/verify/diagnose-auth-500.mjs
   ```

3. **检查 gotrue 日志**（云端 Dashboard > Logs）

### 常见原因
- 直接 INSERT auth.users 导致字段缺失（见下节）
- RLS 策略阻止了必要的读取操作
- 触发器或函数执行失败

---

## 2. 直接 INSERT auth.users 导致 gotrue 失败

### 问题描述
Supabase 的 Auth 服务（gotrue）依赖 `auth.users` 表的特定字段和触发器。直接通过 SQL INSERT 创建用户会：
- 缺少 `aud`、`confirmation_token` 等必需字段
- 不触发 `on_auth_user_created` 触发器
- 导致后续登录/密码验证失败

### 正确做法

**方式 1：使用 Auth API（推荐）**
```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
})
```

**方式 2：使用 admin API（服务端）**
```javascript
const { data, error } = await supabase.auth.admin.createUser({
  email: 'user@example.com',
  password: 'secure-password',
  email_confirm: true
})
```

**方式 3：测试用户批量创建**
使用项目提供的脚本：
```powershell
cd tests
node setup/create-test-users.mjs
```

### 修复已损坏的用户

如果已经直接 INSERT 导致用户损坏：
```sql
-- 补充必需字段（示例）
UPDATE auth.users
SET
  aud = 'authenticated',
  confirmation_token = encode(gen_random_bytes(32), 'hex'),
  recovery_token = encode(gen_random_bytes(32), 'hex'),
  email_change_token_new = '',
  email_change_token_current = ''
WHERE aud IS NULL;
```

或使用修复脚本：
```powershell
cd tests
node scripts/verify/fix-user-null-fields.mjs
```

---

## 3. CLI 常见问题

### db push 不支持 --project-ref

**问题**：`supabase db push --project-ref xxx` 报错说不支持该参数。

**原因**：db push 默认推送到已 link 的项目。

**解决**：
```powershell
# 先 link
supabase link --project-ref <project-ref>

# 再 push（不需要 --project-ref）
$pw = (Get-Content -Raw supabase/supabase_db_password.token).Trim()
supabase db push --include-seed -p $pw --yes
```

### PAT 认证失败

**症状**：`SUPABASE_ACCESS_TOKEN invalid` 或 401 错误。

**排查**：
1. 确认 PAT 未过期（Supabase Dashboard > Account > Access Tokens）
2. 确认 PAT 有正确的权限
3. 检查 token 文件是否有换行符或空格

```powershell
# 正确设置方式（注意 Trim）
$env:SUPABASE_ACCESS_TOKEN = (Get-Content -Raw supabase/supabase_access.token).Trim()

# 或使用 login
supabase login --token (Get-Content -Raw supabase/supabase_access.token).Trim()
```

### migration list 显示不一致

**症状**：Local/Remote 版本不匹配。

**解决**：
1. 确认 link 正确：`supabase link --project-ref <ref>`
2. 检查远端迁移历史：
   ```powershell
   supabase migration list --linked
   ```
3. 如果远端缺少迁移，执行 db push
4. 如果本地上次迁移已执行但远端显示未执行，可能是迁移记录不同步

---

## 4. 验收脚本使用说明

项目提供了一套不依赖 Docker/psql 的验收脚本。

### DB 直连验收

验收默认 Admin 幂等 + RLS 策略：
```powershell
cd tests
node scripts/verify/verify-db-admin-and-rls.mjs
```

### Auth 故障诊断

直连 Postgres 查看 auth 表状态：
```powershell
cd tests
node scripts/verify/diagnose-auth-500.mjs
```

### 检查用户身份
```powershell
cd tests
node scripts/verify/check-identities.mjs
```

### 修复用户 NULL 字段
```powershell
cd tests
node scripts/verify/fix-user-null-fields.mjs
```

---

*最后更新: 2026-02-17*
