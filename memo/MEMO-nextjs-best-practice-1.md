# Vercel 官方Agent Skills翻译+思路解析+详细安装教程

# 一、核心内容翻译（官方原文精准中文版）

## （一）Vercel 官方博客原文（AGENTS.md 优于 Skills）

### 1. 核心结论（官方原话）

> 我们原本期望 Skills 能成为教编码Agent掌握框架专属知识的解决方案。但在针对 Next.js 16 API 构建评估后，我们发现了一个意外结果：直接嵌入到 AGENTS.md 中、仅8KB的压缩文档索引，通过率达到了100%；而即便明确指示Agent使用Skills，其最高通过率也仅为79%。若不给出明确指示，Skills的表现甚至与没有任何文档时别无二致。
> 
> 

### 2. 放弃Skills的原因（官方原文）

> ❌ Skills 无法被可靠触发
> 
>       在56%的评估案例中，Skill 从未被调用过。Agent 虽然可以访问文档，但并未使用它。添加Skill后，通过率与基准值（53%）相比没有任何提升（仍为53%）。
> 
> ❌ 明确指示虽有帮助，但表述方式极其敏感
> 
>       即便使用诸如“编写代码前，先查看项目结构，再调用nextjs-doc技能”这样的提示，通过率也仅能达到79%——而且提示语的微小改动，就会导致Agent的行为发生巨大变化。
> 
> 

### 3. 选择AGENTS.md的原因（官方原文）

> 如果我们彻底取消“Agent是否调用Skill”的决策环节呢？与其寄希望于Agent主动调用Skill，不如直接将文档索引嵌入到AGENTS.md中。
> 
>       我们添加了一条关键指令：
> 
>       【重要提示：在执行任何Next.js相关任务时，优先采用“检索导向型推理”，而非“预训练导向型推理”。】
> 
> 为什么“被动式上下文”优于“主动式检索”？
> 
>       1.  无需决策：Agent无需判断“我是否需要查阅这个内容？”
> 
>       2.  持续可用：AGENTS.md 在每一轮交互中，都会存在于系统提示中。
>       3.  无顺序问题：无需选择“先读文档还是先查看项目结构”。
> 
> 

### 4. 最终评估结果（官方表格中文版）

|配置方式|通过率|与基准值对比|
|---|---|---|
|基准值（无任何文档）|53%|—|
|Skill（默认行为，无明确指示）|53%|+0个百分点|
|Skill（含明确调用指示）|79%|+26个百分点|
|**AGENTS.md 文档索引**|**100%**|**+47个百分点**|
## （二）Next.js 仓库 AGENTS.md 原文（核心指令中文版）

项目根目录 AGENTS.md 中，会自动注入以下官方强制指令：

```plain text
[Next.js 文档索引]|root: ./.next-docs|
停止。你记忆中关于Next.js的内容，对于本项目来说是错误的。
执行任何任务前，务必先检索并阅读文档。
若文档缺失，请先运行以下命令：
npx @next/codemod agents-md --output AGENTS.md
```

## （三）Vercel Agent Skills 官方定义（中文版）

### 1. 官方定位

> Agent Skills 是一种开放标准，用于打包编码Agent可使用的领域知识。一个Skill会整合提示语、工具和文档，供Agent「按需调用」。
> 
> 

### 2. 官方技能列表（vercel-labs/agent-skills 仓库）

- react-best-practices：40+ 条 React/Next.js 性能优化规则（含打包体积、请求瀑布流、重复渲染优化）

- web-design-guidelines：100+ 条设计规范（含可访问性、国际化、用户体验相关）

- vercel-deploy-claimable：自动将项目部署到 Vercel 平台

### 3. 官方安装命令（原文保留，后续拆分解读）

```bash
npx skills add vercel-labs/agent-skills
```

## （四）Next.js 团队最终立场（官方总结中文版）

