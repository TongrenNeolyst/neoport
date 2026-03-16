# report-versioning Specification

## Purpose
TBD - created by archiving change report-management-and-approval. Update Purpose after archive.
## Requirements
### Requirement: System SHALL append content versions on each save
The system SHALL append one `report_version` record for every successful content save, including basic-info updates and file updates.

#### Scenario: Save report content
- **WHEN** owner or Admin saves report content changes
- **THEN** system MUST create a new `report_version` row

#### Scenario: Save report basic info changes
- **WHEN** owner or Admin saves report basic fields such as title, type, region/sector, or analyst assignments
- **THEN** system MUST create a new `report_version` row

#### Scenario: Save report file changes
- **WHEN** owner or Admin saves report with file upload or replacement
- **THEN** system MUST create a new `report_version` row

### Requirement: System SHALL use sequential version numbers per report
The system SHALL assign `version_no` as monotonically increasing integer per report.

#### Scenario: First version
- **WHEN** first save is performed for a report
- **THEN** system MUST create `version_no=1`

#### Scenario: Subsequent version
- **WHEN** another save is performed for the same report
- **THEN** system MUST create next `version_no` with uniqueness on `(report_id, version_no)`

### Requirement: System SHALL store readable snapshot fields
The system SHALL store readable snapshot fields in `snapshot_json` for version history display.

#### Scenario: Snapshot creation
- **WHEN** a new `report_version` is created
- **THEN** system MUST persist readable fields including owner name and analyst names

### Requirement: System SHALL expose report-scoped version history metadata
The system SHALL expose report-scoped version history with required metadata for audit display.

#### Scenario: Open report version history
- **WHEN** authorized user opens current report detail history
- **THEN** system MUST show version entries for current report only
- **AND** each entry MUST include `version_no`, modifier identity, and modified time

#### Scenario: Version history note display
- **WHEN** version-related note/reason exists for history context
- **THEN** system MUST display note/reason with the related history entry

