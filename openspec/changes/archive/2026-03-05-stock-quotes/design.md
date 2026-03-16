## 设计概述

本设计文档描述股票和指数行情数据获取系统的技术实现方案。

## 技术栈

- **数据源**: yahoo-finance2 (JavaScript 库)
- **数据存储**: Supabase PostgreSQL
- **后端**: Next.js Server Actions
- **前端**: React 组件

## 数据库设计

### stock_quotes 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| code | text | 股票代码 |
| mkt_code | text | 市场代码 (SH/SZ/HK/US) |
| trade_date | date | 交易日 |
| close_price | numeric(18,4) | 收盘价 |
| volume | bigint | 成交量 |
| market_cap | numeric(18,2) | 市值（十亿） |
| shares_mn | numeric(18,2) | 流通股数（百万股） |
| year_high | numeric(18,4) | 一年最高价 |
| year_low | numeric(18,4) | 一年最低价 |
| created_at | timestamptz | 创建时间 |

唯一约束: `(code, mkt_code, trade_date)`

### index_quotes 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| index_code | text | 指数代码 |
| index_name | text | 指数名称 |
| trade_date | date | 交易日 |
| close_price | numeric(18,4) | 收盘价/点位 |
| created_at | timestamptz | 创建时间 |

唯一约束: `(index_code, trade_date)`

## yfinance 映射

### 股票 ticker 格式

| 市场 | 格式 | 示例 |
|------|------|------|
| A 股上海 | {code}.SS | 600519.SS |
| A 股深圳 | {code}.SZ | 000001.SZ |
| 港股 | {code}.HK | 00700.HK |
| 美股 | {code} | AAPL |

### 指数 ticker 格式

| 指数 | 代码 |
|------|------|
| 上证指数 | ^SSEC |
| 深证成指 | ^SZSE |
| 恒生指数 | ^HSI |
| 标普 500 | ^GSPC |
| 道琼斯 | ^DJI |
| 纳斯达克 | ^IXIC |

### yfinance 数据字段映射

**股票 (Stock)**:
- `Close` → close_price
- `Volume` → volume
- `Market Cap` → market_cap (需转换单位)
- `Shares Outstanding` → shares_mn (需转换单位)
- `52 Week High` → year_high
- `52 Week Low` → year_low

**指数 (Index)**:
- `Close` → close_price

## 系统架构

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User (UI)     │────▶│  Server Action  │────▶│   Supabase      │
│                 │     │  (Next.js)       │     │   PostgreSQL    │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │     yfinance     │
                        │   (External)     │
                        └──────────────────┘
```

## Ticker 处理逻辑

### 1. 从 Coverage 表提取 Ticker

Coverage 表中的 ticker 可能包含后缀，如 "VST US"、"700 HK"：
- 移除后缀（US/HK/SH/SZ）
- "VST US" → "VST"
- "700 HK" → "700" → "0700"（港股补零）

### 2. 市场代码推断

根据 `country_of_domicile` 和 ticker 推断：
- Hong Kong → HK
- China + 6位数字(6开头) → SH
- China + 6位数字(0/3开头) → SZ
- US → US
- 其他 → US

## 同步策略

### 首次同步
- 无历史数据时，获取最近1年的数据
- 起始日期 = 今天 - 365天
- 结束日期 = 今天

### 增量同步
- 已有数据时，获取增量数据
- 起始日期 = 最新日期 + 1天
- 结束日期 = 今天

### 批量处理
- 每次 API 调用间隔 300ms（避免限流）
- 使用 upsert 写入数据库（处理重复数据）

## API 设计

### Server Actions

```typescript
// 获取股票行情（不保存）
fetchStockQuoteAction(code: string, mkt_code: string): Promise<Result<StockQuote>>

// 批量获取股票行情
fetchStockQuotesAction(inputs: Array<{code: string, mkt_code: string}>): Promise<Result<StockQuote[]>>

// 刷新单只股票行情
refreshStockQuoteAction(code: string, mkt_code: string): Promise<Result<{success: boolean, message: string}>>

// 从 Coverage 表同步所有股票行情
syncStockQuotesFromCoverageAction(): Promise<Result<{
  total: number;
  success: number;
  failed: number;
  errors: string[];
}>>

// 获取指数行情（不保存）
fetchIndexQuoteAction(index_code: string): Promise<Result<IndexQuote>>

// 刷新指数行情
refreshIndexQuoteAction(index_code: string): Promise<Result<{success: boolean, message: string}>>
```

## 错误处理

- 网络超时: 不重试，直接返回 null
- API 限流: 间隔 300ms 后继续
- 数据不存在: 返回 null，不抛异常
- 无效 ticker: 返回 null
- 数据库错误: 返回错误信息

## 定时任务

### 支持平台
- Linux/Mac: cron + shell script
- Windows: Task Scheduler + batch script

### Cron 表达式示例
| 表达式 | 说明 |
|--------|------|
| `0 6 * * *` | 每天早上6点 |
| `0 6 * * 1-5` | 工作日早上6点 |
| `0 */4 * * *` | 每4小时 |

### 脚本文件
- `scripts/sync-stock-quotes.ts` - 同步主脚本
- `scripts/sync-stock-quotes-cron.sh` - Linux/Mac 脚本
- `scripts/sync-stock-quotes.bat` - Windows 脚本
- `scripts/sync-stock-quotes.config` - 配置文件

## 已实现文件

| 文件 | 说明 |
|------|------|
| `web/lib/yfinance-client.ts` | yfinance 封装 |
| `web/features/stock-quotes/repo/stock-quotes-repo.ts` | 股票行情数据库操作 |
| `web/features/stock-quotes/actions.ts` | 股票行情 Server Actions |
| `web/features/index-quotes/repo/index-quotes-repo.ts` | 指数行情数据库操作 |
| `web/features/index-quotes/actions.ts` | 指数行情 Server Actions |
