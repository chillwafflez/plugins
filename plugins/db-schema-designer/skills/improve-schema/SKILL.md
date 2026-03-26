---
name: Improve Schema
description: This skill should be used when the user asks to "improve my schema", "analyze my schema", "fix my database design", "optimize my tables", "check my SQL for issues", or wants a schema quality report with a corrected version.
argument-hint: [path to .sql file or leave blank to auto-detect]
allowed-tools: Read, Write, Edit, Glob, Grep
version: 0.1.0
---

# Improve Database Schema

Analyze an existing database schema for design issues and generate an improved version with a detailed report.

## Workflow

### 1. Locate the Schema

Determine the schema source based on user input:

- **Specific file path provided**: Read the file directly using the Read tool
- **No path provided**: Auto-detect `.sql` files in the current directory using the Glob tool with pattern `**/*.sql`. If multiple files found, list them and ask the user which to analyze. Also check for `.prisma`, `.dbml`, and other schema formats.

### 2. Analyze the Schema

Evaluate the schema against these categories, checking each systematically:

#### Normalization Analysis
- **1NF violations**: Repeating groups, non-atomic columns, missing primary keys
- **2NF violations**: Partial dependencies (columns depending on part of a composite key)
- **3NF violations**: Transitive dependencies (non-key columns depending on other non-key columns)

#### Naming Convention Issues
- Tables not in `snake_case` or not singular
- Columns not in `snake_case`
- Foreign keys not following `<referenced_table>_id` pattern
- Constraints not using `uq_`, `chk_`, `fk_`, `idx_` prefixes
- Reserved words used as identifiers

#### Constraint Issues
- Missing primary keys
- Missing foreign keys (implicit relationships)
- Missing `NOT NULL` on required columns
- Missing `UNIQUE` constraints on natural keys
- Missing `CHECK` constraints for business rules
- Foreign keys without `ON DELETE`/`ON UPDATE` behavior specified

#### Index Issues
- Missing indexes on foreign key columns
- Missing indexes on frequently queried columns
- Over-indexing (indexes on every column)
- Missing composite indexes for common query patterns

#### Data Type Issues
- `FLOAT`/`DOUBLE` used for monetary values
- Overly large or small column sizes
- `VARCHAR` without length limit where one is appropriate
- Wrong timestamp type (e.g., `TIMESTAMP` without timezone in PostgreSQL)

#### Structural Issues
- God tables (too many unrelated columns)
- Missing audit columns (`created_at`, `updated_at`)
- EAV (Entity-Attribute-Value) anti-patterns
- Polymorphic associations without proper constraints
- Comma-separated values stored in single columns
- Missing junction tables for many-to-many relationships

#### Denormalization Assessment
- Identify existing denormalization — is it documented and justified?
- Suggest denormalization opportunities for read-heavy patterns
- Flag unnecessary denormalization that adds complexity without benefit

### 3. Generate the Report

Present findings organized by severity. List all findings — do not filter by severity:

```markdown
## Schema Analysis Report

### Summary
- **Tables analyzed**: X
- **Total findings**: X
- **Normalization**: Currently at XNF, should be at 3NF

### Findings

#### 1. [Finding Title]
- **Category**: Normalization / Naming / Constraints / Indexes / Data Types / Structure
- **Location**: `table_name.column_name` or `table_name`
- **Issue**: Description of what's wrong
- **Impact**: What problems this causes
- **Fix**: How to resolve it
```

### 4. Generate the Improved Schema

After the report, generate a complete improved schema that addresses all findings:

- Present the improved schema in the same format as the original (SQL, DBML, Prisma, etc.)
- Include comments marking what changed and why
- Preserve existing correct design decisions
- Apply all fixes from the report
- Add migration notes for transitioning from the old schema to the new one

Structure the improved SQL output:

```sql
-- =============================================================================
-- Improved Schema
-- Original: <original file name>
-- Changes: <number> improvements applied
-- =============================================================================

-- CHANGE: <description of change and why>
```

### 5. Present Both Outputs

Output both the report and the improved schema in the chat. After presenting:

- Summarize the most impactful changes
- Note any changes that could affect existing data or application code
- Ask if the user wants to save the improved schema to a file
- If the user confirms, write the improved schema alongside the original (e.g., `schema_improved.sql`)
