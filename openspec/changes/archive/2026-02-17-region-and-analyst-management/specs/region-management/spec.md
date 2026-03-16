# Region 管理

## ADDED Requirements
### Requirement: Admin 可查看 region 列表
The system SHALL 允许 Admin 用户查看所有 region 的列表，包含名称、代码和创建日期。

#### Scenario: Admin 查看 region 列表
- **当** Admin 用户访问 `/regions` 页面
- **则** 系统显示所有 region 列表，展示 name、code 和 created_at
- **且** region 默认按 created_at 降序排列

#### Scenario: 非 Admin 无法访问 regions 页面
- **当** 非 Admin 用户尝试访问 `/regions` 页面
- **则** 系统重定向用户到 `/403` 页面

### Requirement: Admin 可创建 region
The system SHALL 允许 Admin 用户创建新的 region，包含 name 和 code 字段。

#### Scenario: 成功创建 region
- **当** Admin 提交包含有效 name 和 code 的 region 创建表单
- **则** 系统创建新的 region 记录
- **且** 系统显示成功消息
- **且** region 列表刷新显示新 region

#### Scenario: Region name 唯一性验证
- **当** Admin 尝试创建重复 name 的 region
- **则** 系统显示字段级错误，提示 name 已存在
- **且** region 未被创建

#### Scenario: Region code 唯一性验证
- **当** Admin 尝试创建重复 code 的 region
- **则** 系统显示字段级错误，提示 code 已存在
- **且** region 未被创建

### Requirement: Admin 可编辑 region
The system SHALL 允许 Admin 用户修改现有 region 的 name 和 code。

#### Scenario: 成功更新 region
- **当** Admin 提交包含修改后 name 或 code 的 region 编辑表单
- **则** 系统更新 region 记录
- **且** 系统显示成功消息
- **且** region 列表刷新显示更新后的 region

#### Scenario: 编辑 region 唯一性验证
- **当** Admin 尝试更新 region 的 name 或 code 与现有 region 冲突
- **则** 系统显示冲突字段的字段级错误
- **且** region 未被更新

### Requirement: Admin 可删除 region
The system SHALL 允许 Admin 用户在确认后删除 region。

#### Scenario: 成功删除 region
- **当** Admin 确认删除一个 region
- **则** 系统删除 region 记录
- **且** 系统显示成功消息
- **且** region 列表刷新

#### Scenario: Region 删除级联到 analyst
- **当** Admin 删除一个被一个或多个 analyst 引用的 region
- **则** 系统删除 region 记录
- **且** 系统将所有引用该 region 的 analyst 的 region_id 设置为 NULL（ON DELETE SET NULL）

### Requirement: Region 列表支持分页
The system SHALL 在 region 超过 15 条时分页显示。

#### Scenario: Region 列表分页
- **当** region 数量超过 15
- **则** 系统每页显示 15 条 region
- **且** 系统显示分页控件

#### Scenario: 固定页面大小
- **当** 查看 region 列表
- **则** 页面大小固定为 15 条
- **且** 用户无法更改页面大小

### Requirement: Region 列表支持搜索
The system SHALL 允许 Admin 按 name 或 code 搜索 region。

#### Scenario: 按 region name 搜索
- **当** Admin 输入 region name 搜索关键词
- **则** 系统过滤 region，仅显示 name 匹配关键词的结果（模糊匹配）

#### Scenario: 按 region code 搜索
- **当** Admin 输入 region code 搜索关键词
- **则** 系统过滤 region，仅显示 code 匹配关键词的结果（模糊匹配）

### Requirement: 系统提供预设 regions
The system SHALL 包含预设 region 数据：中国、香港、日本、台湾、韩国、印度、澳门、美国。

#### Scenario: 预设 regions 可用
- **当** 系统初始化
- **则** 预设 regions 存在于数据库中
