# UI 原型设计（Login / Desktop / Users）

## 1. 范围与原则

范围：本 change 实现一个可运行的高保真 UI 原型，用于确认视觉风格、导航方式与组件/交互规范；原型不追求后端对接，数据可使用 mock。

原则：
- “可评审”优先：把交互载体（组件与布局）做对，先不接真实数据。
- Desktop-as-Launcher：功能入口在 Desktop；点击后新标签页打开功能页；功能页不提供返回 Desktop 的导航（用户通过关闭标签页回到 Desktop）。
- 文案：UI 使用英文（错误提示、按钮、表头等）。

已确认（本次原型必须体现）：
- Desktop 展示完整卡片矩阵 + Coming Soon 占位页（除 Users 外均为占位态）。
- 登录页粒子背景（Canvas，约 120 粒子）为必须项。
- 原型实现使用 Tailwind CSS。
- Users 原型需把 Invite/改角色/禁用启用/管理员改密/删除/创建编辑等操作做成可点击的弹窗交互（mock 即可）。

参考（草图）：
- `01-login-page.jpg`
- `02-desktop.jpg`

视觉风格硬约束（验收基线）：
- 基线方向：深色背景、简单大气、专业、富有科技感。
- 登录页与桌面页必须对齐既有原型风格（上述两张图为验收依据）。
- 允许对间距、字号做小幅适配，但不得改变整体视觉方向与信息层级。

## 2. 页面与路由（原型态）

核心页面：
- `/login`
- `/desktop`
- `/users`

统一占位页（用于非 Users 卡片的导航演示）：
- `/coming-soon`（建议用 query param 传 `feature`，例如 `/coming-soon?feature=regions`）

## 3. 页面设计

### 3.1 `/login`

结构：
- 背景：深色渐变 + Canvas 粒子层。
- 表单：标语 + 副标题 + Email/Password + Login。
- 辅助入口：Forgot password（原型态 modal）。

文案（固定）：
- 标语：`The Future is Now`
- 副标题：`Research Report Management System`

交互（原型态即可）：
- 表单验证：空值、Email 格式。
- 加载状态：按钮禁用或显示 spinner。
- 成功/失败模拟：提交后 1-2 秒延迟后给出成功/失败结果（用于演示反馈与状态切换）。
- Forgot password：打开 modal（输入 email -> submit -> success message；mock 即可）。

粒子动画（硬约束）：

```
粒子数量:      120
粒子大小:      1-3px 随机
粒子颜色:      蓝色-青色渐变 (hue: 200-260)
粒子透明度:    0.3-0.7
移动速度:      缓慢漂浮 (速度系数: 2)
连线距离:      < 140px
连线透明度:    根据距离渐变
脉冲效果:      闪烁 (脉冲速度: 0.15)
帧率:          60fps (requestAnimationFrame)
无鼠标交互
```

### 3.2 `/desktop`

顶部导航栏：Logo、Logout。

页面布局：
- 整体宽度适中，避免卡片过宽。
- 两组卡片左右并列：Reports 左侧，Data Management 右侧。
- 每组内卡片竖向排列（非横排网格）。
- 两组之间间距适中。

卡片矩阵（必须体现）：
- 分组：Reports / Data Management。
- 除 Users 外均为 Coming Soon，占位态点击打开统一占位页（新标签页）。
- Users 卡片是唯一"已实现"的功能入口，点击新标签页打开 `/users`。
- 卡片上需要体现权限标签（例如 `Admin only` / `SA/Admin only`）。

卡片矩阵内容：

| Reports 功能组 | Data Management 功能组 |
|---|---|
| 📝 Reports - View all reports | 👤 User Management (Admin only) |
| ➕ New Report - Create new report | 👥 Analyst Info (Admin only) |
| ✅ Report Review (SA/Admin only) | 🏢 Coverage |
| 📄 Templates | 🏗️ Sectors |
|  | 🌍 Regions |

权限演示（建议）：
- 原型可提供一个 “Role” 切换开关（Admin/SA/Analyst）用于演示“Admin-only 卡片的显示/隐藏”。
- 默认以 Admin 视角展示完整卡片矩阵，便于评审信息架构与视觉层级。

### 3.3 `/users`

页面结构：
- Header：Users + 主操作按钮（Invite user）。
- Filters：Search（email/name）。
- Table：列表（Email、Role、Status、Created、Actions）。
- Pagination：UI 表达固定每页 12（原型可只做控件与页码）。

行操作（原型态，mock 即可）：
- Invite user（弹窗表单）。
- Edit user（弹窗表单）。
- Change role（弹窗确认，避免误触）。
- Ban/Unban（危险操作二次确认）。
- Reset password（管理员设置新密码，二次确认）。
- Delete user（危险操作二次确认）。

