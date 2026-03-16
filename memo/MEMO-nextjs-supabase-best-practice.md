⭐⭐ 第一优先（Next.js 官方路线）
npx @next/codemod@canary agents-md

这是：

✔ Next.js team 官方推荐
✔ 专门为 AI coding agent 设计

⭐ 第二优先（Vercel 官方 skills）
npx skills add vercel-labs/agent-skills

你重点用：

react-best-practices

web-design-guidelines


Supabase Agent Skills
Agent Skills to help developers using AI agents with Supabase. Agent Skills are folders of instructions, scripts, and resources that agents like Claude Code, Cursor, Github Copilot, etc... can discover and use to do things more accurately and efficiently.

The skills in this repo follow the Agent Skills format.

Installation
npx skills add supabase/agent-skills
Claude Code Plugin
You can also install the skills in this repo as Claude Code plugins

/plugin marketplace add supabase/agent-skills
/plugin install postgres-best-practices@supabase-agent-skills
Available Skills
supabase-postgres-best-practices
Usage
Skills are automatically available once installed. The agent will use them when relevant tasks are detected.

Examples:

Optimize this Postgres query
Review my schema for performance issues
Help me add proper indexes to this table

