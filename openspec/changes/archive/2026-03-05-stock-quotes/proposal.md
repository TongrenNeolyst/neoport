## 目标与背景

当前报告系统缺少实时市场数据来源，分析师在撰写报告时需要手动查找股票和指数行情数据，效率低下且容易出错。

本 change 目标是通过集成 yfinance 外部数据源，实现股票和指数行情数据的自动获取与存储，为报告数据刷新提供数据支持。

## 需求

### Why

- 分析师撰写报告时需要股票（收盘价、成交量、市值等）和指数（上证指数、恒生指数等）行情数据
- 手动查询行情数据耗时且容易遗漏历史数据
- 需要支持报告数据刷新功能，自动更新相关行情数据

### What Changes

1. **yfinance 数据源集成**
   - 集成 yfinance 库获取股票和指数行情数据
   - 支持 A 股、港股、美股等市场的股票数据
   - 支持主要指数（上证指数、深证成指、恒生指数、标普 500 等）

2. **股票行情数据获取**
   - 根据股票代码（ticker）和市场代码获取历史行情
   - 获取字段：收盘价、成交量、市值、流通股数、一年最高价、一年最低价
   - 支持按日期范围获取历史数据

3. **指数行情数据获取**
   - 根据指数代码获取历史行情
   - 获取字段：指数代码、指数名称、收盘价
   - 支持按日期范围获取历史数据

4. **数据存储**
   - 股票行情存入 `stock_quotes` 表
   - 指数行情存入 `index_quotes` 表
   - 支持增量更新（相同股票+日期只保留一条记录）

5. **刷新功能**
   - 支持手动触发数据刷新
   - 刷新时更新最新交易日数据
   - **首次同步**：获取最近1年的历史数据
   - **增量同步**：从最新日期到当前日期的增量更新

6. **Coverage 表集成**
   - 自动从 `coverage` 表读取股票 ticker 和所属国家
   - 自动推断市场代码（SH/SZ/HK/US）
   - 自动清理 ticker 格式（如 "VST US" -> "VST"）

7. **定时任务**
   - 支持配置定时自动同步
   - 提供 Linux/Mac (cron) 和 Windows 脚本

### Capabilities

#### New Capabilities

- `stock-quotes-fetch`: 从 yfinance 获取股票行情数据
- `index-quotes-fetch`: 从 yfinance 获取指数行情数据
- `stock-quotes-refresh`: 手动刷新股票行情数据
- `index-quotes-refresh`: 手动刷新指数行情数据

#### Modified Capabilities

- `report-refresh`: 报告数据刷新时自动更新关联的股票/指数行情（待扩展）

### 权限模型

本 change 不涉及新增角色，使用现有 RBAC。

角色功能权限矩阵：

| 功能 | Admin | SA | Analyst |
|---|---|---|---|
| 刷新股票行情 | ✅ | ✅ | ✅ |
| 刷新指数行情 | ✅ | ✅ | ✅ |
| 查看行情数据 | ✅ | ✅ | ✅ |

角色数据表权限矩阵（RLS）：

| 表 | Admin | SA | Analyst |
|---|---|---|---|
| `stock_quotes` | R/W | R/W | R |
| `index_quotes` | R/W | R/W | R |

## 设计约束与规范

- Proposal 仅定义 WHAT，不展开 HOW；实现细节放入后续 design
- yfinance 作为外部数据源，需处理网络异常和 API 限流
- 数据存储遵循现有 `supabase/migrations` 规范
- Server actions 放在 `web/features/` 目录

## Impact

- Affected tables:
  - `public.stock_quotes`（已有）
  - `public.index_quotes`（已有）
- Affected implementation areas:
  - `web/features/stock-quotes/*`（新建）
  - `web/features/index-quotes/*`（新建）
  - Server actions for data fetch
