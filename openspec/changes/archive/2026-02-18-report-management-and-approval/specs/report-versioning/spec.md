## ADDED Requirements

### Requirement: System SHALL append content versions on each save
The system SHALL append one `report_version` record for every successful content save.

#### Scenario: Save report content
- **WHEN** owner or Admin saves report content changes
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
