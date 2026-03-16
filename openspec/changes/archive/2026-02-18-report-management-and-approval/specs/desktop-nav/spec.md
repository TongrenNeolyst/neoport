## ADDED Requirements

### Requirement: Desktop SHALL show Reports card for authenticated users
The system SHALL display Reports card on Desktop for Admin, SA, and Analyst.

#### Scenario: Analyst opens desktop
- **WHEN** Analyst visits `/desktop`
- **THEN** system MUST show Reports card

#### Scenario: SA opens desktop
- **WHEN** SA visits `/desktop`
- **THEN** system MUST show Reports card

### Requirement: Desktop SHALL show Report Review card for SA and Admin only
The system SHALL display Report Review card only for SA and Admin.

#### Scenario: SA opens desktop
- **WHEN** SA visits `/desktop`
- **THEN** system MUST show Report Review card

#### Scenario: Analyst opens desktop
- **WHEN** Analyst visits `/desktop`
- **THEN** system MUST NOT show Report Review card

### Requirement: Reports and Report Review cards SHALL open in new tab
The system SHALL open Reports and Report Review pages in a new tab from Desktop.

#### Scenario: Open Reports
- **WHEN** user clicks Reports card on Desktop
- **THEN** system MUST open `/reports` in a new tab

#### Scenario: Open Report Review
- **WHEN** SA or Admin clicks Report Review card on Desktop
- **THEN** system MUST open `/report-review` in a new tab
