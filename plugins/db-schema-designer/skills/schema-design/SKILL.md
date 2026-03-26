---
name: Database Schema Design
description: This skill should be used when the user asks about "database design best practices", "schema design", "normalization", "denormalization", "database naming conventions", "foreign key design", "index strategy", "table relationships", "data types", "database constraints", "1NF", "2NF", "3NF", "design my database tables", "structure my database", "create tables for", "review my schema", or discusses relational database schema architecture for PostgreSQL or MySQL.
version: 0.1.0
---

# Database Schema Design

Core knowledge for designing relational database schemas in PostgreSQL and MySQL. Apply these principles when creating, reviewing, or improving any database schema.

## Naming Conventions

Enforce these conventions consistently across all schemas:

- **Tables**: `snake_case`, singular form (e.g., `user_account`, `order_item`, `product_category`)
- **Columns**: `snake_case` (e.g., `first_name`, `created_at`, `is_active`)
- **Primary keys**: `id` for single-column surrogate keys
- **Foreign keys**: `<referenced_table>_id` (e.g., `user_id`, `order_id`)
- **Indexes**: `idx_<table>_<column(s)>` (e.g., `idx_user_email`)
- **Unique constraints**: `uq_<table>_<column(s)>` (e.g., `uq_user_email`)
- **Check constraints**: `chk_<table>_<description>` (e.g., `chk_order_positive_amount`)
- **Enums/Types**: `snake_case` (e.g., `order_status`, `payment_method`)

Avoid reserved words as identifiers. Avoid prefixes like `tbl_` or `col_`.

## Normalization Rules

Apply normalization progressively. Each normal form builds on the previous.

### First Normal Form (1NF)

- Every column contains only atomic (indivisible) values
- No repeating groups or arrays in a single column
- Each row is uniquely identifiable (has a primary key)

**Violation**: A `phone_numbers` column storing `"555-1234, 555-5678"`.
**Fix**: Create a separate `phone_number` table with a foreign key back to the parent.

### Second Normal Form (2NF)

- Meets 1NF
- Every non-key column depends on the entire primary key (no partial dependencies)
- Only relevant for composite primary keys

**Violation**: In a table with composite key `(order_id, product_id)`, a `customer_name` column depends only on `order_id`.
**Fix**: Move `customer_name` to the `order` table.

### Third Normal Form (3NF)

- Meets 2NF
- No transitive dependencies — non-key columns depend only on the primary key, not on other non-key columns

**Violation**: A `user` table with `zip_code`, `city`, and `state` where `city` and `state` depend on `zip_code`.
**Fix**: Create an `address` or `zip_code` lookup table.

## When to Denormalize

Denormalization is a deliberate trade-off. Apply it only when:

- **Read-heavy workloads**: Queries joining 4+ tables frequently
- **Reporting/analytics**: Aggregation queries that scan large datasets
- **Caching computed values**: Storing `order_total` to avoid recalculating
- **Performance-critical paths**: When measured query latency is unacceptable

Always document why a denormalization was applied. Common strategies:

- **Precomputed columns**: Store calculated values (e.g., `total_amount` on `order`)
- **Duplicated columns**: Copy frequently accessed data to avoid joins
- **Summary tables**: Materialized aggregations for reporting

## Data Types

### PostgreSQL

| Use Case | Recommended Type |
|----------|-----------------|
| Surrogate PK | `BIGSERIAL` or `UUID` |
| Short text | `VARCHAR(n)` |
| Long text | `TEXT` |
| Boolean | `BOOLEAN` |
| Integer | `INTEGER`, `BIGINT` |
| Decimal/money | `NUMERIC(precision, scale)` |
| Timestamps | `TIMESTAMPTZ` |
| Date only | `DATE` |
| JSON data | `JSONB` |
| Enum values | Custom `ENUM` type or lookup table |

### MySQL

