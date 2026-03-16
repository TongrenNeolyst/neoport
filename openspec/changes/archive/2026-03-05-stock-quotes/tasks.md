# Tasks - 实现任务清单

## 实现检查清单

### 1. 环境配置

- [x] 安装 yahoo-finance2 依赖 (JavaScript 库)
  - 已添加到 `web/package.json`

### 2. 数据获取层

- [x] 创建 yfinance 封装工具类 `web/lib/yfinance-client.ts`
  - [x] `getStockTicker(code, mkt_code)` - 转换股票代码为 yahoo finance ticker
  - [x] `getIndexTicker(indexCode)` - 转换指数代码为 yahoo finance ticker
  - [x] `fetchStockQuote(code, mkt_code)` - 获取单日股票行情数据
  - [x] `fetchStockHistory(code, mkt_code, startDate, endDate)` - 获取历史股票行情
  - [x] `fetchIndexQuote(indexCode)` - 获取指数行情数据
  - [x] `fetchStockQuotes()` / `fetchIndexQuotes()` - 批量获取功能
  - [x] `inferMarketCode(ticker, country)` - 根据国家推断市场代码
  - [x] `extractCleanTicker(ticker, mkt_code)` - 清理 ticker 格式

### 3. 数据库层

- [x] 创建数据库操作 `web/features/stock-quotes/repo/stock-quotes-repo.ts`
  - [x] `upsertStockQuote(quote)` - 插入/更新单条股票行情
  - [x] `upsertStockQuotes(quotes[])` - 批量插入/更新股票行情
  - [x] `getStockQuote(code, mkt_code, trade_date)` - 查询股票行情
  - [x] `getLatestStockQuote(code, mkt_code)` - 获取最新行情
  - [x] `getLatestStockQuoteDate(code, mkt_code)` - 获取最新行情日期
  - [x] `listStockQuotes()` - 列表查询

- [x] 创建数据库操作 `web/features/index-quotes/repo/index-quotes-repo.ts`
  - [x] `upsertIndexQuote(quote)` - 插入/更新指数行情
  - [x] `getIndexQuote(index_code, trade_date)` - 查询指数行情
  - [x] `getLatestIndexQuote(index_code)` - 获取最新行情
  - [x] `listIndexQuotes()` - 列表查询

- [x] 更新 `web/features/coverage/repo/coverage-repo.ts`
  - [x] `listActiveCoverages()` - 获取所有活跃的 coverage

### 4. Server Actions

- [x] 创建股票行情 Server Actions `web/features/stock-quotes/actions.ts`
  - [x] `fetchStockQuoteAction(code, mkt_code)` - 获取单只股票行情
  - [x] `fetchStockQuotesAction(codes[])` - 批量获取股票行情
  - [x] `refreshStockQuoteAction(code, mkt_code)` - 刷新单只股票行情
  - [x] `getLatestStockQuoteAction()` - 获取数据库中的最新行情
  - [x] `listStockQuotesAction()` - 列表查询
  - [x] `syncStockQuotesFromCoverageAction()` - 从 coverage 表同步所有股票行情

- [x] 创建指数行情 Server Actions `web/features/index-quotes/actions.ts`
  - [x] `fetchIndexQuoteAction(index_code)` - 获取指数行情
  - [x] `fetchIndexQuotesAction(index_codes[])` - 批量获取指数行情
  - [x] `refreshIndexQuoteAction(index_code)` - 刷新指数行情
  - [x] `getLatestIndexQuoteAction()` - 获取数据库中的最新行情
  - [x] `listIndexQuotesAction()` - 列表查询

### 5. 定时任务脚本

- [x] `scripts/sync-stock-quotes.ts` - 同步脚本
- [x] `scripts/sync-stock-quotes-cron.sh` - Linux/Mac cron 脚本
- [x] `scripts/sync-stock-quotes.bat` - Windows 批处理脚本
- [x] `scripts/sync-stock-quotes.config` - 配置文件
- [x] `scripts/SCHEDULE_SETUP.md` - 设置文档

### 6. 同步逻辑

- [x] 首次同步：获取最近1年的历史数据
- [x] 增量同步：从最新日期到当前日期的增量更新
- [x] 自动从 coverage 表读取股票 ticker
- [x] 自动推断市场代码（SH/SZ/HK/US）
- [x] 自动清理 ticker 格式（如 "VST US" -> "VST"）

### 7. 前端集成（可选）

- [ ] 创建股票行情展示组件
- [ ] 创建指数行情展示组件
- [ ] 创建刷新按钮组件

### 8. 测试

- [ ] 单元测试
  - [ ] 测试 ticker 转换函数
  - [ ] 测试数据映射函数

- [ ] 集成测试
  - [ ] 测试 Server Action 获取股票行情
  - [ ] 测试 Server Action 获取指数行情
  - [ ] 测试数据库 upsert 功能

## 已创建的文件

1. `web/lib/yfinance-client.ts` - yahoo-finance2 封装
2. `web/features/stock-quotes/repo/stock-quotes-repo.ts` - 股票行情数据库操作
3. `web/features/stock-quotes/actions.ts` - 股票行情 Server Actions
4. `web/features/stock-quotes/index.ts` - 导出入口
5. `web/features/index-quotes/repo/index-quotes-repo.ts` - 指数行情数据库操作
6. `web/features/index-quotes/actions.ts` - 指数行情 Server Actions
7. `web/features/index-quotes/index.ts` - 导出入口
8. `web/scripts/sync-stock-quotes.ts` - 同步脚本
9. `web/scripts/sync-stock-quotes-cron.sh` - Linux/Mac cron 脚本
10. `web/scripts/sync-stock-quotes.bat` - Windows 批处理脚本
11. `web/scripts/sync-stock-quotes.config` - 配置文件
12. `web/scripts/SCHEDULE_SETUP.md` - 定时任务设置文档

## 修改的文件

1. `web/package.json` - 添加 yahoo-finance2 依赖
2. `web/features/coverage/repo/coverage-repo.ts` - 添加 listActiveCoverages

## 同步逻辑说明

### 首次同步
当 stock_quotes 表中没有该股票数据时：
- 从当前日期往前1年作为起始日期
- 获取完整1年的历史数据
- 批量写入数据库

### 增量同步
当 stock_quotes 表中已有该股票数据时：
- 查询该股票的最新日期
- 从最新日期+1天开始获取数据
- 直到当前日期
- 批量写入数据库（upsert）

### Ticker 处理
- 从 coverage.ticker 提取（如 "VST US" -> "VST"）
- 根据 country_of_domicile 推断市场代码：
  - Hong Kong -> HK
  - China + 6位数(6开头) -> SH
  - China + 6位数(0/3开头) -> SZ
  - US -> US
- 港股自动补零（如 "700" -> "0700"）
