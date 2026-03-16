## MODIFIED Requirements

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
