# email-config Specification

## Purpose
恢复 SMTP 配置页面（`/email-config`），Admin 可配置邮件发送服务器参数（host/port/user/pass/from/is_enabled）。

## Requirements

### Requirement: System SHALL load current SMTP configuration on page load
The system SHALL fetch the current email config via `getEmailConfigAction` when the page mounts and populate form fields.

#### Scenario: Config exists on load
- **WHEN** /email-config page loads and a config record exists
- **THEN** form fields MUST be pre-populated with existing values
- **AND** password field MUST be empty (masked)

#### Scenario: No config exists on load
- **WHEN** /email-config page loads and no config record exists
- **THEN** form fields MUST be empty
- **AND** is_enabled checkbox MUST be unchecked

### Requirement: System SHALL save SMTP configuration on submit
The system SHALL submit form data via `updateEmailConfigAction`, preserving existing password if password field is left empty.

#### Scenario: Admin saves with all fields filled
- **WHEN** Admin fills all fields including password and submits
- **THEN** system MUST call `updateEmailConfigAction` with new password

#### Scenario: Admin saves without changing password
- **WHEN** Admin submits with empty password field
- **THEN** system MUST call `updateEmailConfigAction` with `smtp_pass: "placeholder"` (indicating no change)

### Requirement: System SHALL show success message after save
The system SHALL display a success banner when `updateEmailConfigAction` returns success.

#### Scenario: Save succeeds
- **WHEN** `updateEmailConfigAction` returns ok
- **THEN** system MUST display "Configuration saved successfully"

### Requirement: System SHALL show error message on save failure
The system SHALL display an error banner when `updateEmailConfigAction` returns error.

#### Scenario: Save fails
- **WHEN** `updateEmailConfigAction` returns error
- **THEN** system MUST display the error message
- **AND** form state MUST NOT be cleared

### Requirement: System SHALL restrict email config to Admin role only
Non-admin users MUST be redirected to /403 when accessing /email-config.

#### Scenario: Non-admin user accesses email config page
- **WHEN** a user with role SA or Analyst navigates to /email-config
- **THEN** system MUST redirect to /403
