# ui-prototype-desktop 规格

## Purpose

TBD（原型阶段：锁定 `/desktop` 作为 Launcher 的导航与信息架构）。

## Requirements

### Requirement: 系统提供桌面启动器原型页面
系统 SHALL 提供桌面页作为功能入口（Launcher）用于确认导航方式与信息架构。

#### Scenario: 访问桌面页
- **WHEN** 用户访问 `/desktop`
- **THEN** 页面 MUST 展示顶部导航栏（包含 Logo、欢迎信息、Logout）
- **AND** 页面 MUST 展示功能卡片矩阵并按功能组分组展示

### Requirement: 桌面功能卡片矩阵包含既定入口
系统 SHALL 在桌面页展示完整卡片矩阵，用于演示导航与占位态。

#### Scenario: 卡片矩阵渲染
- **WHEN** 用户访问 `/desktop`
- **THEN** 页面 MUST 展示 Reports 功能组卡片：Reports、New Report、Report Review、Templates
- **AND** 页面 MUST 展示 Data Management 功能组卡片：User Management、Analyst Info、Coverage、Sectors、Regions
- **AND** 除 User Management 外，其余卡片 MUST 以 Coming Soon 占位态呈现
- **AND** 卡片 MUST 展示权限标签（例如 `Admin only`、`SA/Admin only`）

### Requirement: 桌面卡片在新标签页打开
系统 SHALL 采用 Desktop-as-Launcher 导航契约，功能卡片点击后在新标签页打开目标页面。

#### Scenario: 打开 Users 页面
- **WHEN** 用户点击 User Management 卡片
- **THEN** 系统 MUST 在新标签页打开 `/users`

#### Scenario: 打开 Coming Soon 占位页
- **WHEN** 用户点击任意 Coming Soon 卡片（例如 Regions）
- **THEN** 系统 MUST 在新标签页打开 `/coming-soon`

### Requirement: Logout 为原型态跳转
系统 SHALL 提供 Logout 按钮用于原型演示，不实现真实会话清理。

#### Scenario: 点击 Logout
- **WHEN** 用户在 `/desktop` 点击 Logout
- **THEN** 系统 MUST 跳转到 `/login`

