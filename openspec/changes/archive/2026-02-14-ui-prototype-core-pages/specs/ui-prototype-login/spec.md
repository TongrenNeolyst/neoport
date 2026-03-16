## ADDED Requirements

### Requirement: 系统提供登录原型页面
系统 SHALL 提供登录原型页面用于确认视觉风格与交互方式。

#### Scenario: 访问登录页
- **WHEN** 用户访问 `/login`
- **THEN** 页面 MUST 展示深色渐变背景与粒子背景效果
- **AND** 页面 MUST 展示文案 `The Future is Now`
- **AND** 页面 MUST 展示文案 `Research Report Management System`
- **AND** 页面 MUST 展示 Email 与 Password 输入框以及 Login 按钮

### Requirement: 登录表单校验与错误提示
系统 SHALL 对登录表单进行基础校验，并给出可见的错误提示。

#### Scenario: 空值校验
- **WHEN** 用户未填写 Email 或 Password 并点击 Login
- **THEN** 系统 MUST 在对应字段展示必填错误提示

#### Scenario: Email 格式校验
- **WHEN** 用户输入不合法的 Email 并点击 Login
- **THEN** 系统 MUST 展示 Email 格式错误提示

### Requirement: 登录提交模拟与加载状态
系统 SHALL 在不接入真实 Supabase 的情况下模拟登录请求，便于演示加载、成功与失败反馈。

#### Scenario: 模拟登录提交
- **WHEN** 用户提交登录表单
- **THEN** Login 按钮 MUST 进入 loading 状态（例如禁用或显示 spinner）
- **AND** 系统 MUST 在 1-2 秒内返回模拟结果

#### Scenario: 模拟登录成功
- **WHEN** 用户提交登录表单且模拟结果为成功
- **THEN** 系统 MUST 跳转到 `/desktop`

#### Scenario: 模拟登录失败
- **WHEN** 用户提交登录表单且模拟结果为失败
- **THEN** 系统 MUST 展示失败提示（可为 toast 或表单错误）

### Requirement: 忘记密码原型弹窗
系统 SHALL 在登录页提供“忘记密码”的原型交互入口。

#### Scenario: 打开忘记密码弹窗
- **WHEN** 用户在 `/login` 点击 Forgot password
- **THEN** 系统 MUST 打开弹窗并展示 Email 输入框与提交按钮

#### Scenario: 提交忘记密码
- **WHEN** 用户在弹窗内提交 Email
- **THEN** 系统 MUST 展示统一成功提示（不区分邮箱是否存在）

