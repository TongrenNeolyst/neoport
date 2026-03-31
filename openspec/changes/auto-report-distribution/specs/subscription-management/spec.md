# subscription-management Specification

## Purpose
恢复订阅管理页面（`/subscriptions`），Admin 可查看、添加、删除邮件订阅者，支持普通/Wind/同花顺三种订阅类型。

## Requirements

### Requirement: System SHALL display all email subscriptions in a table
The system SHALL render a table listing all email subscriptions with columns: Email, Subscription Type, Subscribed Date, Status, Action.

#### Scenario: Page loads with subscriptions
- **WHEN** Admin navigates to /subscriptions
- **THEN** system MUST display all subscriptions in a table
- **AND** each row MUST show: email address, subscription type label, creation date, active/inactive status badge

#### Scenario: Page loads with no subscriptions
- **WHEN** Admin navigates to /subscriptions and no subscriptions exist
- **THEN** system MUST display "No subscriptions yet"

### Requirement: System SHALL allow Admin to add new subscriptions
The system SHALL provide a form with email input and subscription type select, and submit via `addSubscriptionAction`.

#### Scenario: Admin adds subscription successfully
- **WHEN** Admin enters a valid email and selects a type, then clicks Add
- **THEN** system MUST call `addSubscriptionAction`
- **AND** MUST show success message
- **AND** MUST refresh the subscription list

#### Scenario: Admin adds duplicate email
- **WHEN** Admin enters an email that already exists in subscriptions
- **THEN** system MUST show error message from server
- **AND** MUST NOT create duplicate entry

### Requirement: System SHALL allow Admin to delete subscriptions
The system SHALL provide a Delete button for each row, confirmed by browser confirm dialog, and submit via `deleteSubscriptionAction`.

#### Scenario: Admin deletes subscription
- **WHEN** Admin clicks Delete and confirms the dialog
- **THEN** system MUST call `deleteSubscriptionAction`
- **AND** MUST remove the row from the table

### Requirement: System SHALL restrict subscription management to Admin role only
Non-admin users MUST be redirected to /403 when accessing /subscriptions.

#### Scenario: Non-admin user accesses subscriptions page
- **WHEN** a user with role SA or Analyst navigates to /subscriptions
- **THEN** system MUST redirect to /403

### Requirement: System SHALL display subscription type as human-readable label
The system SHALL map `normal` → "普通订阅", `wind` → "Wind", `tonghuashun` → "同花顺".

#### Scenario: Subscription type display
- **WHEN** a subscription with type `wind` is rendered
- **THEN** the type column MUST display "Wind"
