## MODIFIED Requirements

### Requirement: Admin can manage Word and Excel templates
The system SHALL allow Admin users to upload and manage template metadata for `word` and `excel` file types.

#### Scenario: Upload a new template version by drag-and-drop
- **WHEN** Admin drags a valid template file into upload area on Report Template page
- **THEN** system MUST create a new template version record

#### Scenario: Non-Admin tries to upload template by drag-and-drop
- **WHEN** SA or Analyst drags template file into upload area
- **THEN** system MUST reject the request

## ADDED Requirements

### Requirement: Report Template page SHALL support drag-and-drop with click-upload fallback
The system SHALL support drag-and-drop upload on Report Template page while preserving click-upload behavior.

#### Scenario: Drag-and-drop unavailable or not used
- **WHEN** Admin uploads via file picker instead of drag-and-drop
- **THEN** system MUST keep upload behavior and validation consistent with existing flow
