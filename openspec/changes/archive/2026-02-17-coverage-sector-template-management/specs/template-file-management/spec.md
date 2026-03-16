## ADDED Requirements

### Requirement: Admin can manage Word and Excel templates
The system SHALL allow Admin users to upload and manage template metadata for `word` and `excel` file types.

#### Scenario: Upload a new template version
- **WHEN** Admin uploads a valid template file for a report type and file type
- **THEN** system MUST create a new template version record

#### Scenario: Non-Admin tries to upload template
- **WHEN** SA or Analyst submits template upload
- **THEN** system MUST reject the request

### Requirement: Template versioning must be retained
The system SHALL retain all historical template versions per `report_type` and `file_type`.

#### Scenario: Multiple versions exist
- **WHEN** Admin uploads templates repeatedly for the same `report_type` and `file_type`
- **THEN** system MUST keep each version as a distinct historical record

### Requirement: Only one active template is allowed per report_type and file_type
The system SHALL allow at most one active template version in the same template group.

#### Scenario: Activate one version
- **WHEN** Admin marks a specific version as active
- **THEN** system MUST ensure that version is active for that group

#### Scenario: Switch active version
- **WHEN** Admin activates a different version in the same group
- **THEN** system MUST deactivate the previous active version and keep only one active version
