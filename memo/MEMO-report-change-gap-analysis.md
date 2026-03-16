# 需求文档 vs Change 文档差距分析

**日期**: 2026-02-17
**来源文档**: `temp/word/XN需求文档_杨雪.docx`、`temp/word/neolyst_prd_v0.docx`
**对比 Change**:
- `openspec/changes/coverage-sector-template-management/`
- `openspec/changes/report-management-and-approval/`

---

## 一、coverage-sector-template-management 遗漏

### 问题 1：Template 分类不完整

**需求文档**：模板按 `report_type` 分为 5 类：
- Company
- Sector
- Company Flash
- Sector Flash
- Common（Macro/Strategy/Quantitative/Bond）

**当前 proposal**：已定义 `report_type` 字段，但未明确列出这 5 种分类值。

**确认**：是否在 `template.report_type` 中明确约束为这 5 种？（需补充 check 约束）

**决策**: ⏸️ 推迟

---

### 问题 2：Coverage 与 Analyst 的关联字段

**需求文档**：Analyst 在 Coverage 中有"角色"概念（1/2/3/4 作），并且最多 4 名。

**当前 proposal**：`coverage_analyst` 表已有 `role` 和 `sort_order` 字段（1-4），已覆盖。

**状态**: ✅ 已完整，无需修改

---

## 二、report-management-and-approval 遗漏

### 问题 3：报告类型细分与字段矩阵

**需求文档**：不同报告类型的必填字段不同：

| 字段 | Company | Sector | Flash Company | Flash Sector | Common |
|------|---------|--------|---------------|--------------|--------|
| Ticker | ✓ | ✓ | ✓ | | |
| Rating | ✓ | | ✓ | | |
| Target price | ✓ | | ✓ | | |
| Model attachment | ✓ | | | | |
| Region | | ✓ | ✓ | ✓ | ✓ |
| Sector | | ✓ | ✓ | ✓ | |
| Report language | ✓ | | | | ✓ |
| Report title | ✓ | | | | |
| Investment thesis | ✓ | | | | |
| Analyst (max 4) | ✓ | | | | |

**当前 proposal**：`report` 表只有通用字段，未按类型区分必填项。

**确认**：是否需要在 `report` 表设计字段矩阵，并在 UI 层按 `report_type` 动态校验必填字段？

**决策**: ⏸️ 推迟

---

### 问题 4：缺少 Editor 角色和审批流程

**需求文档**：审批流程有三个角色：
- **Editor**：负责格式检查、修改报告信息、打回给 Analyst
- **SA**：最终审核通过/拒绝
- **Analyst**：被拒绝后修改重新提交

流程：
```
提交 → Format take up → Format → (reject) → Analyst revising → ... → Publish
```

**当前 proposal**：只有 SA/Admin 审批，没有 Editor 角色和多阶段流程。

**确认**：
- **选项 A**：v0 先简化为 SA/Admin 单阶段审批（当前设计）
- **选项 B**：加入 Editor 角色和多阶段审批流程

**决策**: A（简化） - v0 保持 SA/Admin 单阶段审批

---

### 问题 5：To-do list 和领取机制

**需求文档**：Editor/SA/Analyst 有 to-do list，需要点击 "Process" 领取报告后才能处理。

**当前 proposal**：无领取机制，SA 直接看到所有 submitted 报告。

**确认**：v0 是否需要领取机制？还是简化为"可见即处理"？

**决策**: ⏸️ 推迟

---

### 问题 6：Hold（插旗）功能

**需求文档**：可对报告插红旗标记，留言原因，多人协作时避免重复领取。

**当前 proposal**：无此功能。

**确认**：v0 是否需要 Hold 功能？

**决策**: ⏸️ 推迟

---

### 问题 7：RQC（Research Quality Control）触发逻辑

**需求文档**：
- 首次覆盖
- 评级调整
- 目标价改动≥30%

触发后需要上传 RQC 审批截图。

**当前 proposal**：未提及 RQC 逻辑。

**确认**：v0 是否需要 RQC 触发和审批截图功能？

**决策**: ⏸️ 推迟

---

### 问题 8：翻译版报告

**需求文档**：
- Add Translation 链接原版报告
- 手动填写翻译标题
- 数据锁定与原版一致
- 只需上传 Word + Investment thesis

**当前 proposal**：未提及翻译版。

**确认**：v0 是否需要支持翻译版报告？

**决策**: ⏸️ 推迟

---

### 问题 9：文件相似度检查

**需求文档**：上传文件时检查与之前版本相似度，<60% 提示用户。

**当前 proposal**：未提及。

**确认**：v0 是否需要文件相似度检查？

**决策**: ⏸️ 推迟

---

### 问题 10：系统自动刷新报告

**需求文档**：提交后系统自动刷新报告内容，文件名添加 `_AutoRefresh` 后缀。

**当前 proposal**：未提及。

**需求文档备注**："独立分开，不要和 Submit 做到一起"

**确认**：v0 暂不做自动刷新？

**决策**: ⏸️ 推迟

---

### 问题 11：缺少的字段

**需求文档**提到的字段，当前 proposal 可能遗漏：

| 字段 | 说明 | 决策 |
|------|------|------|
| `contact_person` | 代为提交时的联系人 | ⏸️ 推迟 |
| `mm_presenter` | 早会主讲人员 | ⏸️ 推迟 |
| `chief_approval_screenshot` | 首席审批截图（若上传者非首席） | ⏸️ 推迟 |
| `rqc_file` | RQC 审批文件 | ⏸️ 推迟 |

---

### 问题 12：Model Excel 校验

**需求文档**：Company 报告 Model 必传，且 Excel 中 XN 页 B1 的 code 必须与 Ticker 一致。

**当前 proposal**：未提及。

**确认**：v0 是否需要 Model Excel 内容校验？

**决策**: ⏸️ 推迟

---

## 三、汇总决策表

| # | 问题 | 决策 |
|---|------|------|
| 1 | Template report_type 枚举约束 | ⏸️ 推迟 |
| 2 | Coverage-Analyst 关联 | ✅ 已完整 |
| 3 | 报告类型字段矩阵 | ⏸️ 推迟 |
| 4 | Editor 角色与多阶段审批 | ⏸️ 推迟 |
| 5 | To-do list 领取机制 | ⏸️ 推迟 |
| 6 | Hold 插旗功能 | ⏸️ 推迟 |
| 7 | RQC 触发逻辑 | ⏸️ 推迟 |
| 8 | 翻译版报告 | ⏸️ 推迟 |
| 9 | 文件相似度检查 | ⏸️ 推迟 |
| 10 | 系统自动刷新报告 | ⏸️ 推迟 |
| 11 | 缺少字段（contact_person 等） | ⏸️ 推迟 |
| 12 | Model Excel 校验 | ⏸️ 推迟 |

**结论**: 2026-02-17 确认，以上功能均推迟到后续版本，v0 保持当前简化设计。

---

## 四、待办事项

确认决策后，需要更新以下文档：
- [x] ~~`openspec/changes/coverage-sector-template-management/proposal.md`~~ 无需更新（功能推迟）
- [x] ~~`openspec/changes/coverage-sector-template-management/design.md`~~ 无需更新（功能推迟）
- [x] ~~`openspec/changes/report-management-and-approval/proposal.md`~~ 无需更新（功能推迟）
- [x] ~~`openspec/changes/report-management-and-approval/design.md`~~ 无需更新（功能推迟）

**结论**: v0 保持当前简化设计，所有高级功能推迟到后续版本。