| Use Case | Recommended Type |
|----------|-----------------|
| Surrogate PK | `BIGINT UNSIGNED AUTO_INCREMENT` or `CHAR(36)` for UUID |
| Short text | `VARCHAR(n)` |
| Long text | `TEXT` |
| Boolean | `TINYINT(1)` or `BOOLEAN` |
| Integer | `INT`, `BIGINT` |
| Decimal/money | `DECIMAL(precision, scale)` |
| Timestamps | `TIMESTAMP` or `DATETIME` |
| Date only | `DATE` |
| JSON data | `JSON` |
| Enum values | `ENUM(...)` or lookup table |

Avoid using `FLOAT`/`DOUBLE` for monetary values. Use `NUMERIC`/`DECIMAL` instead.

## Constraints and Relationships

- **Always define primary keys** — every table must have one
- **Always define foreign keys** — enforce referential integrity at the database level
- **Use NOT NULL by default** — only allow NULL when absence of a value is meaningful
- **Add CHECK constraints** for business rules (e.g., `price > 0`, `status IN (...)`)
- **Add UNIQUE constraints** for natural keys and business identifiers (e.g., `email`, `sku`)
- **Define ON DELETE/ON UPDATE behavior** — choose `CASCADE`, `SET NULL`, `RESTRICT`, or `NO ACTION` deliberately

## Indexing Strategy

- **Primary keys** are indexed automatically
- **Foreign keys** — always index them (PostgreSQL does NOT auto-index foreign keys)
- **Columns in WHERE clauses** — index frequently filtered columns
- **Columns in JOIN conditions** — index join columns
- **Composite indexes** — place the most selective column first
- **Covering indexes** — include all columns needed by a query to avoid table lookups
- **Avoid over-indexing** — each index adds write overhead; only index what queries actually need
- **Partial indexes (PostgreSQL)** — use `WHERE` clause on index for filtered subsets

### Index Types

| Type | Use Case | PostgreSQL | MySQL |
|------|----------|-----------|-------|
| B-tree | Default — equality and range queries | `CREATE INDEX` (default) | `CREATE INDEX` (default) |
| Hash | Equality-only lookups | `USING HASH` | Automatic for `MEMORY` engine |
| GIN | JSONB, arrays, full-text search | `USING GIN` | N/A (use full-text index) |
| GiST | Geometric data, range types, full-text | `USING GiST` | N/A |
| Full-text | Text search | `to_tsvector` + GIN/GiST | `FULLTEXT` index |

Use B-tree unless a specific use case calls for another type.

## Migration Safety

When evolving schemas in production:

- **Add columns as nullable first** — adding a `NOT NULL` column without a default locks the table on large datasets
- **Avoid renaming columns directly** — instead, add the new column, migrate data, update application code, then drop the old column
- **Use `IF NOT EXISTS` / `IF EXISTS`** — guard `CREATE` and `DROP` statements for idempotent migrations
- **Separate schema changes from data migrations** — deploy schema changes first, then backfill data in a separate step
- **Test rollback paths** — every migration should have a corresponding down/rollback migration

## Common Patterns

- **Audit columns**: Include `created_at` and `updated_at` on every table
- **Soft deletes**: Add `deleted_at TIMESTAMPTZ NULL` instead of hard deleting rows
- **Polymorphic associations**: Prefer separate join tables over `type`/`id` column pairs
- **Self-referencing tables**: Use for hierarchies (e.g., `parent_id` referencing same table)
- **Junction tables**: For many-to-many relationships, name as `<table1>_<table2>` (e.g., `user_role`)
- **Enum vs lookup table**: Use lookup tables when values change frequently or need metadata; use enums for stable, small sets

## Additional Resources

### Reference Files

For detailed examples and anti-patterns, consult:
- **`references/good-practices.md`** — Annotated examples of well-designed schemas with explanations of what makes them effective
- **`references/bad-practices.md`** — Common anti-patterns with explanations of the problems they cause and how to fix them
- **`references/normalization-examples.md`** — Step-by-step before/after transformations demonstrating progressive normalization from 1NF through 3NF
