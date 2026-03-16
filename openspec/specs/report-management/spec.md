# report-management Specification

## Purpose
TBD - created by archiving change report-management-and-approval. Update Purpose after archive.
## Requirements
### Requirement: System SHALL create reports with owner model
The system SHALL create reports with immutable `owner_user_id` set to the current authenticated user at creation time.

#### Scenario: Analyst creates report
- **WHEN** Analyst creates a report
- **THEN** system MUST persist report with `owner_user_id` = current Analyst user id

#### Scenario: Admin creates report
- **WHEN** Admin creates a report
- **THEN** system MUST persist report with `owner_user_id` = current Admin user id

### Requirement: System SHALL enforce report visibility by role and owner
The system SHALL enforce report visibility by role and status scope.

#### Scenario: Analyst views reports list
- **WHEN** Analyst loads reports list
- **THEN** system MUST return only reports where `owner_user_id` equals current Analyst user id

#### Scenario: SA views reports list
- **WHEN** SA loads reports list
- **THEN** system MUST return only reports in `submitted|published|rejected`

#### Scenario: Admin views reports list
- **WHEN** Admin loads reports list
- **THEN** system MUST return reports in all statuses

### Requirement: System SHALL support default submitted filter for SA and Admin
The system SHALL apply default status filter `submitted` for SA and Admin reports views.

#### Scenario: SA enters reports page without explicit filter
- **WHEN** SA opens reports page first time in a session
- **THEN** system MUST default filter to `submitted`

#### Scenario: Admin enters reports page without explicit filter
- **WHEN** Admin opens reports page first time in a session
- **THEN** system MUST default filter to `submitted`

### Requirement: System SHALL support direct submit as two-step workflow
The system SHALL support direct submit UX while executing save and submit as two backend steps.

#### Scenario: Direct submit succeeds
- **WHEN** owner clicks direct submit and both save and submit steps succeed
- **THEN** system MUST persist latest content and transition report to `submitted`

#### Scenario: Direct submit second step fails
- **WHEN** owner clicks direct submit and save succeeds but submit fails
- **THEN** system MUST keep report in `draft`
- **AND** system MUST return message `已保存为 Draft，提交失败`

### Requirement: System SHALL allow submitted editing by owner
The system SHALL allow owner to edit report content when status is `submitted`.

#### Scenario: Owner edits submitted report
- **WHEN** owner saves changes on a submitted report
- **THEN** system MUST persist new content
- **AND** report status MUST remain `submitted`

### Requirement: System SHALL expose publish snapshot fields for published reports
The system SHALL provide `published_by` and `published_at` for published reports to support downstream published-report querying.

#### Scenario: Query published reports
- **WHEN** authorized user queries reports with status `published`
- **THEN** system MUST return `published_by` and `published_at` fields for each published report

#### Scenario: Query non-published reports
- **WHEN** authorized user queries reports with status in `draft|submitted|rejected`
- **THEN** system MAY return null values for `published_by` and `published_at`

### Requirement: System SHALL support drag-and-drop upload on Reports page
The system SHALL support drag-and-drop file upload on Reports create/edit page with click-upload fallback.

#### Scenario: Owner drags report file
- **WHEN** owner drags a valid report/model file into Reports upload area
- **THEN** system MUST accept the file through the same validation and upload pipeline as click upload

#### Scenario: User does not use drag-and-drop
- **WHEN** user uploads from file picker on Reports page
- **THEN** system MUST keep existing upload behavior unchanged

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

