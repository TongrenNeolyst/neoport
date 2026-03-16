# Everything Claude Code 插件本地修改备忘

> 本文件记录对 `everything-claude-code` 插件的本地修改。
> **警告**：插件更新后这些修改会被覆盖，需要重新应用。

---

## 修改清单

### 1. 删除开发服务器拦截钩子

**位置**: `~/.claude/plugins/marketplaces/everything-claude-code/hooks/hooks.json`

**原配置**（已删除）:
```json
{
  "matcher": "Bash",
  "hooks": [{
    "type": "command",
    "command": "node -e \"...if(/(npm run dev|pnpm dev|yarn dev|bun run dev)/.test(cmd)){process.exit(2)}...\""
  }],
  "description": "Block dev servers outside tmux"
}
```

**原因**: 允许 AI 直接启动开发服务器，无需强制使用 tmux。

---

### 2. 扩展文档文件白名单

**位置**: 同上文件

| 项目 | 内容 |
|------|------|
| 原正则 | `/(README\|CLAUDE\|AGENTS\|CONTRIBUTING)\.md$/` |
| 新正则 | `/(README\|CLAUDE\|AGENTS\|CONTRIBUTING\|openspec\/changes\/.*\/specs\/.*\/spec\|docs\/.*\|\\/memo\\/.*)\.md$/` |

**注意**:
- `docs\/.*` 和 `\\/memo\\/.*` 需要包含 `.*` 来匹配子路径和文件名
- `\\/memo\\/.*` 使用 `\\/` 匹配绝对路径中的 `/memo/`（如 `/mnt/c/_code/neolyst/memo/xxx.md`）

**新增白名单**:
- `openspec\/changes\/.*\/specs\/.*\/spec` — OpenSpec 规格文件
- `docs\/.*` — 项目文档目录（任意 .md 文件）
- `\\/memo\\/.*` — 备忘录目录（任意 .md 文件，匹配绝对路径）

**原因**: 允许 AI 在这些目录下创建 `.md` 文件。

---

## 插件更新后恢复步骤

```bash
cd ~/.claude/plugins/marketplaces/everything-claude-code
git diff HEAD -- hooks/hooks.json  # 查看当前修改
```

根据上述修改清单，手动恢复两项修改即可。

---

*最后更新: 2026-02-17 (修复 memo 绝对路径匹配)*