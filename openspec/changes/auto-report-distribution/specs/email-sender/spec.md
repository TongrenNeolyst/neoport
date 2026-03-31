# email-sender Specification

## Purpose
封装 nodemailer SMTP transport，提供带 PDF 附件的邮件发送能力，支持失败重试一次。

## Requirements

### Requirement: System SHALL load SMTP config from email_config table
The system SHALL query `email_config` (where `is_enabled = true`) to obtain SMTP host, port, user, pass, and from address before sending.

#### Scenario: Send with enabled config
- **WHEN** sending an email and an enabled SMTP config exists
- **THEN** system MUST use the enabled config values
- **AND** system MUST NOT fall back to hardcoded defaults

#### Scenario: No enabled config
- **WHEN** sending an email and no SMTP config is enabled
- **THEN** system MUST throw an error `'SMTP not configured or disabled'`
- **AND** system MUST NOT attempt to send

### Requirement: System SHALL send email with nodemailer SMTP transport
The system SHALL create a nodemailer SMTP transport with the loaded config and send an email.

#### Scenario: Successful send
- **WHEN** nodemailer transport is created with valid SMTP config
- **THEN** system MUST send email via SMTP
- **AND** system MUST return `ok(undefined)` on success

#### Scenario: SMTP connection error
- **WHEN** SMTP connection fails (timeout, auth failure, etc.)
- **THEN** system MUST return `err(error_message)`
- **AND** system MUST NOT throw unhandled exception

### Requirement: System SHALL retry sending once on failure
The system SHALL retry the send operation exactly once if the first attempt fails.

#### Scenario: First attempt fails, retry succeeds
- **WHEN** first send attempt fails
- **THEN** system MUST retry exactly one more time
- **AND** if retry succeeds, system MUST return `ok(undefined)`

#### Scenario: Both attempts fail
- **WHEN** first send attempt fails and retry also fails
- **THEN** system MUST return `err(first_error_message)`

### Requirement: System SHALL include report metadata in email subject and body
The system SHALL format the email subject and body using the report's title, date, and author.

#### Scenario: Email subject format
- **WHEN** sending an email for report R
- **THEN** the email subject MUST be: `[Report] {R.title} - {R.published_at}`

#### Scenario: Email body includes report info
- **WHEN** sending an email for report R
- **THEN** the email body MUST include at minimum: report title, published date, analyst name

### Requirement: System SHALL attach files from Supabase Storage as email attachments
The system SHALL download files from Supabase Storage (bucket `external-reports`) using the service-role client and attach them to the email as buffers.

#### Scenario: Attachment download
- **WHEN** a file path is provided for attachment
- **THEN** system MUST download the file content from Supabase Storage
- **AND** the downloaded buffer MUST be attached to the email with the original filename

#### Scenario: File not found in storage
- **WHEN** a file path is provided but the file does not exist in Storage
- **THEN** system MUST log a warning
- **AND** system MUST continue sending without that attachment
- **AND** system MUST NOT fail the entire email send