> Skills 并非毫无用处。对于「垂直的、特定操作的工作流」（例如“升级Next.js版本”“迁移到App Router”），它们的表现更好。
> 
>       但对于「通用的框架知识」，「被动式上下文（AGENTS.md）」目前的表现优于「按需检索（Skills）」。
> 
>       我们的目标是将Agent从「预训练导向型推理」转变为「检索导向型推理」——而 AGENTS.md 是实现这一目标最可靠的方式。
> 
> 

# 二、核心思路梳理（讲明白官方逻辑）

## （一）先明确：Vercel 官方 Agent Skills 是什么？

Vercel 推出了官方实验性的 Agent Skills 仓库（vercel-labs/agent-skills），但它**不是 Next.js 专属**——核心是打包“领域知识”（React最佳实践、部署流程等），供AI Agent 按需调用，本质是“给Agent的可触发工具包”。

而 Skills.sh 是 Vercel 主导的一套 Agent Skills 标准（类似“技能市场规范”），所有符合标准的Skills，都能通过统一命令安装和使用。

## （二）关键转变：Next.js 团队为什么放弃 Skills，转而用 AGENTS.md？

这是官方最核心的思路调整，也是99%的人不知道的点，本质是“解决Skills的致命问题”：

### 1. 放弃 Skills 的3个核心原因（官方痛点）

- Next.js 框架 API 更新太快：Skills 里的规则是“固定的”，一旦API迭代，Skills就会过时失效；

- LLM 训练数据滞后：Agent 的预训练知识跟不上框架更新，依赖 Skills 这种“固定工具”，只会加剧“信息过时”；

- Skills 是“被动触发”：Agent 必须主动决定“是否调用Skill”，但实际评估中，近60%的案例里Agent不会调用，导致Skills形同虚设，甚至不如不用。

### 2. 选择 AGENTS.md + Docs Index 的核心逻辑

官方的核心诉求是让 Agent 拥有「always-on context」（始终在线的上下文），简单说就是：

不用Agent“主动找工具”，而是直接把“最新的框架文档索引”嵌入到 AGENTS.md 中，并且让这份文档“全程陪伴Agent”（每一轮交互都在系统提示里）。

同时强制要求 Agent：“先查文档，再做任务”，彻底避免“凭过时记忆做事”，这也是为什么 AGENTS.md 的评估通过率能达到100%——本质是“用实时检索替代固定工具”。

### 3. 最终立场（不否定Skills，而是分场景使用）

官方不是完全抛弃Skills，而是“分场景适配”：

- 用 AGENTS.md：解决「通用框架知识」（比如Next.js基础用法、核心API），保证Agent获取的信息实时、准确；

- 用 Skills：解决「特定操作流程」（比如升级框架、部署项目），这类场景流程固定，不易过时，适合“按需调用”。

# 三、详细安装方法（分2类，一步一步照着来，讲清每步作用）

重点：安装分为「Vercel 官方 Agent Skills 安装」和「AGENTS.md 生成安装」，两者用途不同，分开讲解，全程无需复杂配置，新手也能搞定。

## （一）安装 Vercel 官方 Agent Skills（vercel-labs/agent-skills）

用途：给AI Agent 安装 React 性能优化、Vercel 部署等“可按需调用的技能”，基于 Vercel 主推的 Skills.sh 生态，全程1步完成。

### 前置条件（必看）

- 已安装 Node.js（版本16+，建议18+）：打开终端，输入 `node -v`，能显示版本号即可（若未安装，去Node.js官网下载安装，下一步默认自动配置）；

- 终端可正常联网：安装过程需要下载技能包，无需科学上网（国内可正常访问）；

- 无需提前安装 Vercel CLI：命令会自动调用相关依赖，不用手动额外配置。

### 具体安装步骤（3步，每步讲清作用）

1. 打开终端（Windows：CMD/PowerShell；Mac：终端；Linux：终端），进入你的项目根目录（关键！）
      作用：确保Skills安装到当前项目中，Agent能在该项目中调用；

      命令示例（Mac/Windows通用）：`cd 你的项目路径`（比如 `cd /Users/xxx/Desktop/my-nextjs-project`，可复制项目路径，粘贴到终端后回车）。

