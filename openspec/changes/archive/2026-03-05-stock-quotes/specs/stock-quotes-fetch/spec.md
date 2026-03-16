# Stock Quotes Fetch - 股票行情数据获取

## 概述

本 spec 描述从 yfinance 获取股票行情数据的功能。

## 功能描述

根据股票代码（code）和市场代码（mkt_code），从 yfinance 获取实时/历史行情数据。

## 输入

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 股票代码，如 "600519"、"00700"、"AAPL" |
| mkt_code | string | 是 | 市场代码：SH/SZ/HK/US |
| start_date | string | 否 | 开始日期 (YYYY-MM-DD)，默认 30 天前 |
| end_date | string | 否 | 结束日期 (YYYY-MM-DD)，默认今天 |

## 输出

返回 `StockQuote` 对象：

```typescript
interface StockQuote {
  code: string;           // 股票代码
  mkt_code: string;       // 市场代码
  trade_date: string;     // 交易日 (YYYY-MM-DD)
  close_price: number;    // 收盘价
  volume: number;         // 成交量
  market_cap: number;     // 市值（十亿）
  shares_mn: number;      // 流通股数（百万）
  year_high: number;      // 一年最高价
  year_low: number;       // 一年最低价
}
```

## ticker 映射规则

| 市场 | mkt_code | yfinance ticker 格式 | 示例 |
|------|----------|---------------------|------|
| A股上海 | SH | {code}.SS | 600519.SS |
| A股深圳 | SZ | {code}.SZ | 000001.SZ |
| 港股 | HK | {code}.HK | 00700.HK |
| 美股 | US | {code} | AAPL |

## 数据字段映射

| yfinance 字段 | 输出字段 | 说明 |
|---------------|----------|------|
| Close[-1] | close_price | 最后一天收盘价 |
| Volume[-1] | volume | 最后一天成交量 |
| info.marketCap | market_cap | 市值转换为十亿 |
| info.sharesOutstanding | shares_mn | 流通股数转换为百万 |
| info.fiftyTwoWeekHigh | year_high | 52周最高价 |
| info.fiftyTwoWeekLow | year_low | 52周最低价 |
| - | trade_date | 最后一天交易日 |

## 错误处理

- **无效市场代码**: 抛出 `ValidationError: Invalid market code`
- **股票不存在**: 返回 `null`
- **网络错误**: 重试 3 次后抛出 `NetworkError`
- **API 限流**: 退避 5s 后重试

## 验收标准

1. 输入有效的股票代码和市场代码，返回正确的行情数据
2. 输入无效的股票代码，返回 `null`
3. 输入无效的市场代码，抛出 ValidationError
4. 网络超时能够正确重试
5. 市值单位正确转换为十亿
6. 流通股数单位正确转换为百万

## 依赖

- yfinance 库
