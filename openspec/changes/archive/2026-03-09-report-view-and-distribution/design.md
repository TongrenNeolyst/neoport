# 设计文档

## 数据模型

### 1. email_subscriptions 表

```sql
CREATE TABLE email_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

### 2. email_config 表

```sql
CREATE TABLE email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INTEGER NOT NULL,
  smtp_user VARCHAR(255) NOT NULL,
  smtp_pass VARCHAR(255) NOT NULL,
  smtp_from VARCHAR(255) NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. report_distribution_queue 表

```sql
CREATE TABLE report_distribution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id),
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. report_distribution_history 表

```sql
CREATE TABLE report_distribution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id),
  recipient_email VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 页面设计

### 报告列表页 (/reports)

- 顶部：页面标题"报告列表"
- 筛选栏：无（列表直接展示所有有权限的报告）
- 表格列：报告标题、股票代码、报告类型、发布日期、分析师、操作
- 操作列：查看按钮，点击跳转到 /reports/[id]
- 分页：每页20条

### 报告详情页 (/reports/[id])

- 顶部：返回按钮 + 报告标题
- 基本信息卡片：股票代码、报告类型、分析师、发布日期
- 报告内容：PDF预览区域
- 附件列表：仅显示最新版本的PDF文件

### 外发配置页 (/email-config)

- 顶部：页面标题"邮件外发配置"
- 表单字段：
  - SMTP主机
  - SMTP端口
  - 用户名
  - 密码
  - 发件人地址
  - 启用外发开关
- 底部：保存按钮

### 订阅管理页 (/subscriptions)

- 顶部：页面标题"邮件订阅管理"
- 订阅列表表格：邮箱、订阅时间、状态、操作
- 添加订阅：输入邮箱并添加

## API 设计

### GET /api/reports/published

查询参数：
- page: 页码
- limit: 每页数量

返回：报告列表

### GET /api/reports/[id]

返回：报告详情 + 最新版本PDF

### 报告权限过滤逻辑

```typescript
// Admin/SA: 返回所有已发布报告
// Analyst: 返回 (submitter_id = currentUser.id) OR (analyst_id = currentUser.id) 的已发布报告
```

## 外发流程

1. 报告状态变为 approved 时，触发 `add_to_distribution_queue(report_id)`
2. 定时任务每5分钟扫描 pending 状态的队列记录
3. 对每条记录：
   - 获取报告详情和最新PDF
   - 查询所有analyst邮箱 + 所有活跃订阅邮箱
   - 逐个发送邮件
   - 更新队列状态和历史记录
