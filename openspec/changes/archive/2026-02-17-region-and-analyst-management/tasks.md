# Region and Analyst Management - 实现任务

## 1. 数据库设置

- [x] 1.1 验证 region 和 analyst 表在 migrations 中存在
- [x] 1.2 创建 seed 脚本填充预设 regions（中国、香港、日本、台湾、韩国、印度、澳门、美国）
- [ ] 1.3 运行 seed 脚本插入预设 regions

**阻塞问题：** Docker 未在 WSL 中运行。本地 Supabase 需要 Docker。
**解决方案：** 在 Windows 中启动 Docker Desktop，然后运行：
```bash
# 在 WSL 中
npx supabase start
psql $(npx supabase status --output env | grep DB_URL) -f supabase/seed/regions.sql
```

## 2. Regions - 数据访问层

- [x] 2.1 创建 `web/features/regions/repo/regions-repo.ts` (server-only)
- [x] 2.2 实现带分页和搜索的 `listRegions()`
- [x] 2.3 实现带唯一性验证的 `createRegion()`
- [x] 2.4 实现带唯一性验证的 `updateRegion()`
- [x] 2.5 实现带 ON DELETE SET NULL 处理的 `deleteRegion()`
- [x] 2.6 创建 `web/features/regions/index.ts` 导出 repo 函数

## 3. Regions - Server Actions

- [x] 3.1 创建 `web/features/regions/actions.ts`
- [x] 3.2 实现带权限检查的 `listRegionsAction()`
- [x] 3.3 实现带 admin 验证的 `createRegionAction()`
- [x] 3.4 实现带 admin 验证的 `updateRegionAction()`
- [x] 3.5 实现带确认要求的 `deleteRegionAction()`
- [x] 3.6 添加 name/code 的唯一约束错误处理

## 4. Regions - 数据验证

- [x] 4.1 创建 `web/domain/schemas/region.ts`
- [x] 4.2 定义带 name 和 code 验证的 `regionSchema`
- [x] 4.3 定义 `regionUpdateSchema` 作为 regionSchema 的 partial

## 5. Regions - UI 组件

- [x] 5.1 创建 `web/features/regions/components/regions-page.tsx` (Server Component)
- [x] 5.2 创建 `web/features/regions/components/regions-page-client.tsx` (Client Component)
- [x] 5.3 创建带创建/编辑模式的 `web/features/regions/components/region-form.tsx`
- [x] 5.4 实现 region 列表表格（按 created_at DESC 排序）
- [x] 5.5 实现分页（每页 15 条，固定）
- [x] 5.6 实现按 name 和 code 搜索
- [x] 5.7 实现创建/编辑模态对话框
- [x] 5.8 实现删除确认对话框

## 6. Regions - 页面路由

- [x] 6.1 创建 `web/app/regions/page.tsx` (Admin-only Server Component)
- [x] 6.2 添加路由保护，非 Admin 重定向到 /403
- [ ] 6.3 端到端测试 region CRUD 操作

## 7. Analyst Info - 数据访问层

- [x] 7.1 创建 `web/features/analyst-info/repo/analysts-repo.ts` (server-only)
- [x] 7.2 实现带分页和搜索的 `listAnalysts()`
- [x] 7.3 实现带 email 唯一性验证的 `createAnalyst()`
- [x] 7.4 实现带 email 唯一性验证的 `updateAnalyst()`
- [x] 7.5 实现 `deleteAnalyst()`
- [x] 7.6 实现表单下拉框的 `getRegionsForSelect()`
- [x] 7.7 创建 `web/features/analyst-info/index.ts` 导出 repo 函数

## 8. Analyst Info - Server Actions

- [x] 8.1 创建 `web/features/analyst-info/actions.ts`
- [x] 8.2 实现带权限检查的 `listAnalystsAction()`
- [x] 8.3 实现带 admin 验证的 `createAnalystAction()`
- [x] 8.4 实现带 admin 验证的 `updateAnalystAction()`
- [x] 8.5 实现带确认要求的 `deleteAnalystAction()`
- [x] 8.6 实现表单使用的 `getRegionsForSelectAction()`
- [x] 8.7 添加 email 的唯一约束错误处理

## 9. Analyst Info - 数据验证

- [x] 9.1 创建 `web/domain/schemas/analyst.ts`
- [x] 9.2 定义带所有字段验证的 `analystSchema`
- [x] 9.3 定义 `analystUpdateSchema` 作为 analystSchema 的 partial
- [x] 9.4 定义带必填字段的 `analystCreateSchema`（full_name, email, region_id）

## 10. Analyst Info - UI 组件

- [x] 10.1 创建 `web/features/analyst-info/components/analysts-page.tsx` (Server Component)
- [x] 10.2 创建 `web/features/analyst-info/components/analysts-page-client.tsx` (Client Component)
- [x] 10.3 创建带 region 下拉框的 `web/features/analyst-info/components/analyst-form.tsx`
- [x] 10.4 实现 analyst 列表表格（full_name, chinese_name, email, region, is_active）
- [x] 10.5 实现分页（每页 15 条，固定）
- [x] 10.6 实现按 full_name、chinese_name、email 搜索
- [x] 10.7 实现带 region 选择的创建/编辑模态对话框
- [x] 10.8 实现删除确认对话框

## 11. Analyst Info - 页面路由

- [x] 11.1 创建 `web/app/analyst-info/page.tsx` (Admin-only Server Component)
- [x] 11.2 添加路由保护，非 Admin 重定向到 /403
- [ ] 11.3 端到端测试 analyst CRUD 操作

## 12. Desktop 导航

- [x] 12.1 修改 `app/desktop/page.tsx`
- [x] 12.2 添加 Regions 卡片（仅 Admin 可见）
- [x] 12.3 添加 Analyst Info 卡片（仅 Admin 可见）
- [x] 12.4 实现两个卡片在新标签页打开
- [x] 12.5 验证非 Admin 用户看不到这些卡片

## 13. 集成与测试

- [x] 13.1 验证 region 表的 RLS 策略（认证用户可读，admin 可写）
- [x] 13.2 验证 analyst 表的 RLS 策略（认证用户可读，admin 可写）
- [x] 13.3 测试 Region 删除时 analyst.region_id 设置为 NULL
- [x] 13.4 测试唯一约束（region name/code, analyst email）
- [x] 13.5 端到端测试：Admin 用户可访问所有管理页面
- [x] 13.6 端到端测试：非 Admin 用户重定向到 /403
- [x] 13.7 验证 Desktop 卡片根据角色显示/隐藏

## 14. 测试执行

- [x] 14.1 安装 WSL 环境的 Chromium 依赖
- [x] 14.2 运行 Playwright E2E 测试：`pnpm exec playwright test`
- [x] 14.3 验证所有测试通过

**最终测试结果：33/33 通过 ✅**

**测试文件位置：**
- `tests/e2e/regions.spec.ts` - 7 个测试（Regions CRUD、搜索、分页、权限）
- `tests/e2e/analyst-info.spec.ts` - 8 个测试（Analyst CRUD、搜索、active 切换、权限）
- `tests/e2e/desktop-nav.spec.ts` - 5 个测试（desktop 导航、卡片可见性）
- `tests/e2e/rls-security.spec.ts` - 7 个测试（RLS 策略、级联删除、唯一约束）
- `tests/e2e/auth.spec.ts` - 5 个测试（认证流程）
