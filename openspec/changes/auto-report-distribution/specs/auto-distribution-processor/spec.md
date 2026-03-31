# auto-distribution-processor Specification

## Purpose
定时任务每 5 分钟执行一次，从等待发布队列中取出记录，发送邮件给分析师、联系人、Wind 订阅者、同花顺订阅者。

## Requirements

### Requirement: System SHALL run every 5 minutes and process 'waiting' queue entries
The system SHALL execute via Windows Task Scheduler (or equivalent cron) every 5 minutes, selecting all queue entries with `status = 'waiting'` and processing them in order of `created_at`.

#### Scenario: Cron job picks up waiting entries
- **WHEN** the cron job runs
- **THEN** system MUST query `report_distribution_queue` for records WHERE `status = 'waiting'`
- **AND** system MUST process records in ascending order of `created_at`

#### Scenario: No waiting entries
- **WHEN** the cron job runs and no `waiting` entries exist
- **THEN** system MUST exit gracefully without error

### Requirement: System SHALL acquire row lock before processing to prevent concurrent execution
The system SHALL use `FOR UPDATE SKIP LOCKED` when selecting `waiting` entries to prevent the same entry from being processed by overlapping cron executions.

#### Scenario: Concurrent execution does not double-process
- **WHEN** cron job A starts processing a queue entry
- **AND** cron job B starts at the same time
- **THEN** job B MUST skip the entry locked by job A
- **AND** each entry MUST be processed by exactly one job instance

### Requirement: System SHALL send email to all analysts and contacts of the report
The system SHALL send one email per recipient (analyst + contact) for each report, using the email sender service.

#### Scenario: Send to analysts
- **WHEN** processing a queue entry for report R
- **THEN** system MUST fetch all `analyst_email` from `report_analyst` WHERE `report_id = R.id`
- **AND** system MUST send one email to each analyst email address

#### Scenario: Send to contacts
- **WHEN** processing a queue entry for report R
- **THEN** system MUST fetch all `contact_email` from `report_contact` WHERE `report_id = R.id`
- **AND** system MUST send one email to each contact email address

### Requirement: System SHALL send email to Wind, Tonghuashun, and third-party subscribers
The system SHALL send one email per active subscription of type `wind`, `tonghuashun`, and `normal` from `email_subscription`.

#### Scenario: Third-party (normal) subscriber receives email
- **WHEN** processing a queue entry
- **THEN** system MUST fetch all `email` from `email_subscription` WHERE `subscription_type = 'normal'` AND `is_active = true`
- **AND** system MUST send one email to each third-party subscriber

#### Scenario: Wind subscriber receives email
- **WHEN** processing a queue entry
- **THEN** system MUST fetch all `email` from `email_subscription` WHERE `subscription_type = 'wind'` AND `is_active = true`
- **AND** system MUST send one email to each Wind subscriber

#### Scenario: Tonghuashun subscriber receives email
- **WHEN** processing a queue entry
- **THEN** system MUST fetch all `email` from `email_subscription` WHERE `subscription_type = 'tonghuashun'` AND `is_active = true`
- **AND** system MUST send one email to each Tonghuashun subscriber

### Requirement: System SHALL attach all report PDF files to each email
The system SHALL download all attachments for the report from Supabase Storage and attach them to every outgoing email.

#### Scenario: Email contains all attachments
- **WHEN** sending an email for report R
- **THEN** system MUST fetch all `file_path` from `report_attachments` WHERE `report_id = R.id`
- **AND** system MUST attach each file to the email with its `original_name`

### Requirement: System SHALL mark queue entry as 'published' when all emails succeed
The system SHALL update `report_distribution_queue.status` to `'published'` and set `sent_at` to current time when all email sends complete successfully.

#### Scenario: All sends succeed
- **WHEN** all emails for a queue entry are sent successfully
- **THEN** system MUST update queue status to `'published'`
- **AND** system MUST set `sent_at` to NOW()

### Requirement: System SHALL mark queue entry as 'failed' when any email fails
The system SHALL update `report_distribution_queue.status` to `'failed'` and record the first error message when any email fails to send.

#### Scenario: Any send fails
- **WHEN** one or more emails fail to send
- **THEN** system MUST update queue status to `'failed'`
- **AND** system MUST set `error_message` to the first error encountered
- **AND** successful sends MUST still be recorded in history
