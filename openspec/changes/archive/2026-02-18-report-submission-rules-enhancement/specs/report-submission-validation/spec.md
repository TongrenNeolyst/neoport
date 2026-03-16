## ADDED Requirements

### Requirement: System SHALL validate report fields by report type matrix
The system SHALL validate required fields according to the report-type matrix before submit.

#### Scenario: Submit Company report
- **WHEN** user submits a `company` report
- **THEN** system MUST require `ticker`, `rating`, `target_price`, `report_language`, `report_title`, `analysts`, `contact_person`, `investment_thesis`, and `certificate`

#### Scenario: Submit Sector or Flash Sector report
- **WHEN** user submits a `sector` or `sector_flash` report
- **THEN** system MUST require `region`, `sector`, `report_language`, `report_title`, `analysts`, `contact_person`, `investment_thesis`, and `certificate`

#### Scenario: Submit Common report
- **WHEN** user submits a `common` report
- **THEN** system MUST require `region`, `report_language`, `report_title`, `analysts`, `contact_person`, `investment_thesis`, and `certificate`

### Requirement: System SHALL enforce dropdown-backed values from source tables
The system SHALL validate `report_type`, `region`, and `sector` values against source tables rather than trusting client input.

#### Scenario: Invalid report type value
- **WHEN** user submits a `report_type` not present in `template.report_type`
- **THEN** system MUST reject submit as invalid input

#### Scenario: Invalid region or sector value
- **WHEN** user submits `region` or `sector` value not present in effective source records
- **THEN** system MUST reject submit as invalid input

### Requirement: System SHALL enforce file gates before submit
The system SHALL apply report file required rules during submit.

#### Scenario: Missing report Word file
- **WHEN** user submits any report type without report Word file
- **THEN** system MUST reject submit

#### Scenario: Missing company model file
- **WHEN** user submits `company` report without model Excel file
- **THEN** system MUST reject submit

#### Scenario: Non-company report without model file
- **WHEN** user submits non-`company` report without model Excel file
- **THEN** system MUST allow submit if other checks pass

### Requirement: System SHALL enforce certificate confirmation and statement rendering
The system SHALL require `certificate` confirmation via checkbox and display the provided legal statement text.

#### Scenario: Certificate checkbox not selected
- **WHEN** user submits report without selecting certificate checkbox
- **THEN** system MUST reject submit
- **AND** system MUST return visible validation message

#### Scenario: Certificate statement rendering
- **WHEN** create or edit report page is rendered
- **THEN** system MUST display heading text `I and all the names listed as the authors of this uploaded notes, certify that'` adjacent to certificate checkbox
- **AND** system MUST display all six certificate clauses defined in proposal

### Requirement: System SHALL enforce template availability at submit time
The system SHALL ensure selected report type has at least one valid template before submit.

#### Scenario: No valid template for selected report type
- **WHEN** user submits report and selected `report_type` has no valid template record
- **THEN** system MUST reject submit

#### Scenario: Valid template exists for selected report type
- **WHEN** user submits report and selected `report_type` has valid template record
- **THEN** system MUST allow submit if all other checks pass
