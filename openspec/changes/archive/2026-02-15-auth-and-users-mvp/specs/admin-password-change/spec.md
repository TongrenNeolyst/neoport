## ADDED Requirements

### Requirement: Admin 可以直接修改任意用户密码
系统 SHALL 提供管理员改密能力，允许 Admin 为指定用户设置新密码。

#### Scenario: Admin 改密成功
- **WHEN** Admin 在用户管理页面为指定用户设置新密码
- **THEN** 系统 MUST 更新目标用户密码
- **AND** 目标用户后续登录 MUST 使用新密码

### Requirement: 管理员改密不要求提供旧密码
系统 SHALL 在管理员改密场景下仅要求目标用户标识和新密码，不要求旧密码。

#### Scenario: 改密表单不包含旧密码
- **WHEN** Admin 在用户管理页面执行“管理员改密”
- **THEN** 系统 MUST 仅要求输入新密码（以及目标用户标识）
- **AND** 系统 MUST NOT 要求输入旧密码

### Requirement: 非 Admin 不得执行管理员改密
系统 SHALL 对管理员改密能力实施 Admin 角色限制。

#### Scenario: 非 Admin 改密
- **WHEN** SA 或 Analyst 尝试为任意用户改密
- **THEN** 系统 MUST 返回 403 页面（文案包含 `No permission`）
