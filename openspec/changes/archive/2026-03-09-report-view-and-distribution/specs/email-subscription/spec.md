# 邮件订阅规格

## 功能说明
- 任何登录用户可以订阅/取消订阅
- Admin 可以查看和管理所有订阅

## 页面信息
- 路由: `/subscriptions`
- 权限: 仅 Admin
- 描述: 管理邮件订阅列表

## UI 规格

### 页面结构
```
+------------------------------------------+
|  标题: 邮件订阅管理                       |
+------------------------------------------+
|  [添加订阅]                               |
|  邮箱: [________________] [添加]         |
+------------------------------------------+
|  [订阅列表]                               |
|  | 邮箱 | 订阅时间 | 状态 | 操作 |       |
|  | ---- | -------- | ---- | ---- |      |
|  | ...  | ...      | 活跃 | [删除] |    |
+------------------------------------------+
```

### 用户订阅入口
- 在个人设置或首页添加"订阅报告"开关
- 已登录用户可以一键订阅/取消订阅

## API
- GET `/api/subscriptions`
  - Response: Subscription[]
- POST `/api/subscriptions`
  - Body: { email }
- DELETE `/api/subscriptions/[id]`
- POST `/api/subscriptions/me`
  - Body: { subscribe: boolean }

## 数据表
```sql
email_subscriptions:
  - id: UUID
  - email: VARCHAR(255)
  - user_id: UUID (nullable)
  - created_at: TIMESTAMP
  - is_active: BOOLEAN
```
