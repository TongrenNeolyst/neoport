# distribution-history Specification

## Purpose
记录每次邮件发送的明细，供追踪、排查和统计。

## Requirements

### Requirement: System SHALL record every email send attempt in report_distribution_history
The system SHALL insert one record into `report_distribution_history` for each email send attempt, regardless of success or failure.

#### Scenario: Record successful send
- **WHEN** an email is successfully sent to `recipient@example.com`
- **THEN** system MUST insert a history record with `recipient_email = 'recipient@example.com'`, `status = 'sent'`, and `sent_at = NOW()`

#### Scenario: Record failed send
- **WHEN** an email send fails for `recipient@example.com`
- **THEN** system MUST insert a history record with `recipient_email = 'recipient@example.com'`, `status = 'failed'`, and `error_message`

### Requirement: System SHALL link history records to the correct report via report_id
The system SHALL set `report_distribution_history.report_id` to the UUID of the report being distributed.

#### Scenario: History linked to report
- **WHEN** a history record is created
- **THEN** `report_id` MUST match the UUID of the report in the queue entry being processed

### Requirement: System SHALL record sent_at timestamp on successful sends
The system SHALL set `sent_at` to the current timestamp when status is `'sent'`.

#### Scenario: Sent timestamp recorded
- **WHEN** an email is successfully sent
- **THEN** `sent_at` MUST be set to the timestamp of successful delivery
- **AND** `error_message` MUST be null

### Requirement: System SHALL record error_message on failed sends
The system SHALL populate `error_message` with the nodemailer error text when status is `'failed'`.

#### Scenario: Error message recorded
- **WHEN** an email send fails
- **THEN** `error_message` MUST contain the failure reason
- **AND** `sent_at` MAY be null
