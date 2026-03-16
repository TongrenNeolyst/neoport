## ADDED Requirements

### Requirement: Admin can manage coverage records
The system SHALL allow Admin users to create, view, update, and delete coverage records, and allow Analyst users to create coverage records.

#### Scenario: Admin creates a coverage
- **WHEN** Admin submits a valid coverage form
- **THEN** system MUST create the coverage record successfully

#### Scenario: Analyst creates a coverage
- **WHEN** Analyst submits a valid coverage form
- **THEN** system MUST create the coverage record successfully

#### Scenario: SA tries to write coverage
- **WHEN** SA submits create/update/delete request for coverage
- **THEN** system MUST reject the request

#### Scenario: Analyst tries to update or delete coverage
- **WHEN** Analyst submits update/delete request for coverage
- **THEN** system MUST reject the request

### Requirement: Coverage form enforces required fields
The system SHALL enforce required fields for coverage create and update operations.

#### Scenario: Missing required field
- **WHEN** Admin or Analyst submits coverage form without `ticker`, `country_of_domicile`, `english_full_name`, `sector_id`, `isin`, or at least one analyst
- **THEN** system MUST reject the request with validation errors

#### Scenario: All required fields provided
- **WHEN** Admin or Analyst submits coverage form with all required fields and valid values
- **THEN** system MUST accept and persist the data

### Requirement: Coverage supports analyst ordering up to four entries
The system SHALL support 1 to 4 ordered analysts per coverage through `coverage_analyst`.

#### Scenario: Assign ordered analysts
- **WHEN** Admin or Analyst assigns analysts with order values within 1..4 during coverage creation
- **THEN** system MUST persist ordered analyst relations for the coverage

#### Scenario: Exceed analyst limit
- **WHEN** Admin or Analyst attempts to assign more than four analysts to one coverage
- **THEN** system MUST reject the write operation

### Requirement: Coverage list supports search by ticker, name, and sector
The system SHALL provide searchable coverage listing for Admin and Analyst users.

#### Scenario: Search by ticker
- **WHEN** Admin or Analyst searches with a ticker keyword
- **THEN** system MUST return coverage records whose ticker matches the keyword

#### Scenario: Search by sector
- **WHEN** Admin or Analyst applies a sector filter
- **THEN** system MUST return only coverage records under the selected sector
