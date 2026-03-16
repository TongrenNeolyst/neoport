# Index Quotes Refresh - 指数行情刷新

## 概述

本 spec 描述获取指数行情数据并保存到数据库的功能。

## 功能描述

根据指数代码（index_code），从 yfinance 获取最新行情数据并保存到 `index_quotes` 表。

## 输入

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| index_code | string | 是 | 指数代码，如 "^SSEC"、"^HSI"、"^GSPC" |
| save | boolean | 否 | 是否保存到数据库，默认 true |

## 输出

返回操作结果：

```typescript
interface RefreshResult {
  success: boolean;
  index_code: string;
  trade_date: string;
  saved: boolean;
  message: string;
}
```

## 业务流程

1. **数据获取**
   - 调用 `index-quotes-fetch` 获取最新行情数据
   - 如果返回 `null`，返回失败

2. **数据存储**
   - 使用 Supabase upsert 写入 `index_quotes` 表
   - 唯一键冲突时更新现有记录

3. **返回结果**
   - 成功返回 `success: true`
   - 失败返回 `success: false` 并附带错误信息

## 数据库字段映射

| 输入字段 | 数据库字段 | 说明 |
|----------|-----------|------|
| index_code | index_code | 指数代码 |
| index_name | index_name | 指数名称 |
| trade_date | trade_date | 交易日 |
| close_price | close_price | 收盘价/点位 |

## 错误处理

- **获取数据失败**: 返回 `success: false`，message 包含错误详情
- **保存失败**: 返回 `success: false`，message 包含数据库错误
- **无效输入**: 抛出 ValidationError

## 验收标准

1. 成功获取并保存行情数据，返回 `success: true`
2. 数据正确写入 index_quotes 表
3. 相同指数+日期数据能够正确更新（upsert）
4. 获取失败时返回正确的错误信息

## 依赖

- `index-quotes-fetch` spec
- `public.index_quotes` 表
