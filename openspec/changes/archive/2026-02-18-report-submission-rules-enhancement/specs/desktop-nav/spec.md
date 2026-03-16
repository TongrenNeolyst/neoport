## ADDED Requirements

### Requirement: Desktop SHALL show Add Report entry in Reports group
The system SHALL show `Add Report` entry under Reports group for Admin and Analyst users.

#### Scenario: Admin opens desktop
- **WHEN** Admin visits `/desktop`
- **THEN** system MUST show `Add Report` entry in Reports group

#### Scenario: Analyst opens desktop
- **WHEN** Analyst visits `/desktop`
- **THEN** system MUST show `Add Report` entry in Reports group

#### Scenario: SA opens desktop
- **WHEN** SA visits `/desktop`
- **THEN** system MUST NOT show `Add Report` entry

### Requirement: Desktop SHALL place Add Report as first item in Reports group
The system SHALL keep `Add Report` as the first entry in Reports group ordering.

#### Scenario: Render Reports group
- **WHEN** Desktop renders Reports group entries
- **THEN** `Add Report` MUST appear before `Reports` and `Report Review`

### Requirement: Desktop Add Report entry SHALL open dedicated create page in new tab
The system SHALL open `/reports/new` in a new tab when user clicks `Add Report` from Desktop.

#### Scenario: Open Add Report from Desktop
- **WHEN** Admin or Analyst clicks `Add Report` on Desktop
- **THEN** system MUST open `/reports/new` in a new tab
- **AND** Desktop tab MUST remain open
