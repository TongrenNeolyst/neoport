## MODIFIED Requirements

### Requirement: Desktop 显示仅 Admin 可见的管理卡片
The system SHALL 在 Desktop 为 Admin 用户显示 Regions、Analyst Info、Coverage、Sector 和 Template 管理卡片，并为 Analyst 用户显示 Coverage 卡片。

#### Scenario: Admin 看到管理卡片
- **WHEN** Admin 用户访问 Desktop 页面
- **THEN** 系统 MUST 显示 Regions 卡片
- **AND** 系统 MUST 显示 Analyst Info 卡片
- **AND** 系统 MUST 显示 Coverage 卡片
- **AND** 系统 MUST 显示 Sector 卡片
- **AND** 系统 MUST 显示 Template 卡片
- **AND** 上述卡片 MUST 在 Data Management 区域可见

#### Scenario: 非 Admin 看不到管理卡片
- **WHEN** SA 用户访问 Desktop 页面
- **THEN** 系统 MUST NOT 显示 Regions 卡片
- **AND** 系统 MUST NOT 显示 Analyst Info 卡片
- **AND** 系统 MUST NOT 显示 Coverage 卡片
- **AND** 系统 MUST NOT 显示 Sector 卡片
- **AND** 系统 MUST NOT 显示 Template 卡片

#### Scenario: Analyst 看到 Coverage 卡片
- **WHEN** Analyst 用户访问 Desktop 页面
- **THEN** 系统 MUST 显示 Coverage 卡片
- **AND** 系统 MUST NOT 显示 Regions 卡片
- **AND** 系统 MUST NOT 显示 Analyst Info 卡片
- **AND** 系统 MUST NOT 显示 Sector 卡片
- **AND** 系统 MUST NOT 显示 Template 卡片

### Requirement: 管理卡片在新标签页打开
The system SHALL 在点击时在新标签页打开管理页面，遵循 Desktop-as-Launcher 约定。

#### Scenario: 点击 Regions 卡片
- **WHEN** Admin 用户点击 Regions 卡片
- **THEN** 系统 MUST 在新标签页打开 `/regions` 页面
- **AND** Desktop 页面 MUST 在原标签页保持打开

#### Scenario: 点击 Analyst Info 卡片
- **WHEN** Admin 用户点击 Analyst Info 卡片
- **THEN** 系统 MUST 在新标签页打开 `/analyst-info` 页面
- **AND** Desktop 页面 MUST 在原标签页保持打开

#### Scenario: 点击 Coverage 卡片
- **WHEN** Admin 用户点击 Coverage 卡片
- **THEN** 系统 MUST 在新标签页打开 `/coverage` 页面
- **AND** Desktop 页面 MUST 在原标签页保持打开

#### Scenario: 点击 Sector 卡片
- **WHEN** Admin 用户点击 Sector 卡片
- **THEN** 系统 MUST 在新标签页打开 `/sectors` 页面
- **AND** Desktop 页面 MUST 在原标签页保持打开

#### Scenario: 点击 Template 卡片
- **WHEN** Admin 用户点击 Template 卡片
- **THEN** 系统 MUST 在新标签页打开 `/templates` 页面
- **AND** Desktop 页面 MUST 在原标签页保持打开
