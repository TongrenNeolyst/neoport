## ADDED Requirements

### Requirement: System SHALL enforce owner-based permissions for report operations
The system SHALL enforce owner-based permissions for report read and write actions for Analyst users.

#### Scenario: Analyst accesses own report
- **WHEN** Analyst accesses a report where `owner_user_id` equals current user id
- **THEN** system MUST allow read access

#### Scenario: Analyst accesses others report
- **WHEN** Analyst accesses a report where `owner_user_id` differs from current user id
- **THEN** system MUST deny read and write access

### Requirement: System SHALL scope SA report visibility to non-draft statuses
The system SHALL limit SA visibility to reports in `submitted|published|rejected`.

#### Scenario: SA reads submitted report
- **WHEN** SA requests a submitted report
- **THEN** system MUST allow read access

#### Scenario: SA reads draft report
- **WHEN** SA requests a draft report
- **THEN** system MUST deny access

### Requirement: System SHALL restrict report review actions to SA and Admin
The system SHALL allow only SA and Admin to execute report review actions.

#### Scenario: SA approves report
- **WHEN** SA executes approve action on submitted report
- **THEN** system MUST allow action

#### Scenario: Analyst attempts review action
- **WHEN** Analyst executes approve/reject/reopen action
- **THEN** system MUST deny action
