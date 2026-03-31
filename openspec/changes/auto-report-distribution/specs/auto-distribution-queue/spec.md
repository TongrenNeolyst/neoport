# auto-distribution-queue Specification

## Purpose
报告接收后自动加入自动发布队列表，关联报告 ID，供定时任务消费。

## Requirements

### Requirement: System SHALL add report to distribution queue after successful creation
When the external report API successfully creates a report and uploads all attachments, the system SHALL insert a new record into `report_distribution_queue` with `status = 'waiting'` and `report_id` referencing the created report.

#### Scenario: New report added to queue
- **WHEN** POST /api/external/reports successfully creates a new report
- **THEN** system MUST call `add_to_distribution_queue(report_id)` to insert a queue record
- **AND** the queue record status MUST be `'waiting'`

#### Scenario: Duplicate report (idempotent) does not add to queue twice
- **WHEN** POST /api/external/reports receives an external_id that already exists
- **THEN** system MUST return 200 with existing report id
- **AND** system MUST NOT insert a duplicate queue record (enforced by `on conflict do nothing`)

### Requirement: System SHALL use 'waiting' as initial queue status
The system SHALL use `'waiting'` as the initial status value in the distribution queue, representing "等待发布".

#### Scenario: Queue record created with correct status
- **WHEN** a queue record is created via `add_to_distribution_queue()`
- **THEN** the status field MUST be set to `'waiting'`
- **AND** status MUST NOT be `'pending'`

### Requirement: System SHALL support queue statuses 'waiting', 'processing', 'published', 'failed'
The system SHALL enforce the following valid status values in `report_distribution_queue`:
- `waiting`: 等待发布 (initial state)
- `processing`: 处理中 (set by cron job during execution)
- `published`: 已发布 (all emails sent successfully)
- `failed`: 发送失败 (one or more emails failed)

#### Scenario: Valid status values
- **WHEN** a queue record is inserted or updated
- **THEN** the status value MUST be one of: `'waiting'`, `'processing'`, `'published'`, `'failed'`
- **AND** invalid status values MUST be rejected by the CHECK constraint
