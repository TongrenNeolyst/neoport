## 1. 数据库约束与初始化

- [x] 1.1 新增迁移：移除 `report.report_type` 固定 5 值 check constraint
- [x] 1.2 新增初始化脚本：在 `template` 预置 `company/sector/company_flash/sector_flash/common` 五种 `report_type`
- [x] 1.3 实现初始化幂等策略（重复执行不产生重复类型）
- [x] 1.4 定义占位模板记录策略（文件可空、默认不激活）并落到 seed/migration data patch
- [x] 1.5 补充迁移回滚说明（恢复约束与兼容已有数据）

## 2. Template 事实源与匹配规则

- [x] 2.1 实现 `Report Type` 下拉数据源查询：`template.report_type` 去重结果
- [x] 2.2 实现“有效模板”判定函数（用于提交流程）
- [x] 2.3 在提交链路接入模板匹配校验（无有效模板则阻断）
- [x] 2.4 调整模板管理逻辑以兼容占位类型记录后续补文件

## 3. 报告提交校验收敛

- [x] 3.1 在 Domain Schema 增加/收敛 report-type 字段矩阵校验（按类型必填）
- [x] 3.2 增加 `Region/Sector` 来源合法性校验（必须来自对应表有效记录）
- [x] 3.3 增加文件门禁校验（所有类型 Word 必传、Company Model 必传）
- [x] 3.4 增加公司类报告 Coverage 关联门禁校验（Company/Flash Company）
- [x] 3.5 增加 `Certificate` 勾选门禁（未勾选不可提交且返回可见错误）
- [x] 3.6 增加 `Reject Note` 必填门禁（SA/Admin reject 无 note 阻断）

## 4. 报告创建页与入口改造

- [x] 4.1 新增/强化独立创建页路由 `/reports/new`（替代弹窗创建）
- [x] 4.2 将 Reports 列表 Add 按钮统一跳转到 `/reports/new`
- [x] 4.3 调整创建页基础字段布局为纵向排列
- [x] 4.4 `Investment thesis` 改为多行 textarea，并明确为报告摘要语义
- [x] 4.5 `Region/Sector/Report Type` 全部改为下拉组件并接入对应数据源
- [x] 4.6 `Certificate` 改为 checkbox + 原文条款展示（按 proposal 文案）

## 5. Desktop 导航改造

- [x] 5.1 在 Desktop Reports 分组保留 `Add Report` 入口
- [x] 5.2 将 `Add Report` 排序为 Reports 分组第一项
- [x] 5.3 Desktop 点击 `Add Report` 时新标签打开 `/reports/new`
- [x] 5.4 校验 SA 不显示 `Add Report`，Admin/Analyst 显示

## 6. 版本与审计展示补齐

- [x] 6.1 确认基本信息/Report 文件/Model 文件变更均触发新版本
- [x] 6.2 在报告详情展示当前报告版本历史（版本号、修改人、修改时间）
- [x] 6.3 版本历史中展示关联 Note/Reason（存在时）

## 7. 测试与验收

- [x] 7.1 单元/集成：`report_type` 来源与模板有效性校验
- [x] 7.2 单元/集成：`Region/Sector` 下拉值合法性校验
- [x] 7.3 单元/集成：`Certificate` 未勾选阻断提交
- [x] 7.4 单元/集成：Company 无 Model 阻断；非 Company 无 Model 可提交
- [x] 7.5 E2E：Desktop `Add Report` 第一位显示与新标签打开行为
- [x] 7.6 E2E：Reports Add 与 Desktop Add 进入同一独立创建页
- [x] 7.7 E2E：Reject 无 Note 阻断、有 Note 成功
- [x] 7.8 E2E：初始化 5 种 report_type 后下拉可见，模板文件可后补
