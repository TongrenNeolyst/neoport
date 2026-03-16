# sector-management Specification

## Purpose
TBD - created by archiving change coverage-sector-template-management. Update Purpose after archive.
## Requirements
### Requirement: Admin can manage two-level sector taxonomy
The system SHALL allow Admin users to create, view, update, and delete sectors within a strict two-level hierarchy.

#### Scenario: Create level-1 sector
- **WHEN** Admin creates a sector with `level=1`
- **THEN** system MUST save the sector with no parent

#### Scenario: Create level-2 sector under level-1
- **WHEN** Admin creates a sector with `level=2` and selects a level-1 parent
- **THEN** system MUST save the sector and link it to the parent

### Requirement: Sector hierarchy constraints must be enforced
The system SHALL enforce hierarchy integrity for sector records.

#### Scenario: Invalid parent for level-2
- **WHEN** Admin tries to set a level-2 sector parent that is not level-1
- **THEN** system MUST reject the write operation

#### Scenario: Invalid parent for level-1
- **WHEN** Admin tries to set any parent for a level-1 sector
- **THEN** system MUST reject the write operation

#### Scenario: Attempt to create cycle
- **WHEN** Admin tries to create a cyclic parent relation
- **THEN** system MUST reject the write operation

### Requirement: Coverage sector selector supports hierarchical search UX
The system SHALL provide searchable, scrollable, and hierarchical sector selection in coverage forms.

#### Scenario: Keyword search in selector
- **WHEN** Admin enters a keyword in the sector selector
- **THEN** system MUST filter and show matching sectors

#### Scenario: Two-level display in selector
- **WHEN** selector renders results
- **THEN** system MUST display level-1 and level-2 sectors with clear visual indentation

#### Scenario: Long list browsing
- **WHEN** sector options exceed visible area
- **THEN** system MUST provide scrollable options without breaking selection

