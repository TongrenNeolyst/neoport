## ADDED Requirements

### Requirement: System SHALL initialize five report types in template source
The system SHALL initialize `company`, `sector`, `company_flash`, `sector_flash`, and `common` in template source.

#### Scenario: Database initialization
- **WHEN** initialization scripts run for this change
- **THEN** system MUST persist all five report types into template source records

#### Scenario: Re-run initialization
- **WHEN** initialization scripts run repeatedly
- **THEN** system MUST remain idempotent and MUST NOT create duplicated logical type entries

### Requirement: System SHALL allow placeholder template records at initialization
The system SHALL support initializing report types before actual template files are uploaded.

#### Scenario: Initialize placeholder templates
- **WHEN** system initializes template source records for report types
- **THEN** records MAY have empty file payload representation
- **AND** records MUST be marked non-active by default

#### Scenario: Submit with placeholder-only templates
- **WHEN** selected report type has only placeholder template records
- **THEN** submit-side validation MUST treat them as not valid for submission

### Requirement: Template report_type SHALL be the fact source for report type selector
The system SHALL use template `report_type` as the fact source for report type selector in report create flow.

#### Scenario: Query report type selector source
- **WHEN** report creation flow requests report-type options
- **THEN** system MUST resolve options from template source
