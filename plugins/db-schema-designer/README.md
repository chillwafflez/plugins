# db-schema-designer

A Claude Code plugin that helps developers design, improve, and convert relational database schemas for PostgreSQL and MySQL following best practices, normalization rules, and industry standards.

## Features

- Generate complete schemas from natural language descriptions
- Analyze and improve existing schemas with detailed reports
- Convert schemas between SQL dialects and ORM formats (Prisma, TypeORM, Sequelize, DBML)
- Apply normalization rules (1NF, 2NF, 3NF) and strategic denormalization
- Proactive schema review on .sql files

## Components

### Skills

| Skill | Invocation | Description |
|-------|-----------|-------------|
| Schema Design | Auto-activates | Core knowledge: naming conventions, normalization, data types, constraints, indexing |
| Create Schema | `/db-schema-designer:create-schema` | Generate a full schema from a description |
| Improve Schema | `/db-schema-designer:improve-schema` | Analyze and improve an existing schema |
| Convert Schema | `/db-schema-designer:convert-schema` | Convert between SQL, DBML, Prisma, TypeORM, Sequelize |

### Agents

| Agent | Trigger | Description |
|-------|---------|-------------|
| Schema Reviewer | Proactive on .sql DDL files | Reviews schemas for design issues, normalization violations, missing constraints |

## Usage

### Create a schema

```
/db-schema-designer:create-schema An e-commerce platform with users, products, orders, and reviews
```

### Improve an existing schema

```
/db-schema-designer:improve-schema ./schema.sql
```

### Convert a schema

```
/db-schema-designer:convert-schema ./schema.sql to Prisma
```

### Get design guidance

Ask any question about database design and the schema-design skill will activate automatically:

- "How should I design tables for a blog?"
- "What's the best way to handle many-to-many relationships?"
- "Should I normalize this or denormalize for performance?"

## Conventions

This plugin enforces:

- `snake_case` for all table and column names
- Singular table names (`user`, not `users`)
- Named constraints with prefixes (`uq_`, `chk_`, `fk_`, `idx_`)
- `NOT NULL` by default, NULL only when meaningful
- Audit columns (`created_at`, `updated_at`) on every table
- Indexes on all foreign key columns

## Installation

```bash
claude --plugin-dir /path/to/db-schema-designer
```