反馈规范：
- 成功/失败提示：右上角 Toast（详见「状态反馈」）。
- 表单失败：字段级 inline error（并可选用顶部摘要，但必须全站一致）。
- 空态：无用户/无搜索结果。

## 4. 设计系统（Design System）

### 4.1 颜色规范

主色调：
- 背景渐变：`linear-gradient(to bottom, #0c1221 0%, #09090b 50%, #020617 100%)`
- 卡片背景：`#18181b` (zinc-900)
- 边框：`rgba(255, 255, 255, 0.1)` (white/10)
- 边框悬停：`rgba(255, 255, 255, 0.2)` (white/20)

文字颜色：
- 主要文字：`#fafafa` (zinc-50)
- 次要文字：`#a1a1aa` (zinc-400)
- 辅助文字：`#71717a` (zinc-500)
- 禁用文字：`#52525b` (zinc-600)

状态颜色：
- 成功：`#22c55e` (green-500)
- 错误：`#ef4444` (red-500)
- 警告：`#f59e0b` (amber-500)
- 信息：`#3b82f6` (blue-500)

粒子效果颜色：
- 粒子颜色：蓝色-青色渐变 (hue: 200-260)
- 粒子透明度：0.3-0.7
- 连线透明度：根据距离渐变

### 4.2 间距规范

```
按钮内边距:  px-4 py-2 (16px 8px)
卡片内边距:   p-6 (24px)
表单字段间距: space-y-4 (16px)
列表行间距:   border-b white/10
对话框内边距: p-6 (24px)
```

### 4.3 圆角规范

```
卡片圆角:     12px
输入框圆角:   8px
按钮圆角:     6px
对话框圆角:   12px
```

### 4.4 阴影效果

```
卡片阴影:     无，使用边框代替
悬停阴影:     0 4px 12px rgba(0, 0, 0, 0.3)
焦点阴影:     0 0 0 2px rgba(59, 130, 246, 0.5)
```

### 4.5 字体规范

```
页面标题:     text-2xl (24px), font-semibold
卡片标题:     text-sm (14px), font-medium, font-weight 500
卡片描述:     text-xs (12px)
表单标签:     text-sm (14px), font-medium
按钮文字:     text-sm (14px), font-medium
输入框文字:   text-sm (14px)
```

## 5. 组件设计

### 5.1 按钮组件

主要按钮 (Primary Button)

```
背景色: blue-600 hover:bg-blue-700
文字色: white
内边距: px-4 py-2
圆角:   6px
过渡:   transition-colors duration-200
禁用:   opacity-50 cursor-not-allowed
```

次要按钮 (Secondary Button)

```
背景色: zinc-800 hover:bg-zinc-700
文字色: zinc-100
边框:   1px white/10
其他同主要按钮
```

危险按钮 (Danger Button)

```
背景色: red-600 hover:bg-red-700
文字色: white
其他同主要按钮
```

（可选）Ghost Button

```
背景色: transparent
文字色: zinc-200 hover:text-white
悬停:   bg-white/5
边框:   1px white/10 (可选)
```

### 5.2 输入框组件

```
背景色: zinc-900
边框:   1px white/10 focus:blue-500
圆角:   8px
内边距: px-3 py-2
文字色: zinc-100
占位符: zinc-500
焦点:   outline-none ring-2 ring-blue-500
错误:   border-red-500 focus:ring-red-500
```

重要：浏览器自动填充样式

```
自动填充时背景:   保持 zinc-900（不变）
自动填充时文字:   保持 zinc-100（不变）
自动填充伪类:   使用 :-webkit-autofill, :-webkit-autofill:hover, :-webkit-autofill:focus
目的:           防止浏览器改变输入框背景色（如黄色）
注意:           不要让用户感知到自动填充的视觉变化
```

### 5.3 卡片组件

```
背景色: zinc-900
边框:   1px white/10
圆角:   12px
内边距: p-6
悬停:   - 边框变为 white/20
        - 上移 2px (translate-y-[-2px])
        - 过渡 200ms
```

### 5.4 对话框组件

```
遮罩层:   bg-black/70 backdrop-blur-sm
对话框:   bg-zinc-900 border white/10 rounded-12 p-6
最大宽度: max-w-md
位置:     居中
动画:     fade-in, scale-in
```

### 5.5 表格组件

```
表头:     bg-zinc-800/50 text-zinc-400 font-medium
表行:     border-b white/10 hover:bg-zinc-800/30
单元格:   px-4 py-3
文字:     text-sm
```

### 5.6 Badge（Role/Status）

Role 建议：
- Admin：blue
- SA：amber
- Analyst：zinc

Status 建议：
- Active：green
- Banned/Disabled：red

### 5.7 占位页面组件（Coming Soon）

