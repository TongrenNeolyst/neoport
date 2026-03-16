# 报告查看与外发功能

## 目标与背景

### 背景
当前系统缺少报告的公开查看功能和外发机制。用户需要：
1. 不同角色的用户能够查看已发布的报告
2. Admin 可以配置外发邮件设置
3. 支持邮件订阅功能
4. 报告批准后自动外发给相关人员

### 目标
1. 实现报告查看列表页面，支持按角色过滤
2. 实现报告详情查看页面，只读展示最新PDF
3. 实现外发配置页面（仅Admin）
4. 实现邮件订阅管理功能
5. 实现报告外发记录与自动外发机制

---

## 需求

### 1. 报告查看列表页面

**功能需求：**
- 列表展示所有已发布的报告
- 点击"查看"按钮跳转到详情页面

**角色权限：**
| 角色 | 可查看的报告 |
|------|-------------|
| Admin | 所有已发布的报告 |
| SA | 所有已发布的报告 |
| Analyst | 自己submit的报告 + 自己署名(analyst)的报告 |

**列表字段：**
- 报告标题
- 股票代码
- 报告类型
- 发布日期
- 分析师名称
- 操作（查看按钮）

### 2. 报告查看详情页面

**功能需求：**
- 只读展示报告详情，不能修改
- 只显示最新版本的PDF附件
- 支持PDF预览或下载

**访问权限：**
- 与列表页面权限一致
- 无权限用户访问时返回403

### 3. 外发配置页面（仅Admin）

**功能需求：**
- Admin 可以配置外发邮件的SMTP设置
- 配置内容包括：SMTP主机、端口、用户名、密码、发送地址
- 支持启用/禁用外发功能

**访问权限：**
- 仅Admin可访问

### 4. 邮件订阅功能

**功能需求：**
- 任何用户可以订阅/取消订阅报告邮件
- 订阅的邮箱接收所有已发布报告的外发邮件
- 订阅管理页面展示所有订阅者（仅Admin）

### 5. 报告外发记录

**功能需求：**
- 报告approve后自动加入外发队列
- 定时任务扫描队列并执行外发
- 外发目标：所有analyst + 所有订阅邮箱
- 记录外发状态（pending/sent/failed）
- 支持重试失败的外发

---

## 设计约束与规范

### 技术约束
- 使用Next.js App Router
- 使用Supabase作为后端数据库
- 邮件发送使用配置的SMTP

### 数据模型设计

**新增表：**
1. `email_subscriptions` - 邮件订阅表
   - id, email, created_at, is_active
2. `email_config` - 外发配置表
   - id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, is_enabled, updated_at
3. `report_distribution_queue` - 报告外发队列表
   - id, report_id, status, error_message, scheduled_at, sent_at, created_at
4. `report_distribution_history` - 报告外发历史表
   - id, report_id, recipient_email, status, sent_at, error_message

### 权限矩阵

**角色功能权限矩阵：**
| 功能 | Admin | SA | Analyst |
|------|-------|-----|--------|
| 查看报告列表 | ✅ | ✅ | ✅(受限) |
| 查看报告详情 | ✅ | ✅ | ✅(受限) |
| 外发配置 | ✅ | ❌ | ❌ |
| 订阅管理 | ✅ | ❌ | ❌ |
| 订阅/取消订阅 | ✅ | ✅ | ✅ |

**角色数据表权限矩阵（RLS）：**
| 表 | Admin | SA | Analyst |
|----|-------|-----|--------|
| reports | SELECT(全部) | SELECT(已发布) | SELECT(自己的) |
| email_subscriptions | FULL | SELECT | INSERT/DELETE(自己的) |
| email_config | FULL | ❌ | ❌ |
| report_distribution_queue | FULL | SELECT | ❌ |
| report_distribution_history | FULL | SELECT | ❌ |

### 页面路由设计
- `/reports` - 报告列表页
- `/reports/[id]` - 报告详情页
- `/email-config` - 外发配置页（仅Admin）
- `/subscriptions` - 订阅管理页（仅Admin）
