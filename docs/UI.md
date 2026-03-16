# UI 规范（组件 + 视觉一致性）

本文件是 UI 唯一规范源，覆盖：
- 组件设计与编码约定
- 页面视觉基线与一致性约束

说明：
- 原 `docs/FRONTEND_VISUAL_CONSISTENCY.md` 内容已并入本文。
- 业务逻辑与分层约束以 `docs/LOGIC.md` 为准，本文不重复定义。

## 1. 适用范围

- 适用于 `web/` 下所有页面与业务组件（`app/*`、`features/*/components/*`、`components/*`）。
- 新功能默认复用现有 UI 基础组件，不允许另起平行视觉体系。
- 偏离本规范的改动，必须先在 OpenSpec proposal 明确说明并获批准。

## 2. 视觉基线（硬约束）

### 2.1 总体风格
- 风格固定：深色、专业、简洁、科技感。
- UI 文案默认英文。
- 不允许按模块随意切换浅色主题或冲突色板。

### 2.2 全局背景与文本
- 主背景：`linear-gradient(to bottom, #0c1221 0%, #09090b 50%, #020617 100%)`
- 主文字：`text-zinc-100` / `#fafafa`
- 次文字：`text-zinc-400`
- 表单自动填充需保持深色输入框视觉（禁止浏览器默认黄底）。

### 2.3 设计 Token（统一）
- 卡片/弹窗圆角：`rounded-[12px]`
- 输入框圆角：`rounded-[8px]`
- 按钮圆角：`rounded-[6px]`
- 默认边框：`border border-white/10`
- Hover 边框：`border-white/20`
- 焦点态：`focus-visible:ring-2 focus-visible:ring-blue-500/60`
- 动画时长基线：`duration-200`

## 3. 页面级一致性约束

### 3.1 Login 页
- 必须保留粒子背景（`ParticleField`）与居中登录卡片结构。
- 标题/副标题保持：
  - `The Future is Now`
  - `Research Report Management System`
- 登录、忘记密码交互统一复用 `Button` / `Input` / `Modal`。

### 3.2 Desktop 页
- 保持 Desktop-as-Launcher 契约：
  - 功能卡片新标签页打开。
  - 功能页不在页面内实现“返回 Desktop”主导航。
- 保持两组分区结构：`Reports` / `Data Management`。
- Admin-only 能力仅 Admin 可见。
- `Reports` 分组中 `Analyst Submit`（原 Add Report）必须保留，并固定为第一项。
- Desktop 点击 `Analyst Submit` 必须新标签打开 `/reports/new`。

### 3.3 管理列表页（Users / Regions / Analyst Info / 后续同类）
- 页面骨架统一：Header + 搜索区 + 列表区 + 分页区。
- 列表操作统一使用 `Modal` / `ConfirmModal`。
- 状态展示统一使用 `Badge`，主操作统一使用 `Button`。

### 3.4 Reports 创建页
- `Reports` 列表页 Add 必须跳转 `/reports/new`，不得再用弹窗承载完整创建流程。
- 创建页基础信息区采用纵向单列布局。
- `Investment thesis` 必须为多行 textarea，语义为报告摘要。
- `Region` / `Sector` / `Report Type` 必须使用下拉组件。
- `Certificate` 必须为 checkbox，并展示英文条款原文（6 条）；未勾选时提交按钮行为必须给出可见错误。
- Report/Model 上传区必须支持拖拽上传与点击上传两种入口，且两种入口共享同一校验与权限规则。

### 3.5 Template 页
- 模板上传区必须支持拖拽上传（Word/Excel）并保留点击上传兜底。
- 拖拽上传不得绕过既有权限边界（Template 上传仍为 Admin-only）。

## 4. 组件复用规则（强制）

- 按钮必须复用 `web/components/ui/button.tsx`。
- 输入框必须复用 `web/components/ui/input.tsx`。
- 关联实体字段（如 `region_id` / `sector_id` / `analyst_id`）必须使用 `Select` 或等价选择器；禁止自由文本输入 ID。
- 卡片容器必须复用 `web/components/ui/card.tsx`。
- 弹窗必须复用 `web/components/ui/modal.tsx` / `web/components/ui/confirm-modal.tsx`。
- 分页必须复用 `web/components/ui/pagination.tsx`。
- 业务组件允许 `className` 微调，但不得改变基础组件核心 token。

## 5. 组件编码规范

