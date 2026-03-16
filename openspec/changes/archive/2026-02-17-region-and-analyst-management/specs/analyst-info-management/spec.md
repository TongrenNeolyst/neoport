# Analyst 信息管理

## ADDED Requirements
### Requirement: Admin 可查看 analyst 列表
The system SHALL 允许 Admin 用户查看所有 analyst 的列表，包含全名、中文名、邮箱、region 和状态。

#### Scenario: Admin 查看 analyst 列表
- **当** Admin 用户访问 `/analyst-info` 页面
- **则** 系统显示所有 analyst 列表，展示 full_name、chinese_name、email、region、is_active
- **且** analyst 默认按 created_at 降序排列

#### Scenario: 非 Admin 无法访问 analyst info 页面
- **当** 非 Admin 用户尝试访问 `/analyst-info` 页面
- **则** 系统重定向用户到 `/403` 页面

### Requirement: Admin 可创建 analyst
The system SHALL 允许 Admin 用户创建新的 analyst 记录。

#### Scenario: 成功创建 analyst
- **当** Admin 提交包含有效 full_name、email 和 region 的 analyst 创建表单
- **则** 系统创建新的 analyst 记录
- **且** 系统显示成功消息
- **且** analyst 列表刷新显示新 analyst

#### Scenario: 创建 analyst 需要必填字段
- **当** Admin 尝试创建 analyst 但缺少 full_name、email 或 region
- **则** 系统显示缺少必填字段的字段级错误
- **且** analyst 未被创建

#### Scenario: Analyst email 唯一性验证
- **当** Admin 尝试创建重复 email 的 analyst
- **则** 系统显示字段级错误，提示 email 已存在
- **且** analyst 未被创建

### Requirement: Admin 可编辑 analyst
The system SHALL 允许 Admin 用户修改所有 analyst 字段。

#### Scenario: 成功更新 analyst
- **当** Admin 提交包含修改数据的 analyst 编辑表单
- **则** 系统更新 analyst 记录
- **且** 系统显示成功消息
- **且** analyst 列表刷新显示更新后的 analyst

#### Scenario: 编辑 analyst email 唯一性验证
- **当** Admin 尝试更新 analyst 的 email 与现有 analyst 冲突
- **则** 系统显示 email 字段的字段级错误
- **且** analyst 未被更新

### Requirement: Admin 可删除 analyst
The system SHALL 允许 Admin 用户在确认后删除 analyst 记录。

#### Scenario: 成功删除 analyst
- **当** Admin 确认删除一个 analyst
- **则** 系统删除 analyst 记录
- **且** 系统显示成功消息
- **且** analyst 列表刷新

### Requirement: Analyst 列表支持分页
The system SHALL 在 analyst 超过 15 条时分页显示。

#### Scenario: Analyst 列表分页
- **当** analyst 数量超过 15
- **则** 系统每页显示 15 条 analyst
- **且** 系统显示分页控件

#### Scenario: 固定页面大小
- **当** 查看 analyst 列表
- **则** 页面大小固定为 15 条
- **且** 用户无法更改页面大小

### Requirement: Analyst 列表支持搜索
The system SHALL 允许 Admin 按 full name、Chinese name 或 email 搜索 analyst。

#### Scenario: 按 full name 搜索
- **当** Admin 输入 full name 搜索关键词
- **则** 系统过滤 analyst，仅显示 full_name 匹配关键词的结果（模糊匹配）

#### Scenario: 按 Chinese name 搜索
- **当** Admin 输入 Chinese name 搜索关键词
- **则** 系统过滤 analyst，仅显示 chinese_name 匹配关键词的结果（模糊匹配）

#### Scenario: 按 email 搜索
- **当** Admin 输入 email 搜索关键词
- **则** 系统过滤 analyst，仅显示 email 匹配关键词的结果（模糊匹配）

### Requirement: Analyst 信息与认证用户解耦
The system SHALL 独立维护 analyst 信息，与认证用户分离。

#### Scenario: 创建 analyst 不创建认证用户
- **当** Admin 创建 analyst 记录
- **则** 系统不自动创建认证用户账户

#### Scenario: 删除 analyst 不删除认证用户
- **当** Admin 删除 analyst 记录
- **则** 系统不删除关联的认证用户账户（如有）
