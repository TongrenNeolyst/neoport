# Skills.sh 生态使用指南 & 常用技能清单

# Skills.sh 生态使用指南 & 常用技能清单

## 目录

1. [Skills.sh 生态快速上手](#1-skillssh-生态快速上手)

- [准备工作](#11-准备工作)

- [核心：Skills CLI 管理技能](#12-核心skills-cli-管理技能)

- [在 AI 助手中使用技能](#13-在-ai-助手中使用技能)

- [团队协作（版本化）](#14-团队协作版本化)

- [自定义技能（进阶）](#15-自定义技能进阶)

- [常见问题](#16-常见问题)

2. [常用技能清单 + 一键安装脚本](#2-常用技能清单--一键安装脚本)

- [一键安装脚本](#21-一键安装脚本)

- [技能清单说明（附调用方式）](#22-技能清单说明附调用方式)

- [使用小贴士](#23-使用小贴士)

---

## 1. Skills.sh 生态快速上手

使用 Skills.sh 生态的核心逻辑：**用 CLI 管理技能 + 在 AI 助手自动/手动调用**，全程像使用 npm 管理依赖一样简单。

### 1.1 准备工作（1 分钟完成）

- 确保已安装 **Node.js ≥ 18**（含 npm/npx）

- 已安装支持 Skills 的 AI 工具（推荐：Claude Code、Cursor、VS Code + Continue、GitHub Copilot）

- 打开终端，进入你的项目目录

### 1.2 核心：Skills CLI 管理技能

#### 1.2.1 安装 Skills CLI（可选，推荐全局）

```bash
# 全局安装（推荐，所有项目可用）
npm install -g @skills/cli

# 或直接用 npx 临时运行（无需安装）
npx skills --help
```

#### 1.2.2 发现技能（3 种方式）

```bash
# 方式1：官网浏览（按分类/安装量筛选）
# https://skills.sh

# 方式2：命令行搜索
npx skills find react
npx skills find vercel

# 方式3：安装入口技能（内置搜索）
npx skills add vercel-labs/skills --skill find-skills
```

#### 1.2.3 安装技能（最常用）

```bash
# 1. 安装 Vercel 官方 React 最佳实践（推荐）
npx skills add vercel-labs/agent-skills@vercel-react-best-practices

# 2. 全局安装（所有项目共享）
npx skills add -g vercel-labs/agent-skills@web-design-guidelines

# 3. 从 GitHub 完整 URL 安装
npx skills add https://github.com/vercel-labs/agent-skills

# 4. 从本地目录安装（自定义技能）
npx skills add ./my-custom-skill
```

> 安装后自动同步到所有支持的 AI 工具目录（软链接机制）。

#### 1.2.4 管理已安装技能

```bash
# 查看已安装
npx skills list

# 检查更新
npx skills check

# 更新所有技能
npx skills update

# 卸载技能
npx skills remove vercel-react-best-practices
```

### 1.3 在 AI 助手中使用技能（自动 + 手动）

#### 1.3.1 自动调用（默认）

安装后，AI 助手会**自动识别任务并加载技能**：

- 写 React 代码 → 自动触发 `vercel-react-best-practices`

- 做 UI 设计 → 自动触发 `web-design-guidelines`

- 无需额外配置，直接正常使用 AI 即可

#### 1.3.2 手动强制调用（推荐，确保生效）

在 AI 对话中用 **`/` 命令** 或明确指令强制使用：

```Plain Text
# Cursor / Claude Code 示例
/vercel-react-best-practices 帮我优化这个 React 组件

# 或自然语言
请使用 vercel-react-best-practices 技能审查我的代码
```

#### 1.3.3 不同工具的调用方式

|AI 工具|调用方式|
|---|---|
|Cursor|`/技能名` 或在设置中开启自动加载|
|Claude Code|`/技能名` 或在 Prompt 中指定|
|VS Code + Continue|在聊天框输入 `/技能名`|
|GitHub Copilot|在注释中 `// @skill: 技能名`|
### 1.4 团队协作（版本化）

```bash
# 1. 安装技能后生成 .skill-lock.json
# 2. 提交到 Git
git add .skill-lock.json
git commit -m "add project skills"

# 3. 团队成员克隆后一键安装
npx skills install
```

### 1.5 自定义技能（进阶）

#### 步骤1：创建技能目录结构

```Plain Text
my-skill/
├── SKILL.md       # 元数据 + 指令（YAML + Markdown）
├── scripts/       # 可执行脚本（Shell/JS）
└── resources/     # 模板/示例
```

#### 步骤2：编写 SKILL.md（示例）

```yaml
---
name: my-react-lint
description: 自定义 React 代码审查
triggers: [react, code review, lint]
---
# 执行步骤
1. 检查组件是否使用 memo
2. 检测不必要的重渲染
3. 给出修复建议
```

#### 步骤3：本地安装测试

```bash
npx skills add ./my-skill
```

#### 步骤4：发布到 GitHub 共享

### 1.6 常见问题

- **技能不生效**：重启 AI 工具；检查 `.agents/skills/` 目录是否存在

- **跨工具不同步**：用 `npx skills sync` 强制同步

- **权限问题**：用 `sudo` 或检查目录权限

---

## 2. 常用技能清单 + 一键安装脚本

### 2.1 一键安装脚本（复制即用）

```bash
# ==============================================
# Skills.sh 高频技能一键安装脚本
# 涵盖 React/Next.js、部署、代码审查、UI/UX 等核心场景
# ==============================================

# 1. 基础依赖（确保 CLI 可用）
npm install -g @skills/cli

# 2. Vercel/Next.js 核心技能（官方）
npx skills add vercel-labs/agent-skills@vercel-react-best-practices  # React/Next.js 最佳实践
npx skills add vercel-labs/agent-skills@vercel-deploy-claimable       # 一键部署到 Vercel
npx skills add vercel-labs/agent-skills@nextjs-14-optimization        # Next.js 14 性能优化

# 3. 代码质量与审查
npx skills add skillsmp/code-quality@eslint-prettier-auto-fix         # ESLint/Prettier 自动修复
npx skills add skillsmp/code-quality@typescript-best-practices        # TypeScript 规范
npx skills add skillsmp/code-quality@accessibility-check              # 前端无障碍审查

# 4. UI/UX 设计规范
npx skills add vercel-labs/agent-skills@web-design-guidelines         # 通用 UI/UX 规范
npx skills add skillsmp/ui-ux@tailwind-best-practices                 # Tailwind CSS 最佳实践
npx skills add skillsmp/ui-ux@responsive-design-check                 # 响应式设计检测

# 5. 协作与效率
npx skills add skillsmp/collab@git-commit-guidelines                  # Git 提交规范（Conventional Commits）
npx skills add skillsmp/collab@pr-description-generator               # PR 描述自动生成
npx skills add skillsmp/efficiency@jsdoc-auto-generate                # JSDoc 注释自动生成

# 6. 验证安装结果
npx skills list
echo "✅ 所有高频技能安装完成！在 AI 助手中用 /技能名 即可调用"
```

### 2.2 技能清单说明（附调用方式）

|技能名称|核心功能|AI 中调用指令（示例）|
|---|---|---|
|vercel-react-best-practices|React/Next.js 性能/规范审查|`/vercel-react-best-practices 优化这个组件`|
|vercel-deploy-claimable|一键部署到 Vercel 并生成预览链接|`/vercel-deploy-claimable 部署当前项目`|
|nextjs-14-optimization|Next.js 14 缓存/SSR/ISR 优化|`/nextjs-14-optimization 优化这个 API 路由`|
|eslint-prettier-auto-fix|自动修复 ESLint/Prettier 格式问题|`/eslint-prettier-auto-fix 修复这段代码的格式`|
|tailwind-best-practices|Tailwind 类名优化/复用|`/tailwind-best-practices 优化这个样式代码`|
|git-commit-guidelines|生成符合规范的 Git 提交信息|`/git-commit-guidelines 生成提交信息`|
### 2.3 使用小贴士

1. **批量安装失败？**
   若个别技能安装失败，可单独执行对应 `npx skills add` 命令（通常是网络/权限问题），比如：

```bash
npx skills add vercel-labs/agent-skills@vercel-react-best-practices
```

2. **全局 vs 项目级安装？**
   脚本中是**项目级安装**（仅当前项目可用），若想全局安装（所有项目共享），在命令后加 `-g`：

```bash
npx skills add -g vercel-labs/agent-skills@vercel-react-best-practices
```

3. **更新技能**
   定期执行以下命令更新所有技能到最新版本：

```bash
npx skills update
```

---

## 总结

1. Skills.sh 核心使用逻辑：`npx skills add` 安装技能 → AI 自动/手动调用；

2. 一键脚本覆盖前端开发核心场景，可直接复制执行；

3. 团队协作通过 `.skill-lock.json` 同步技能版本，自定义技能可满足个性化需求。
> （注：文档部分内容可能由 AI 生成）


重点安装：
react-best-practices
web-design-guidelines
