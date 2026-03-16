@docs/README.md

# AGENTS.md

AI 编程助手的统一指导文件。Claude Code 和 Codex 共享此配置。

## 文档索引

| 文档 | 定位 | 主要回答的问题 |
|------|------|----------------|
| `docs/README.md` | 文档入口与加载协议 | 启动时加载哪些文档、冲突怎么判定 |
| `docs/REQUIREMENTS.md` | 业务需求总览（WHAT） | 系统要做什么、角色能做什么、验收口径是什么 |
| `docs/ARCHITECTURE.md` | 系统架构与技术边界（HOW-系统） | 系统怎么分层、边界如何划分、数据库规范是什么 |
| `docs/DATA_MODEL.md` | 逻辑数据模型（表/约束/RLS） | 有哪些数据实体、表结构口径、权限矩阵是什么 |
| `docs/LOGIC.md` | Web 代码实现规范（HOW-代码） | 代码放哪里、依赖怎么走、触库规则是什么 |
| `docs/UI.md` | UI 组件与视觉一致性规范 | 页面/组件应该长什么样、如何避免视觉漂移 |
| `docs/TESTING.md` | 测试与验收规范 | 怎么测、覆盖什么、通过标准是什么 |
| `docs/SUPABASE_DB_VERSIONING.md` | Supabase 数据库版本管理规范 | migration/seed/seed.ts 各负责什么、如何一键初始化与幂等执行 |
| `docs/DECISIONS.md` | 长期决策（ADR） | 哪些约束长期固定、为什么固定 |
| `docs/CHANGELOG.md` | 变更日志（按时间） | 最近改了什么、影响范围是什么 |
| `docs/OPENSPEC_ARCHIVE_BACKFILL.md` | OpenSpec 归档与回填流程 | 如何触发归档并把 change 结论回填到 docs |

> 完整规则定义见 `docs/README.md`，按需查阅即可。


## 语言偏好

- 默认使用中文与用户沟通，思考过程也使用中文
- 产出的文档、说明、计划与总结默认使用中文
- 仅在用户明确要求时切换语言

## 沟通原则

向用户提问澄清需求或做决策时，必须同时给出：
- 推荐选项（默认）
- 关键考量/取舍
- 不确定时的默认决策

避免只抛问题。

---

## 使用 OpenSpec 管理变更

### Proposal 文档规范

每个 change 的 `proposal.md` 必须包含：

**1. 权限模型（必须包含）**

涉及角色和权限的 change 必须提供两个权限矩阵：

- **角色功能权限矩阵**：各角色对功能模块的访问权限（✅/❌）
- **角色数据表权限矩阵（RLS）**：各角色对数据表的 SELECT/INSERT/UPDATE/DELETE 权限

**2. 文档结构要求**

- 三大块：目标与背景 → 需求 → 设计约束与规范
- 内容内聚，避免分散
- 需求与设计分离

**3. 设计文档规范**

`design.md` 应包含：设计基线、数据模型、权限安全、页面交互、技术实现方案。

---

## 经验积累（Instinct 系统）

- `/instinct-status`：查看已积累的经验
- `/instinct-import <文件>`：导入新的经验
- `/instinct-export`：导出经验供分享