### 5.1 命名
| 类型 | 规范 | 示例 |
|------|------|------|
| 组件名 | PascalCase | `Button`, `UserProfile` |
| 文件名 | kebab-case | `button.tsx`, `user-profile.tsx` |
| Props 类型 | PascalCase + Props | `ButtonProps`, `ModalProps` |
| 变体类型 | PascalCase | `ButtonVariant`, `BadgeTone` |
| 事件函数 | `handle/on/open/submit` + 动词 | `handleSubmit`, `onClose`, `openInvite` |
| 常量 | UPPER_SNAKE_CASE | `PAGE_SIZE`, `DEFAULT_TIMEOUT` |

### 5.2 文件结构建议
- 1 个文件默认 1 个主组件。
- 独占子组件可同文件；可复用组件应拆文件。
- `index.ts` 仅做导出汇总，不承载复杂逻辑。

### 5.3 Props 与类型
- 默认使用 `type`，需要继承/声明合并时用 `interface`。
- 推荐导出 Props 类型，便于复用。
- 互斥参数优先使用 discriminated unions。

### 5.4 forwardRef 约定
- 使用 `React.forwardRef` 时必须设置 `displayName`。

## 6. 样式规范

### 6.1 基本原则
- 使用 Tailwind utility classes。
- class 合并统一使用 `cn()`。
- `components/ui/*` 必须支持 `className` 覆盖。
- 避免滥用 `@apply`，优先组件抽象。

### 6.2 类名组织顺序（推荐）
1. 布局
2. 尺寸
3. 边框/圆角
4. 背景
5. 文字
6. 效果
7. 状态
8. 条件样式
9. 外部 `className`

### 6.3 间距
- 优先 `space-*`，减少重复 `margin`。

## 7. 可访问性基线

- 按钮可点击区域尽量 ≥ 44px。
- 输入框必须关联 label。
- 弹窗需 `role="dialog"` 与 `aria-modal="true"`。
- Toast 建议 `aria-live="polite"`。
- 纯装饰图标加 `aria-hidden="true"`。
- 加载态建议 `aria-busy`。

## 8. 组件目录与现有基线组件

### 8.1 目录约定
```text
web/components/
├── ui/                 # 基础 UI 组件（纯 UI，不触库）
└── particles/          # 视觉效果组件（纯 UI/动效）
```

### 8.2 基础 UI 组件（`components/ui/`）
| 组件 | 文件 | 用途 | 核心 Props |
|------|------|------|------------|
| `Button` | `button.tsx` | 统一按钮与 loading | `variant`, `isLoading` |
| `Input` | `input.tsx` | 统一输入框/label/error | `label`, `error` |
| `Modal` | `modal.tsx` | 统一弹窗容器 | `open`, `title`, `description`, `footer`, `onClose` |
| `ConfirmModal` | `confirm-modal.tsx` | 确认对话框 | `open`, `title`, `description`, `onConfirm`, `confirmTone`, `confirmLabel` |
| `ToastProvider`/`useToast` | `toast.tsx` | 全局反馈 | `toast.success()`, `toast.error()` |
| `Badge` | `badge.tsx` | 权限/状态标签 | `tone` |
| `Card` | `card.tsx` | 卡片容器 | 继承 `div` props |
| `Table` 系列 | `table.tsx` | 统一表格 | 语义化子组件 |
| `ActionButton` | `action-button.tsx` | 表格行操作按钮 | `tone` |
| `Pagination` | `pagination.tsx` | 分页控件 | `page`, `totalPages`, `onChange` |

### 8.3 视觉效果组件（`components/particles/`）
| 组件 | 文件 | 用途 | 核心 Props |
|------|------|------|------------|
| `ParticleField` | `particle-field.tsx` | 粒子背景 | `particleCount` |

## 9. 交互模式与禁止项

### 9.1 交互模式
- 弹窗关闭统一走 `onClose`。
- 危险操作（删除、禁用等）必须二次确认。
- 空态必须给出明确文案（如 `No users found`）。

### 9.2 禁止项（防视觉漂移）
- 禁止业务页面直接写冲突 token（圆角/边框/色板）。
- 禁止新增平行按钮/输入框/弹窗体系。
- 禁止页面间出现冲突背景体系。
- 禁止未评审引入新全局字体和颜色变量。
- 禁止用临时内联样式破坏 focus/disabled/error 状态。

## 10. PR 自检与门禁

PR 自检清单：
- 是否复用 `components/ui` 基础组件。
- 是否符合统一 token（6/8/12 圆角、white/10 边框、blue focus ring、200ms 过渡）。
- 是否保持页面骨架一致（Header/Filter/Table/Pagination）。
- 是否保留 Desktop-as-Launcher 与权限可见性规则。
- 是否在移动端保持可读可用。

门禁：
- 视觉基线调整必须先更新本文，再进入实现。
- Code Review 发现视觉漂移按 bug 处理。
