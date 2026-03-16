## ADDED Requirements

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

