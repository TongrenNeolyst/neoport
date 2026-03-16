## ADDED Requirements

### Requirement: Company-type report submission SHALL depend on valid coverage relation
The system SHALL enforce coverage relation semantics for `company` and `company_flash` report submission.

#### Scenario: Submit company-type report without valid coverage relation
- **WHEN** user submits `company` or `company_flash` report and no valid coverage relation exists for required semantics
- **THEN** system MUST reject submit
- **AND** system MUST provide actionable message to complete coverage maintenance first

#### Scenario: Submit company-type report with valid coverage relation
- **WHEN** user submits `company` or `company_flash` report and valid coverage relation exists
- **THEN** system MUST allow submit if all other validations pass
