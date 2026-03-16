# report-review Specification

## Purpose
TBD - created by archiving change report-management-and-approval. Update Purpose after archive.
## Requirements
### Requirement: System SHALL allow SA and Admin to review submitted reports
The system SHALL allow SA and Admin to access review workspace and process submitted reports.

#### Scenario: SA opens review workspace
- **WHEN** SA accesses report review page
- **THEN** system MUST allow access
- **AND** system MUST list submitted reports

#### Scenario: Analyst opens review workspace
- **WHEN** Analyst accesses report review page
- **THEN** system MUST deny access

### Requirement: System SHALL support approve, reject, and reopen actions
The system SHALL allow SA and Admin to approve, reject, and reopen reports according to state machine, and SHALL require Note for reject action.

#### Scenario: Approve submitted report
- **WHEN** SA or Admin approves a report in `submitted`
- **THEN** system MUST transition status to `published`

#### Scenario: Reject submitted report with note
- **WHEN** SA or Admin rejects a report in `submitted` with Note
- **THEN** system MUST transition status to `rejected`

#### Scenario: Reject submitted report without note
- **WHEN** SA or Admin rejects a report in `submitted` without Note
- **THEN** system MUST reject the action with validation error

#### Scenario: Reopen rejected report
- **WHEN** SA or Admin reopens a report in `rejected`
- **THEN** system MUST transition status to `draft`

### Requirement: System SHALL persist publish snapshot on approval
The system SHALL persist publish snapshot fields on report publish action for downstream published-report queries.

#### Scenario: Approval writes publish snapshot
- **WHEN** SA or Admin approves a report in `submitted`
- **THEN** system MUST set `report.published_by` to current action user id
- **AND** system MUST set `report.published_at` to current action time

#### Scenario: Non-publish actions do not overwrite publish snapshot
- **WHEN** report transitions by non-publish actions
- **THEN** system MUST NOT update `report.published_by` and `report.published_at`

### Requirement: System SHALL provide file download only in review detail
The system SHALL provide report and model file download in review detail without online word preview.

#### Scenario: Review detail with files
- **WHEN** SA or Admin opens review detail for a report with files
- **THEN** system MUST provide download actions for available files

#### Scenario: Review detail without files
- **WHEN** SA or Admin opens review detail for a report without files
- **THEN** system MUST show no-file state and MUST NOT render preview component

