# ui-prototype-users 规格

## Purpose

TBD（原型阶段：锁定 `/users` 的列表、弹窗与反馈交互）。

## Requirements

### Requirement: 系统提供用户管理原型页面
系统 SHALL 提供用户管理原型页面用于确认表格、弹窗与交互载体。

#### Scenario: 访问 Users 页面
- **WHEN** 用户访问 `/users`
- **THEN** 页面 MUST 展示标题 `Users` 与 Invite user 按钮
- **AND** 页面 MUST 展示搜索输入框（按 email/name）
- **AND** 页面 MUST 展示用户表格（包含 Email、Role、Status、Created、Actions）

### Requirement: Users 列表分页固定为 12 条
系统 SHALL 使用固定分页规则演示列表体验。

#### Scenario: 超过 12 条显示分页
- **WHEN** Users 列表数据超过 12 条
- **THEN** 页面 MUST 展示分页控件
- **AND** 每页 MUST 固定展示 12 条

### Requirement: Users 支持搜索过滤
系统 SHALL 支持按 email 或 name 进行搜索过滤。

#### Scenario: 按 email/name 搜索
- **WHEN** 用户输入搜索关键字
- **THEN** 表格 MUST 仅展示匹配的用户

### Requirement: Invite user 弹窗交互
系统 SHALL 提供 Invite user 的弹窗交互载体（mock）。

#### Scenario: 打开 Invite user
- **WHEN** 用户点击 Invite user
- **THEN** 系统 MUST 打开弹窗并展示 Email 与 Role 字段

#### Scenario: 提交 Invite user
- **WHEN** 用户在弹窗中提交有效数据
- **THEN** 系统 MUST 展示成功提示（toast）
- **AND** 系统 MUST 在列表中反映新增用户（mock 更新即可）

### Requirement: Edit user 弹窗交互
系统 SHALL 提供 Edit user 的弹窗交互载体（mock）。

#### Scenario: 打开 Edit user
- **WHEN** 用户点击某一行的 Edit 操作
- **THEN** 系统 MUST 打开编辑弹窗并展示可编辑字段

#### Scenario: 提交 Edit user
- **WHEN** 用户提交编辑弹窗
- **THEN** 系统 MUST 展示成功提示（toast）
- **AND** 系统 MUST 在列表中反映更新结果（mock 更新即可）

### Requirement: Change role 弹窗交互
系统 SHALL 提供 Change role 的弹窗交互载体（mock）。

#### Scenario: 修改角色
- **WHEN** 用户对某一用户执行 Change role 并确认
- **THEN** 系统 MUST 在列表中反映新角色（mock 更新即可）

### Requirement: Ban/Unban 二次确认交互
系统 SHALL 提供 Ban/Unban 的二次确认交互载体（mock）。

#### Scenario: Ban 用户
- **WHEN** 用户对某一用户点击 Ban 并确认
- **THEN** 系统 MUST 将该用户状态标记为禁用（mock 更新即可）
- **AND** 系统 MUST 展示成功提示（toast）

#### Scenario: Unban 用户
- **WHEN** 用户对某一被禁用用户点击 Unban 并确认
- **THEN** 系统 MUST 将该用户状态标记为启用（mock 更新即可）
- **AND** 系统 MUST 展示成功提示（toast）

### Requirement: Reset password 弹窗交互
系统 SHALL 提供 Reset password 的弹窗交互载体（mock）。

#### Scenario: 重置密码
- **WHEN** 用户对某一用户执行 Reset password 并确认
- **THEN** 系统 MUST 展示成功提示（toast）

### Requirement: Delete user 二次确认交互
系统 SHALL 提供 Delete user 的二次确认交互载体（mock）。

#### Scenario: 删除用户
- **WHEN** 用户对某一用户点击 Delete 并确认
- **THEN** 系统 MUST 从列表移除该用户（mock 更新即可）
- **AND** 系统 MUST 展示成功提示（toast）

### Requirement: 统一反馈样式
系统 SHALL 提供统一的成功/失败反馈样式，便于评审交互一致性。

#### Scenario: 展示 toast
- **WHEN** 任何操作完成并需要提示结果
- **THEN** 系统 MUST 在右上角展示 toast 提示（成功/失败）

