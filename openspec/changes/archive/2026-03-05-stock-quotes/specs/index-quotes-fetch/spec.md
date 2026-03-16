# Index Quotes Fetch - 指数行情数据获取

## 概述

本 spec 描述从 yfinance 获取指数行情数据的功能。

## 功能描述

根据指数代码（index_code），从 yfinance 获取实时/历史行情数据。

## 输入

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| index_code | string | 是 | 指数代码，如 "^SSEC"、"^HSI"、"^GSPC" |
| start_date | string | 否 | 开始日期 (YYYY-MM-DD)，默认 30 天前 |
| end_date | string | 否 | 结束日期 (YYYY-MM-DD)，默认今天 |

## 输出

返回 `IndexQuote` 对象：

```typescript
interface IndexQuote {
  index_code: string;     // 指数代码
  index_name: string;     // 指数名称
  trade_date: string;     // 交易日 (YYYY-MM-DD)
  close_price: number;    // 收盘价/点位
}
```

## 常用指数代码映射

| 指数名称 | index_code | yfinance ticker |
|----------|------------|-----------------|
| 上证指数 | SSEC | ^SSEC |
| 深证成指 | SZSE | ^SZSE |
| 恒生指数 | HSI | ^HSI |
| 标普 500 | GSPC | ^GSPC |
| 道琼斯 | DJI | ^DJI |
| 纳斯达克 | IXIC | ^IXIC |

## 数据字段映射

| yfinance 字段 | 输出字段 | 说明 |
|---------------|----------|------|
| - | index_code | 输入的指数代码 |
| info.shortName | index_name | 指数名称 |
| Close[-1] | close_price | 最后一天收盘价 |
| - | trade_date | 最后一天交易日 |

## 错误处理

- **无效指数代码**: 抛出 `ValidationError: Invalid index code`
- **指数不存在**: 返回 `null`
- **网络错误**: 重试 3 次后抛出 `NetworkError`
- **API 限流**: 退避 5s 后重试

## 验收标准

1. 输入有效的指数代码，返回正确的行情数据
2. 输入无效的指数代码，返回 `null`
3. 网络超时能够正确重试
4. 指数名称能够正确获取

## 依赖

- yfinance 库
