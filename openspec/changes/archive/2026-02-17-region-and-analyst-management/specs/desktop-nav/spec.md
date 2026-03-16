# Desktop 导航 - Region 和 Analyst 管理

## ADDED Requirements
### Requirement: Desktop 显示仅 Admin 可见的管理卡片
The system SHALL 仅在 Desktop 为 Admin 用户显示 Regions 和 Analyst Info 管理卡片。

#### Scenario: Admin 看到管理卡片
- **当** Admin 用户访问 Desktop 页面
- **则** 系统显示 Regions 卡片
- **且** 系统显示 Analyst Info 卡片
- **且** 两个卡片都在 Data Management 区域可见

#### Scenario: 非 Admin 看不到管理卡片
- **当** 非 Admin 用户（SA 或 Analyst）访问 Desktop 页面
- **则** 系统不显示 Regions 卡片
- **且** 系统不显示 Analyst Info 卡片

### Requirement: 管理卡片在新标签页打开
The system SHALL 在点击时在新标签页打开管理页面，遵循 Desktop-as-Launcher 约定。

#### Scenario: 点击 Regions 卡片
- **当** Admin 用户点击 Regions 卡片
- **则** 系统在新标签页打开 `/regions` 页面
- **且** Desktop 页面在原标签页保持打开

#### Scenario: 点击 Analyst Info 卡片
- **当** Admin 用户点击 Analyst Info 卡片
- **则** 系统在新标签页打开 `/analyst-info` 页面
- **且** Desktop 页面在原标签页保持打开
