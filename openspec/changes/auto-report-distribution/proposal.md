# 报告自动外发功能

## 为什么

当前系统 `POST /api/external/reports` 接口接收外部报告并存入数据库，但接收后报告处于"静默"状态——没有自动外发给分析师、联系人，也没有外发给 Wind / 同花顺 等平台订阅方。需要补充自动发布队列机制，实现报告到达后自动、定时、全量外发。

## 变更内容

1. **修改现有外部报告 API**：报告创建成功后自动加入自动发布队列（状态=等待发布），关联报告 ID。
2. **修改队列表**：将 `report_distribution_queue.report_id` 外键从指向不存在的 `report` 表改为指向 `reports` 表；新增 `waiting`（等待发布）状态，对应用户要求的"等待发布"状态。
3. **新增队列处理器脚本**：`scripts/process-auto-distribution-queue.ts`，每 5 分钟执行一次，扫描 `waiting` 状态的队列记录，发送邮件给分析师+联系人+Wind+同花顺订阅者+普通第三方订阅者，更新状态为 `published` 或 `failed`。
4. **新增邮件发送服务**：`features/email-sender/index.ts` + `send-email.ts`，封装 nodemailer，支持发送带 PDF 附件的邮件（附件从 Supabase Storage 获取）。
5. **复用已有发送记录表**：`report_distribution_history` 记录每次发送的邮箱、状态、时间戳。
6. **修正错误重试逻辑**：`retry-distribution.ts` 脚本需要兼容新状态值。
7. **恢复订阅管理页面**：`/subscriptions`（仅 Admin），管理所有订阅者（邮箱、订阅类型：普通/Wind/同花顺）。
8. **恢复发送邮箱配置页面**：`/email-config`（仅 Admin），配置 SMTP 服务器参数（host/port/user/pass/from/is_enabled）。
9. **恢复邮件分发 actions 与 repo**：`features/email-distribution/`（actions.ts + index.ts + repo/email-distribution-repo.ts），为订阅管理和配置页面提供数据读写能力。

## 功能 (Capabilities)

### 新增功能

- `auto-distribution-queue`: 自动发布队列表及入库逻辑。报告通过外部 API 接收后立即加入队列（status=`waiting`），供定时任务消费。
- `auto-distribution-processor`: 定时任务处理器。轮询 `waiting` 队列项，按报告关联的分析师、联系人，以及 Wind/同花顺/普通第三方订阅者列表，逐一发送邮件（含 PDF 附件），写发送历史。
- `email-sender`: 邮件发送服务。封装 nodemailer SMTP transport，支持多附件（从 Supabase Storage 下载后作为 buffer 附件发送），失败重试一次。
- `distribution-history`: 复用现有 `report_distribution_history` 表记录所有发送事件（邮箱、状态、时间戳、错误信息）。
- `subscription-management`: 订阅管理页面（`/subscriptions`），Admin 可查看、添加、删除订阅者，支持普通/Wind/同花顺三种订阅类型。
- `email-config`: SMTP 配置页面（`/email-config`），Admin 可配置和启用/禁用邮件发送服务。

### 修改功能

- `report-distribution-queue`（数据库层）: `report_distribution_queue.report_id` 外键修正为指向 `reports`；新增 `waiting` 枚举值。

## 影响

| 区域 | 影响 |
|------|------|
| API | `web/app/api/external/reports/route.ts` — 报告创建后调用队列入库 |
| 数据库 | `report_distribution_queue` 表结构调整（外键修正，新增 `waiting` 状态） |
| 脚本 | 新增 `web/scripts/process-auto-distribution-queue.ts`（5 分钟 cron） |
| 邮件 | 新增 `web/features/email-sender/`（nodemailer SMTP 封装） |
| 重试 | `web/scripts/retry-distribution.ts` — 兼容新状态值 |
| 订阅管理 | 恢复 `web/app/subscriptions/page.tsx` + `web/features/email-distribution/` |
| SMTP 配置 | 恢复 `web/app/email-config/page.tsx` |
| 依赖 | nodemailer 已安装，无需新增依赖 |
