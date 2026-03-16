# 任务清单

## 数据库层

- [ ] 创建 email_subscriptions 表（邮件订阅）
- [ ] 创建 email_config 表（外发配置）
- [ ] 创建 report_distribution_queue 表（外发队列）
- [ ] 创建 report_distribution_history 表（外发历史）
- [ ] 添加 RLS 策略
- [ ] 修改 reports 表查询逻辑支持角色过滤

## 后端 API

- [ ] GET /api/reports/published - 获取已发布报告列表
- [ ] GET /api/reports/[id] - 获取报告详情
- [ ] GET /api/email-config - 获取外发配置
- [ ] PUT /api/email-config - 更新外发配置
- [ ] GET /api/subscriptions - 获取订阅列表
- [ ] POST /api/subscriptions - 添加订阅
- [ ] DELETE /api/subscriptions/[id] - 删除订阅
- [ ] POST /api/subscriptions/me - 当前用户订阅/取消订阅
- [ ] GET /api/distribution-queue - 获取外发队列
- [ ] POST /api/distribution/trigger - 手动触发外发
- [ ] 定时任务：外发队列处理器

## 前端页面

- [ ] /reports - 报告列表页面
- [ ] /reports/[id] - 报告详情页面
- [ ] /email-config - 外发配置页面
- [ ] /subscriptions - 订阅管理页面
- [ ] 侧边栏添加报告查看入口

## 集成

- [ ] 报告approve后自动加入外发队列
- [ ] 邮件发送功能集成
