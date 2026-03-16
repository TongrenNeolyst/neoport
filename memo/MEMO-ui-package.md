# Next.js 专业后台 UI — 推荐库清单（必装 vs 可选）

> 目标：基于 **Next.js + Claude Code** 构建「大气、精美、专业」的 Web 操作界面。
> 分类原则：
>
> * **必装（Essential）**：行业主流组合，几乎所有现代 SaaS / Dashboard 都会用
> * **可选（Recommended / Optional）**：根据项目复杂度或风格升级选择

---

# 🥇 必装（Essential）

## 1. shadcn/ui

**作用：**

* 基于 Tailwind + Radix 的高质量 UI 组件系统
* 提供专业级组件（Card / Dialog / Table / Form 等）
* 可完全控制样式（不像 AntD 那种强绑定）

**为什么必装：**

* 当前 Next.js 生态最主流 UI 基础
* 与 Claude Code 生成代码高度兼容
* 易于建立统一 Design System

---

## 2. tailwindcss

**作用：**

* Utility-first CSS 框架
* 控制布局、间距、字体、颜色

**为什么必装：**

* Claude Code 对 Tailwind 理解能力最强
* 专业 UI = 一致的 spacing + typography
* 现代 React UI 基础设施

---

## 3. lucide-react

**作用：**

* 现代简洁风格的图标库
* 用于 Sidebar、Toolbar、Action 按钮等

**为什么必装：**

* 与 shadcn/ui 风格一致
* 更接近 Linear / Vercel 风格

---

## 4. next-themes

**作用：**

* Dark / Light 主题切换
* 自动跟随系统主题

**为什么必装：**

* 专业 SaaS 基本都有暗黑模式
* 与 shadcn 官方方案匹配

---

## 5. react-hook-form

**作用：**

* 高性能 React 表单管理
* 减少 re-render

**为什么必装：**

* 企业系统大量表单
* 与 shadcn Form 深度集成

---

## 6. zod

**作用：**

* Schema 验证
* 类型安全的数据校验

**为什么必装：**

* Form 校验标准方案
* TypeScript 友好

---

## 7. @hookform/resolvers

**作用：**

* 连接 react-hook-form 与 zod

**为什么必装：**

* RHF + Zod 官方推荐组合

---

## 8. @tanstack/react-table

**作用：**

* 高性能数据表格核心引擎
* 支持排序、筛选、分页

**为什么必装：**

* 后台系统核心组件
* shadcn DataTable 基础

---

## 9. class-variance-authority (CVA)

**作用：**

* 管理组件不同 variant（primary / danger 等）

**为什么必装：**

* 构建设计系统关键
* 防止 Button style 混乱

---

## 10. clsx

**作用：**

* 条件 className 拼接

---

## 11. tailwind-merge

**作用：**

* 自动解决 Tailwind class 冲突

**为什么 clsx + tailwind-merge 必装：**

* 几乎所有 shadcn 项目默认配置
* 防止 class 覆盖错误

---

# 🥈 可选（Recommended / Optional）

## 12. @tanstack/react-query

**作用：**

* 数据请求缓存
* loading / error 管理
* 自动刷新

**适合：**

* 数据密集型 dashboard
* 多页面数据共享

---

## 13. zustand

**作用：**

* 轻量全局状态管理

**适合：**

* Sidebar 状态
* UI 全局控制
* 简单 app state

---

## 14. recharts

**作用：**

* 图表库（柱状图 / 折线图 / 饼图）

**适合：**

* 数据分析界面
* Dashboard KPI 展示

---

## 15. framer-motion

**作用：**

* 动画与微交互
* 页面过渡、hover 动效

**适合：**

* 提升高级感
* 增强操作反馈

---

# 🧩 推荐安装顺序

## Step 1 — 先装基础（必须）

```
shadcn/ui
tailwindcss
lucide-react
next-themes
```

---

## Step 2 — 表单 + 数据（后台核心）

```
react-hook-form
zod
@hookform/resolvers
@tanstack/react-table
```

---

## Step 3 — 设计系统基础

```
class-variance-authority
clsx
tailwind-merge
```

---

## Step 4 — 按需要升级

```
@tanstack/react-query
zustand
recharts
framer-motion
```

---

# ⭐ 最小专业后台组合（推荐基线）

如果你只想要一套「稳定 + 专业 + 不乱」的组合：

```
shadcn/ui
tailwindcss
lucide-react
react-hook-form
zod
@tanstack/react-table
class-variance-authority
```

---

# 🔥 经验总结（核心原则）

真正的大气 UI 来自：

* 统一组件系统（shadcn）
* 一致 spacing（Tailwind）
* 专业数据展示（TanStack Table）
* 统一交互与校验（RHF + Zod）
* 明确 variant 管理（CVA）

库只是基础。

真正的专业感来自：

* Layout 结构一致
* Card 体系统一
* 留白足够
* 状态表达完整（loading / empty / error）

---
