## MODIFIED Requirements

### Requirement: 系统按角色实施功能权限（页面 + 写操作）
系统 SHALL 对管理类页面与管理类写操作执行角色权限控制。

#### Scenario: Admin 访问管理能力
- **WHEN** Admin 访问 Users、Regions、Analyst Info、Coverage、Sectors、Templates 页面或执行对应写操作
- **THEN** 系统 MUST 允许访问

#### Scenario: SA 访问管理能力
- **WHEN** SA 访问 Users、Regions、Analyst Info、Coverage、Sectors、Templates 页面或执行对应写操作
- **THEN** 系统 MUST 拒绝访问

#### Scenario: Analyst 访问 Coverage 管理能力
- **WHEN** Analyst 访问 Coverage 页面并执行创建操作
- **THEN** 系统 MUST 允许访问与创建

#### Scenario: Analyst 执行 Coverage 非创建写操作
- **WHEN** Analyst 对 Coverage 执行更新或删除操作
- **THEN** 系统 MUST 拒绝访问

### Requirement: 非 Admin 默认不展示管理功能入口
系统 SHALL 在桌面页隐藏非 Admin 用户的管理功能卡片入口。

#### Scenario: 非 Admin 进入桌面页
- **WHEN** SA 访问 `/desktop`
- **THEN** 管理功能卡片（Users、Regions、Analyst Info、Coverage、Sector、Template）MUST 不显示

#### Scenario: Analyst 进入桌面页
- **WHEN** Analyst 访问 `/desktop`
- **THEN** 管理功能卡片（Users、Regions、Analyst Info、Sector、Template）MUST 不显示
- **AND** Coverage 卡片 MUST 显示
