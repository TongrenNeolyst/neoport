# desktop-nav Specification

## Purpose
TBD - created by archiving change auth-and-users-mvp. Update Purpose after archive.
## Requirements
### Requirement: 登录后默认进入 Desktop
系统 SHALL 将桌面页作为登录后默认落地页。

#### Scenario: 登录后进入桌面
- **WHEN** 用户登录成功
- **THEN** 系统 MUST 将用户引导到 `/desktop`

### Requirement: Desktop 作为 Launcher（Desktop-as-Launcher 契约）
系统 SHALL 采用 Desktop-as-Launcher 导航契约。

#### Scenario: 从桌面打开功能页
- **WHEN** 用户点击桌面功能卡片
- **THEN** 系统 MUST 使用新标签页打开目标功能页

#### Scenario: 功能页导航约束
- **WHEN** 用户在 Users 等功能页操作
- **THEN** 页面 MUST NOT 提供“返回桌面”链接
- **AND** 用户通过关闭标签页返回桌面

### Requirement: Desktop 需提供真实 Logout
系统 SHALL 在桌面页提供真实登出能力，而非仅做跳转。

#### Scenario: 点击 Logout
- **WHEN** 已登录用户点击 Logout
- **THEN** 系统 MUST 清理 cookies 会话
- **AND** 系统 MUST 将用户引导回 `/login`

### Requirement: Desktop 风格需与 UI 原型规格一致
系统 SHALL 保持桌面页视觉风格与 UI 原型规格一致。

#### Scenario: 视觉验收
- **WHEN** 进行桌面页验收
- **THEN** 页面风格 MUST 与 `openspec/specs/ui-prototype-desktop/spec.md` 一致

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

### Requirement: Desktop SHALL show Reports card for authenticated users
The system SHALL display Reports card on Desktop for Admin, SA, and Analyst.

#### Scenario: Analyst opens desktop
- **WHEN** Analyst visits `/desktop`
- **THEN** system MUST show Reports card

#### Scenario: SA opens desktop
- **WHEN** SA visits `/desktop`
- **THEN** system MUST show Reports card

### Requirement: Desktop SHALL show Report Review card for SA and Admin only
The system SHALL display Report Review card only for SA and Admin.

#### Scenario: SA opens desktop
- **WHEN** SA visits `/desktop`
- **THEN** system MUST show Report Review card

#### Scenario: Analyst opens desktop
- **WHEN** Analyst visits `/desktop`
- **THEN** system MUST NOT show Report Review card

### Requirement: Reports and Report Review cards SHALL open in new tab
The system SHALL open Reports and Report Review pages in a new tab from Desktop.

#### Scenario: Open Reports
- **WHEN** user clicks Reports card on Desktop
- **THEN** system MUST open `/reports` in a new tab

#### Scenario: Open Report Review
- **WHEN** SA or Admin clicks Report Review card on Desktop
- **THEN** system MUST open `/report-review` in a new tab

### Requirement: Desktop SHALL show Add Report entry in Reports group
The system SHALL show `Add Report` entry under Reports group for Admin and Analyst users.

#### Scenario: Admin opens desktop
- **WHEN** Admin visits `/desktop`
- **THEN** system MUST show `Add Report` entry in Reports group

#### Scenario: Analyst opens desktop
- **WHEN** Analyst visits `/desktop`
- **THEN** system MUST show `Add Report` entry in Reports group

#### Scenario: SA opens desktop
- **WHEN** SA visits `/desktop`
- **THEN** system MUST NOT show `Add Report` entry

### Requirement: Desktop SHALL place Add Report as first item in Reports group
The system SHALL keep `Add Report` as the first entry in Reports group ordering.

#### Scenario: Render Reports group
- **WHEN** Desktop renders Reports group entries
- **THEN** `Add Report` MUST appear before `Reports` and `Report Review`

### Requirement: Desktop Add Report entry SHALL open dedicated create page in new tab
The system SHALL open `/reports/new` in a new tab when user clicks `Add Report` from Desktop.

#### Scenario: Open Add Report from Desktop
- **WHEN** Admin or Analyst clicks `Add Report` on Desktop
- **THEN** system MUST open `/reports/new` in a new tab
- **AND** Desktop tab MUST remain open

