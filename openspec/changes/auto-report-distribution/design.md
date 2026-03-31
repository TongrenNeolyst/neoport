# 报告自动外发 — 技术设计

## 上下文

系统当前状态：
- `POST /api/external/reports` 接收外部报告并存入 `reports` 表，附件写入 Supabase Storage
- 旧迁移 `20260309000000_report_distribution_tables.sql` 中 `report_distribution_queue.report_id` 外键错误指向不存在的 `public.report`（应为 `public.reports`）
- 旧迁移的 `add_to_distribution_queue()` 函数插入 `pending` 状态，但用户需求要求的状态名为"等待发布"
- nodemailer 已安装，但无实际发送代码
- `process-distribution-queue.ts` 脚本从未实现，`retry-distribution.ts` 脚本存在但只能重置 `pending` → `pending`

约束：
- Next.js App Router + Supabase（service-role 客户端）
- Windows 环境（Task Scheduler 触发 cron）
- 所有邮件发送必须写 `report_distribution_history`

---

## 目标 / 非目标

**目标：**
- 外部 API 接收报告后自动加入发布队列（关联报告 ID）
- 队列状态：等待发布 / 已发布 / 发送失败
- 定时任务每 5 分钟执行，发送给分析师 + 联系人 + Wind 订阅者 + 同花顺订阅者 + 普通第三方订阅者（`subscription_type = 'normal'`）
- 所有发送操作记录到 `report_distribution_history`

**非目标：**
- 不实现手动触发（仅自动定时）
- 不改变现有前端页面

---

## 决策

### D1：队列表外键修正与新状态

**决策：** 新增 migration `20260331000000_fix_distribution_queue.sql`，将 `report_distribution_queue.report_id` 外键从 `public.report` 改为 `public.reports`，同时将状态值从 `pending/processing/completed/failed` 改为 `waiting/processing/published/failed`。

**理由：** 原外键指向不存在的表，插入必失败；状态名改为与用户需求一致（等待发布/已发布/发送失败）。

**替代方案：**
- 仅修正外键、保留 pending → 被否决：状态名需与需求一致
- 新建独立队列表 → 被否决：复用已有表更简洁

### D2：队列入库时机

**决策：** 在 `POST /api/external/reports` 的 step 15（附件上传完成）之后、同步调用 `add_to_distribution_queue(report_id)` 将报告加入队列。

**理由：** 附件上传成功意味着报告数据完整，此时加入队列最安全。

**替代方案：**
- 异步后台调用 → 增加复杂度，且当前流程已足够轻量
- Supabase DB Trigger → 需要 service-role 权限，有安全风险

### D3：定时任务执行方式

**决策：** `process-auto-distribution-queue.ts` 作为独立 Node.js 脚本，通过 Windows Task Scheduler 配置每 5 分钟执行一次。脚本内部自己管理 `processing` 状态锁（防止重复执行）。

**理由：** Next.js API Route 不适合 long-running 任务；独立脚本与框架解耦，Windows 下用 Task Scheduler 管理更可靠。

**替代方案：**
- Vercel Cron / Supabase Edge Functions → 当前项目未使用
- Next.js Route Handler + 外部 cron → 增加维护成本

### D4：邮件附件处理

**决策：** 从 Supabase Storage 下载附件到内存 Buffer（`arrayBuffer`），作为 nodemailer 附件直接发送，不写入本地临时文件。

**理由：** 避免磁盘 I/O，Windows 文件系统权限问题更少，内存处理更轻量。

### D5：发送失败处理

**决策：** 单个收件人发送失败不影响其他收件人；整个报告所有发送都失败时，将队列标记为 `failed` 并记录第一条错误信息。每个收件人的失败单独写入 `history`（status=`failed`）。

**理由：** 避免单点故障导致整批重试；失败记录可供排查。

**替代方案：**
- 任意失败即标记队列失败 → 被否决：过于激进
- 失败自动重试 N 次 → 本次不实现，重试由 `retry-distribution.ts` 手动处理

---

## 风险 / 权衡

| 风险 | 缓解措施 |
|------|----------|
| SMTP 连接超时导致任务执行时间过长 | 设置 nodemailer `connectionTimeout: 30s`，单个邮件超时 60s |
| 同一报告重复加入队列（幂等性） | `add_to_distribution_queue` 使用 `on conflict do nothing` |
| Task Scheduler 任务堆积（上一次未完成又触发下一次） | 脚本查询 `status = 'waiting'` 时加 `FOR UPDATE SKIP LOCKED` 行锁（PostgreSQL） |
| Storage 大文件导致内存压力 | 每个附件顺序处理，不并发下载；单文件上限 50MB（已有 DB 约束） |
| 外键修正迁移与旧代码兼容 | 新迁移兼容旧数据，修正外键时不丢数据 |

---

## 迁移计划

### 阶段 1：数据库修正

1. 执行新 migration `20260331000000_fix_distribution_queue.sql`：
   - 修正 `report_distribution_queue.report_id` 外键 → 指向 `public.reports`
   - 修正 `report_distribution_history.report_id` 外键 → 指向 `public.reports`
   - 更新 `add_to_distribution_queue` 函数：将 `'pending'` 改为 `'waiting'`
   - 兼容旧数据：所有 `pending` → `waiting`，`completed` → `published`

### 阶段 2：恢复订阅管理和配置页面

2. 恢复 `web/features/email-distribution/repo/email-distribution-repo.ts`、`actions.ts`、`index.ts`
3. 恢复 `web/app/subscriptions/page.tsx`（订阅管理，仅 Admin）
4. 恢复 `web/app/email-config/page.tsx`（SMTP 配置，仅 Admin）

### 阶段 3：API 层修改

5. 修改 `web/app/api/external/reports/route.ts`：报告创建成功后调用 `add_to_distribution_queue(report_id)`

### 阶段 4：邮件服务

6. 新建 `web/features/email-sender/index.ts`（SMTP 封装）
7. 新建 `web/features/email-sender/send-email.ts`（单次发送 + 重试一次）

### 阶段 5：队列处理器

8. 新建 `web/scripts/process-auto-distribution-queue.ts`
9. 修改 `web/scripts/retry-distribution.ts`：兼容 `waiting`/`published`/`failed` 状态

### 阶段 6：部署

10. 配置 Windows Task Scheduler：每 5 分钟执行 `npx tsx web/scripts/process-auto-distribution-queue.ts`
11. 数据库执行 migration

**回滚：** 删除 Task Scheduler 任务 + 删除 `waiting` 状态的队列记录即可停止自动外发，API 层改动不影响既有报告数据。

---

## 开放问题

| 问题 | 状态 | 决策建议 |
|------|------|----------|
| Wind / 同花顺 的邮件格式是否与 normal 订阅者相同？ | 待确认 | 暂时使用相同模板，后续可扩展 subscription_type 区分 |
| 发送频率上限（避免短时间内大量邮件触发 SMTP 限流） | 待定 | 本次先不加限流，监控实际发送量后决定 |
| `retry-distribution.ts` 是否需要自动执行？ | 否 | 保持手动，admin 按需触发 |
