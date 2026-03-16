# report-status-history Specification

## Purpose
TBD - created by archiving change report-management-and-approval. Update Purpose after archive.
## Requirements
### Requirement: System SHALL record report status history in append-only log
The system SHALL record every valid report status transition in `report_status_log` as append-only events.

#### Scenario: Submit action logged
- **WHEN** report transitions from `draft` to `submitted`
- **THEN** system MUST append one status log entry with `from_status=draft` and `to_status=submitted`

#### Scenario: Approval action logged
- **WHEN** report transitions from `submitted` to `published` or `rejected`
- **THEN** system MUST append one status log entry with corresponding statuses

### Requirement: System SHALL store action version and reason in status log
The system SHALL store `version_no` for every status action and require reason for rejection.

#### Scenario: Reject with reason
- **WHEN** SA or Admin rejects a submitted report
- **THEN** system MUST require non-empty reason
- **AND** system MUST append log with current `version_no`

#### Scenario: Reopen to draft
- **WHEN** SA or Admin transitions report from `rejected` to `draft`
- **THEN** system MUST append log with current `version_no`
- **AND** previous rejection reason in history MUST remain unchanged

### Requirement: System SHALL expose per-report status history
The system SHALL provide status history view scoped to current report.

#### Scenario: Open report status history
- **WHEN** authorized user opens a report detail or review detail page
- **THEN** system MUST show status history entries for that report only

