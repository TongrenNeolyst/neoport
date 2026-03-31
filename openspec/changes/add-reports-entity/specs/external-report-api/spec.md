## ADDED Requirements

### 需求:外部报告接收接口必须可用
系统必须提供 HTTP 接口接收外部系统推送的报告数据和附件文件，支持 multipart/form-data 格式。

#### 场景:成功接收报告
- **当** 外部系统携带有效 API Key，通过 multipart/form-data 提交报告基本数据字段和附件文件
- **那么** 系统将报告元信息写入 `reports` 表，附件写入 Storage 并将元信息写入 `report_attachments` 表，返回 HTTP 201 并附带报告 ID

#### 场景:API Key 无效
- **当** 请求未携带 `X-API-Key` Header 或 Key 值不匹配
- **那么** 系统返回 HTTP 401 Unauthorized

#### 场景:必填字段缺失
- **当** 请求中缺少必填字段（如 `title`）
- **那么** 系统返回 HTTP 400 Bad Request，响应体包含缺失字段列表

#### 场景:重复推送（幂等）
- **当** 外部系统携带已存在的 `external_id` 重复推送同一报告
- **那么** 系统返回 HTTP 200 OK，响应体包含已有报告 ID，不创建新记录

### 需求:报告基本数据字段定义
接口必须支持接收以下报告基本数据字段：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `external_id` | string | 是 | 外部系统报告唯一标识，最大 100 字符 |
| `title` | string | 是 | 报告标题，最大 500 字符 |
| `report_type` | string | 是 | 报告类型（如 sector/company），最大 100 字符 |
| `ticker` | string | 否 | 公司股票代码，最大 50 字符 |
| `rating` | string | 否 | 评级（如 Buy/Hold/Sell），最大 100 字符 |
| `target_price` | numeric | 否 | 目标价，大于 0 |
| `sector` | string | 否 | 相关行业，最大 200 字符 |
| `region` | string | 否 | 地区，最大 100 字符 |
| `report_language` | string | 否 | 报告语言，仅允许 `zh` 或 `en`，默认 `zh` |
| `investment_thesis` | string | 否 | 投资摘要/报告摘要，最大 5000 字符 |
| `analyst` | string | 否 | 分析师信息，格式为 `"名字<邮箱>"`，多个分析师以逗号分隔，如 `"张三<zhangsan@example.com>,李四<lisi@example.com>"`。名字保存到 `reports.analyst`，各邮箱保存到 `report_analyst` 关联表 |
| `contact_person` | string | 否 | 联系人信息，格式为 `"名字<邮箱>"`，如 `"王五<wangwu@example.com>"`。名字保存到 `reports.contact_person`，邮箱保存到 `report_contact` 关联表 |
| `published_at` | string (ISO 8601) | 是 | 报告发布时间 |

#### 场景:字段长度校验
- **当** 任意 string 字段超过其最大长度限制
- **那么** 系统返回 HTTP 400，响应说明具体字段超长

#### 场景:日期格式校验
- **当** `published_at` 字段不符合 ISO 8601 格式
- **那么** 系统返回 HTTP 400，响应说明日期格式错误

#### 场景:目标价正数校验
- **当** `target_price` 字段值小于等于 0
- **那么** 系统返回 HTTP 400，响应说明 target_price 必须大于 0

#### 场景:报告语言枚举校验
- **当** `report_language` 字段值不在 `zh` 或 `en` 范围内
- **那么** 系统返回 HTTP 400，响应说明 report_language 仅允许 `zh` 或 `en`

#### 场景:分析师数据解析与存储
- **当** 接口接收 `analyst` 字段，格式为 `"名字<邮箱>,名字<邮箱>"` 时
- **那么** 系统将第一个分析师的名字保存到 `reports.analyst`，将所有邮箱各作为一条记录写入 `report_analyst` 关联表（跳过空邮箱和无效邮箱格式）

#### 场景:联系人数据解析与存储
- **当** 接口成功接收 `contact_person` 字段，格式为 `"名字<邮箱>"` 时
- **那么** 系统将名字保存到 `reports.contact_person`，邮箱写入 `report_contact` 关联表

### 需求:附件上传限制
系统必须对附件文件的大小和数量进行限制。

#### 场景:单文件超限
- **当** 任一附件文件大小超过 50MB
- **那么** 系统返回 HTTP 413 Payload Too Large

#### 场景:附件数量超限
- **当** 单次请求中附件数量超过 20 个
- **那么** 系统返回 HTTP 413，说明附件数量超限

### 需求:接口端点路径
- **当** 外部系统调用接口时
- **那么** 接口路径为 `POST /api/external/reports`