2. 输入官方安装命令，回车执行：
`npx skills add vercel-labs/agent-skills`
      作用：通过 npx（Node.js 自带的临时执行工具），调用 Skills.sh 生态的 `skills add` 命令，下载并安装 Vercel 官方实验性Skills包；

      补充：npx 会自动下载 `skills` 相关依赖，无需手动 `npm install skills`，执行命令后等待10-30秒（取决于网络速度）。

3. 验证安装成功（可选，新手可跳过）
 安装完成后，终端会显示“Successfully added skill: vercel-labs/agent-skills”（成功添加技能）；

      若想确认技能是否可用，可输入 `npx skills list`，终端会列出已安装的Skills，其中包含 `react-best-practices` 等3个官方技能，即安装成功。

### 常见问题解决（新手必看）

- 问题1：终端提示“npx: 未找到命令”——原因：Node.js未安装或未配置环境变量；解决：重新安装Node.js，安装时勾选“Add to PATH”（默认勾选），安装完成后重启终端即可。

- 问题2：安装卡住，提示“timeout”——原因：网络不稳定；解决：重新执行安装命令，或切换手机热点尝试。

- 问题3：安装成功后，Agent 无法调用Skills——原因：未明确指示Agent调用（参考官方结论，Skills需要明确提示才能触发）；解决：在给Agent的提示语中，添加“调用vercel-labs/agent-skills中的相关技能”即可。

## （二）生成/安装 AGENTS.md（Next.js 官方推荐，核心）

用途：给当前 Next.js 项目生成 AGENTS.md 文件（含最新文档索引），让AI Agent 拥有“实时框架上下文”，解决Skills过时问题，全程1步完成。

### 前置条件（必看）

- 已安装 Node.js（同上面的条件，版本16+）；

- 当前项目是 Next.js 项目（关键！）：若不是Next.js项目，执行命令会报错；可通过 `npx create-next-app@latest` 快速创建一个Next.js项目（可选，新手可先创建项目）。

### 具体生成步骤（2步，每步讲清作用）

1. 打开终端，进入你的 Next.js 项目根目录（和安装Skills的步骤1一致）

      命令：`cd 你的Next.js项目路径`（比如`cd /Users/xxx/Desktop/my-nextjs-project`），回车确认。

2. 输入官方生成命令，回车执行：
`npx @next/codemod agents-md --output AGENTS.md`
      作用：通过 Next.js 官方提供的 codemod（代码转换工具），自动生成 AGENTS.md 文件，并写入最新的 Next.js 文档索引；
 补充：`--output AGENTS.md` 表示“将生成的内容保存为 AGENTS.md 文件”，默认保存在项目根目录；
等待10-20秒，终端提示“Successfully generated AGENTS.md”，即生成成功。

### 验证生成成功（必做，简单易操作）

打开你的 Next.js 项目根目录，会看到一个名为 `AGENTS.md` 的文件，打开后：

- 顶部会有 `[Next.js Docs Index]|root: ./.next-docs|` 标识（文档索引标记）；

- 包含官方强制指令（“停止。你记忆中关于Next.js的内容，对于本项目来说是错误的...”）；

- 下方是压缩后的 Next.js 文档索引，说明生成成功。

### 使用说明（关键，生成后怎么用）

生成 AGENTS.md 后，无需额外“安装”，只需将该文件的内容（或文件路径）告知AI Agent，Agent 就会自动遵循以下规则：

- 执行任何 Next.js 相关任务前，先检索 AGENTS.md 中的文档索引；

- 若文档索引缺失，会自动提示你重新运行生成命令，确保信息实时；

- 无需你额外提示，Agent 会自动采用“检索导向型推理”，避免用过时知识。

# 四、总结（快速抓重点）

- Next.js 官方放弃“用Skills教Agent框架知识”，转而用 AGENTS.md + 文档索引，核心是解决Skills过时、被动触发的问题，实现“实时上下文”；

- 安装/生成步骤都很简单，核心是：先进入项目根目录，再执行对应命令，新手可直接照着步骤敲，无需额外配置。
> （注：文档部分内容可能由 AI 生成）