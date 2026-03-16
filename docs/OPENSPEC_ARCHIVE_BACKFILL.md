# OpenSpec 归档与文档回填触发规范

本文件定义“归档 change 并回填项目主文档”的统一触发方式与执行步骤。

适用场景：
- 需要把某个 change 的结果正式归档到 `openspec/changes/archive/`
- 需要把 `proposal.md` / `design.md` 的结论同步到 `docs/*` 主文档

## 1. 触发方式（给 coding agent）

推荐触发语句（任一即可）：
1. `归档并回填 <change_name>`
2. `执行 OpenSpec 归档并同步 docs: <change_name>`
3. `archive <change_name> and backfill docs`

兼容触发语句（仍支持）：
1. `/archive_change <change_name>`
2. `归档并形成项目全貌文档：<change_name>`

参数约定：
- `<change_name>` 必填，例如 `coverage-sector-template-management`

## 2. 默认执行策略

除非用户明确指定，默认执行以下策略：
1. 使用官方命令 `openspec archive` 完成归档，不手动移动目录
2. 不使用 `--no-validate`
3. 默认合并 specs（不加 `--skip-specs`）

仅当用户明确说“只做文档归档，不合并 specs”时，才使用 `--skip-specs`。

## 3. 标准执行步骤

1. 变更校验
- `openspec list --json` 确认 change 存在
- `openspec validate <change_name> --type change`

2. 执行归档
- `openspec archive <change_name> -y`
- 若用户明确要求跳过 spec 合并：`openspec archive <change_name> -y --skip-specs`

3. 归档结果核验
- `openspec list --json` 不再出现 `<change_name>`
- `openspec/changes/<change_name>/` 已不存在
- `openspec/changes/archive/YYYY-MM-DD-<change_name>/` 已存在

4. 回填主文档（按映射）
- `proposal.md` 回填优先：
  - `docs/REQUIREMENTS.md`
  - `docs/DATA_MODEL.md`
- `design.md` 回填优先：
  - `docs/ARCHITECTURE.md`
  - `docs/LOGIC.md`
  - `docs/UI.md`
  - `docs/TESTING.md`
- 长期约束回填：
  - `docs/DECISIONS.md`
- 关键变更追加：
  - `docs/CHANGELOG.md`

5. 回填规则
- 去重：避免跨文档重复定义
- 整合：写入主题段落，不追加“临时 change 章节”作为主结构
- 覆盖：新结论覆盖旧口径时，更新原位置并保留可追溯来源

## 4. 执行结果输出要求

执行完成后，必须输出：
1. 已归档 change 名称与归档目录路径
2. 实际修改过的 `docs/*` 文件清单
3. 若有未完成项，明确原因与阻塞点

## 5. 说明

- 本仓库已移除自定义 skill `openspec-archive-change-docs`。
- 归档并回填能力改为由本规范文档触发和约束执行。
