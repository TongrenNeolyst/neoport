## 1. 数据库迁移

- [x] 1.1 创建 migration `20260331000000_fix_distribution_queue.sql`：将 `report_distribution_queue.report_id` 外键从 `public.report` 修正为 `public.reports`（同样修正 `report_distribution_history.report_id`）
- [x] 1.2 更新迁移中的 CHECK 约束：状态值从 `pending/processing/completed/failed` 改为 `waiting/processing/published/failed`
- [x] 1.3 更新 `add_to_distribution_queue()` 函数：将默认 status 从 `'pending'` 改为 `'waiting'`
- [x] 1.4 迁移脚本中执行数据修正：所有 `status = 'pending'` → `'waiting'`，`status = 'completed'` → `'published'`
- [ ] 1.5 在本地 Supabase 执行迁移并验证

## 2. 邮件分发基础层（恢复）

- [x] 2.1 恢复 `web/features/email-distribution/repo/email-distribution-repo.ts`：提供 `getEmailConfig`、`updateEmailConfig`、`listSubscriptions`、`addSubscription`、`deleteSubscription`、`subscribeMe`、`unsubscribeMe` 等函数
- [x] 2.2 恢复 `web/features/email-distribution/actions.ts`：Server Actions 层，包含 `getEmailConfigAction`、`updateEmailConfigAction`、`listSubscriptionsAction`、`addSubscriptionAction`、`deleteSubscriptionAction`，Admin 鉴权
- [x] 2.3 恢复 `web/features/email-distribution/index.ts`：统一导出 types、actions

## 3. 订阅管理页面（恢复）

- [x] 3.1 恢复 `web/app/subscriptions/page.tsx`：订阅列表展示（表格）、添加订阅表单（邮箱+类型）、删除订阅按钮；仅 Admin 可访问

## 4. SMTP 配置页面（恢复）

- [x] 4.1 恢复 `web/app/email-config/page.tsx`：SMTP 配置表单（host/port/user/pass/from/is_enabled）；仅 Admin 可访问

## 5. API 层修改

- [x] 5.1 修改 `web/app/api/external/reports/route.ts`：在 step 15 成功后、同步调用 `add_to_distribution_queue(report_id)` 将报告加入队列
- [x] 5.2 在 API 路由中处理队列入库失败的场景（记录 error 但不阻断 201 响应）

## 6. 邮件发送服务

- [x] 6.1 创建 `web/features/email-sender/index.ts`：从 `email_config` 表加载已启用的 SMTP 配置，导出 `loadSmtpConfig()` 函数
- [x] 6.2 创建 `web/features/email-sender/send-email.ts`：`sendReportEmail({ report, recipientEmail, attachments })` 函数，支持从 Storage 下载附件、nodemailer 发送、失败重试一次
- [x] 6.3 创建 `web/features/email-sender/distribution-history-repo.ts`：`recordSendHistory({ reportId, email, status, errorMessage, sentAt })` 函数
- [x] 6.4 在 nodemailer transport 中设置 `connectionTimeout: 30000`，单邮件操作超时 `60000`
- [x] 6.5 处理 Storage 文件不存在场景：log warning 但继续发送

## 7. 队列处理器脚本

- [x] 7.1 创建 `web/scripts/process-auto-distribution-queue.ts`：
  - 查询 `status = 'waiting'` 的队列记录
  - 更新状态为 `processing`
  - 获取报告详情（标题、日期、分析师、联系人）
  - 获取 Wind/Tonghuashun/普通第三方订阅者邮箱列表
  - 获取报告所有附件路径
  - 循环发送邮件（分析师 + 联系人 + Wind + 同花顺 + 普通订阅者）
  - 每个发送结果写入 `report_distribution_history`
  - 全部成功 → `published`；任意失败 → `failed`（记录第一条错误）
- [x] 7.2 修改 `web/scripts/retry-distribution.ts`：将 `status = 'pending'` 替换为 `status = 'waiting'`，将 `status = 'completed'` 替换为 `status = 'published'`
- [ ] 7.3 本地运行脚本验证与 Supabase 的连接和数据写入

## 8. 部署与配置

- [x] 8.1 在 Windows Task Scheduler 中创建任务：每 5 分钟执行 `npx tsx web/scripts/process-auto-distribution-queue.ts`（工作目录指向项目根目录）
- [ ] 8.2 验证 SMTP 配置已正确写入 `email_config` 表且 `is_enabled = true`
- [ ] 8.3 用测试报告端点发送一条测试报告，验证队列记录自动创建
- [ ] 8.4 手动触发一次队列处理器，验证邮件发送和历史记录
