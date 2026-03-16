# 报告外发规格

## 功能说明
- 报告approve后自动加入外发队列
- 定时任务扫描队列并执行外发
- 记录外发历史

## 外发流程

### 1. 触发外发
当报告状态变为 `approved` 时，自动调用：
```sql
SELECT add_to_distribution_queue(report_id);
```

### 2. 队列处理
定时任务（每5分钟）执行：
```sql
SELECT process_distribution_queue();
```

### 3. 外发逻辑
对每条 pending 记录：
1. 获取报告详情和最新PDF
2. 查询所有analyst邮箱 + 所有活跃订阅邮箱
3. 逐个发送邮件
4. 记录到 distribution_history

## 数据表

### report_distribution_queue
```sql
- id: UUID
- report_id: UUID (FK)
- status: pending | processing | completed | failed
- error_message: TEXT
- scheduled_at: TIMESTAMP
- sent_at: TIMESTAMP
- created_at: TIMESTAMP
```

### report_distribution_history
```sql
- id: UUID
- report_id: UUID (FK)
- recipient_email: VARCHAR(255)
- status: sent | failed
- sent_at: TIMESTAMP
- error_message: TEXT
- created_at: TIMESTAMP
```

## API
- GET `/api/distribution-queue`
  - Response: QueueItem[]
- POST `/api/distribution/trigger`
  - Body: { report_id }
  - 手动触发单次外发

## 邮件内容
- 主题: [Neoport] 新报告已发布 - {报告标题}
- 正文: 包含报告标题、股票代码、发布日期
- 附件: PDF文件