```
背景：     zinc-900 + 居中布局
图标：       大号 emoji（64px）
标题：       "Coming Soon"（text-xl, font-semibold, zinc-100）
描述：       "This feature is coming soon"（text-sm, zinc-400）
内边距：   p-8（32px）
圆角：     12px
```

### 5.8 表单标签样式

```
标签文字：   text-sm, font-medium, zinc-300
必填标记：   红色星号（red-500）
间距：       label 与 input 之间 space-y-1（4px）
错误提示：   显示在 input 下方，text-xs, red-500
```

### 5.9 Toast 组件详细样式

```
位置：       右上角固定（fixed top-4 right-4）
宽度：       max-w-sm（384px）
背景：       成功 green-500 / 错误 red-500
文字：       white
圆角：       8px
内边距：     px-4 py-3
阴影：       0 10px 15px -3px rgba(0, 0, 0, 0.1)
图标：       成功 ✅ / 错误 ❌
动画：       slide-in-from-top + fade-in
```

## 6. 页面布局

顶部导航栏 (Top Navigation)

```
高度:     64px
背景:     zinc-900 + 底部边框
左侧:     Logo "Neoport" (text-xl font-semibold)
右侧:     欢迎文本 + Logout 按钮
Logo 左内边距:  px-6 (24px)
右侧内边距:     px-6 (24px)
```

功能卡片布局 (Desktop - Cards)

```
Reports 组:     上方
Data Management: 下方
网格布局:       grid-cols-2 md:grid-cols-4
卡片间距:       gap-4 (16px)
最大宽度:       max-w-6xl mx-auto
```

页面容器 (Page Container)

```
最大宽度:   max-w-7xl (1280px)
左右内边距: px-6 (24px)
上下内边距: py-8 (32px)
```

## 7. 动画规范

过渡时长：

```
快速: 150ms  - 颜色变化
中速: 200ms  - 悬停效果
慢速: 300ms  - 页面切换
```

缓动函数：

```
默认:   ease-out
弹出:   ease-out-back
滑入:   ease-in-out
```

对话框动画：

```
进入: fade-in + scale-in
退出: fade-out + scale-out
时长: 200ms
```

列表动画（可选）：

```
进入: fade-in + slide-in-from-top
交错: 50ms delay per item
时长: 300ms
```

## 8. 响应式设计

断点：

```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
```

布局适配：

```
登录框:
  默认:    w-full max-w-sm (384px)
  移动端:  px-4

桌面卡片:
  移动端:  grid-cols-1
  平板:    grid-cols-2
  桌面:    grid-cols-4

表格:
  移动端:  隐藏部分列，使用横向滚动
  平板+:   显示所有列

对话框:
  移动端:  w-full mx-4
  桌面:    max-w-md
```

## 9. 图标规范

图标来源：

```
优先: Emoji (系统自带)
备用: Lucide Icons (如需要复杂图标)
尺寸: 40px (卡片), 20px (按钮)
```

常用图标映射：

```
Reports:        📝
New Report:     ➕
Report Review:  ✅
Templates:      📄
User Management: 👤
Analyst Info:    👥
Coverage:       🏢
Sectors:        🏗️
Regions:        🌍
Edit:           ✏️
Delete:         🗑️
Download:       ⬇️
Back:           ←
```

## 10. 状态反馈

加载状态：

```
按钮加载:   spinner inline (16px)
页面加载:   居中 spinner (32px)
列表加载:   skeleton rows
```

成功提示：

```
位置:    右上角 Toast
颜色:    green-500 背景
图标:    ✅
时长:    3s 自动消失
```

错误提示：

```
位置:    右上角 Toast
颜色:    red-500 背景
图标:    ❌
时长:    5s 自动消失
```

空状态：

```
图标:    大号图标 (64px)
文字:    友好的提示文字
动作:    引导操作（如有）
```

## 11. 无障碍设计（基线）

键盘导航：

```
Tab 顺序:  逻辑顺序
焦点可见:  ring-2 ring-blue-500
```

屏幕阅读器：

```
按钮:      aria-label
表单:      aria-describedby
状态:      aria-live="polite"
```

## 12. 性能与兼容性（原型阶段指导）

性能建议：
- 搜索输入建议做 300ms 防抖（若实现）。
- 仅在需要时开启长列表虚拟滚动（本原型通常不需要）。

浏览器兼容：
- 目标：Chrome/Edge/Firefox/Safari 最新两个版本。
- Canvas 不支持时：降级为静态渐变背景。

## 13. 与后续实现的衔接约束

- 后续接入 Supabase 后，页面结构与组件层级尽量不推倒重来：原型中的“操作入口”应可直接绑定到 Server Actions。
- 不引入 Edge Functions；涉及管理员密钥的动作后续必须由 Next.js 服务端执行（本原型仅占位）。
