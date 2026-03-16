## ADDED Requirements

### Requirement: System SHALL use dedicated route for report creation
The system SHALL use a dedicated page route for report creation instead of modal workflow.

#### Scenario: Open create page from reports list
- **WHEN** user clicks Add button on `/reports`
- **THEN** system MUST navigate to `/reports/new`
- **AND** system MUST NOT open modal for full create flow

#### Scenario: Create entry consistency across entry points
- **WHEN** user opens create flow from Desktop Add Report or Reports Add button
- **THEN** both entries MUST resolve to the same create route and flow

### Requirement: System SHALL render create form fields in vertical layout
The system SHALL render report basic fields in vertical form layout.

#### Scenario: Open create page
- **WHEN** user opens `/reports/new`
- **THEN** system MUST render basic fields in single-column vertical sequence by default

#### Scenario: Investment thesis input
- **WHEN** user edits `investment_thesis`
- **THEN** system MUST provide multiline textarea input
- **AND** field semantics MUST represent report abstract

### Requirement: System SHALL source report type options from template table
The system SHALL build report-type dropdown options from `template.report_type` distinct values.

#### Scenario: Load report type options
- **WHEN** create page loads report type selector
- **THEN** system MUST load options from `template.report_type` distinct values

#### Scenario: Source table changes
- **WHEN** template report type entries are added or removed
- **THEN** create page options MUST reflect updated source values
