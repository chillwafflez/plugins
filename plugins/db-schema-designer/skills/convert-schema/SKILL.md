---
name: convert-schema
description: This skill should be used when the user asks to "convert my schema", "transform SQL to Prisma", "export schema to DBML", "generate TypeORM entities from SQL", "convert PostgreSQL to MySQL", or needs to translate a schema between SQL dialects and ORM formats.
argument-hint: <source file path> to <target format>
allowed-tools: Read, Write, Edit, Glob, Grep
version: 0.1.0
---

# Convert Database Schema

Convert database schemas between SQL dialects and ORM/modeling formats.

## Supported Conversions

### Source Formats
- PostgreSQL SQL (`.sql`)
- MySQL SQL (`.sql`)
- DBML (`.dbml`)
- Prisma (`.prisma`)
- TypeORM entities (`.ts`)
- Sequelize models (`.js` / `.ts`)
- Natural language description

### Target Formats
- PostgreSQL SQL
- MySQL SQL
- DBML
- Prisma schema
- TypeORM entities
- Sequelize models

## Workflow

### 1. Identify Source and Target

Parse the user's request to determine:

- **Source**: A file path to read, or a description provided inline
- **Target format**: The desired output format

If either is unclear, ask the user to specify. Examples of valid requests:

- `/db-schema-designer:convert-schema schema.sql to Prisma`
- `/db-schema-designer:convert-schema convert my PostgreSQL schema to DBML`
- `/db-schema-designer:convert-schema models/ to MySQL SQL`

### 2. Read and Parse the Source

Read the source file using the Read tool. Identify the source format by:

- File extension (`.sql`, `.dbml`, `.prisma`, `.ts`, `.js`)
- Content inspection (e.g., `CREATE TABLE` = SQL, `model` blocks = Prisma)
- SQL dialect detection (e.g., `SERIAL` = PostgreSQL, `AUTO_INCREMENT` = MySQL)

Extract from the source:

- Table/entity names
- Column names, types, and constraints
- Relationships (foreign keys, references)
- Indexes
- Enums and custom types
- Default values
- Comments and documentation

### 3. Map Types Between Formats

#### PostgreSQL to MySQL Type Mapping

| PostgreSQL | MySQL |
|-----------|-------|
| `SERIAL` | `INT AUTO_INCREMENT` |
| `BIGSERIAL` | `BIGINT AUTO_INCREMENT` |
| `BOOLEAN` | `TINYINT(1)` |
| `TIMESTAMPTZ` | `TIMESTAMP` |
| `TEXT` | `TEXT` |
| `JSONB` | `JSON` |
| `NUMERIC(p,s)` | `DECIMAL(p,s)` |
| `UUID` | `CHAR(36)` |
| `BYTEA` | `BLOB` |
| `INTERVAL` | No direct equivalent (use `VARCHAR` or `INT` for seconds) |
| `ARRAY` | No direct equivalent (use junction table or `JSON`) |
| Custom `ENUM` type | Inline `ENUM(...)` |

#### MySQL to PostgreSQL Type Mapping

| MySQL | PostgreSQL |
|-------|-----------|
| `INT AUTO_INCREMENT` | `SERIAL` |
| `BIGINT AUTO_INCREMENT` | `BIGSERIAL` |
| `TINYINT(1)` | `BOOLEAN` |
| `DATETIME` | `TIMESTAMP` |
| `TIMESTAMP` | `TIMESTAMPTZ` |
| `DECIMAL(p,s)` | `NUMERIC(p,s)` |
| `DOUBLE` | `DOUBLE PRECISION` |
| Inline `ENUM(...)` | Custom `ENUM` type |
| `UNSIGNED` | Use `CHECK (column >= 0)` |

#### SQL to Prisma Type Mapping

| SQL | Prisma |
|-----|--------|
| `BIGSERIAL` / `BIGINT AUTO_INCREMENT` | `BigInt @id @default(autoincrement())` |
| `VARCHAR(n)` | `String @db.VarChar(n)` |
| `TEXT` | `String` |
| `BOOLEAN` / `TINYINT(1)` | `Boolean` |
| `INTEGER` / `INT` | `Int` |
| `BIGINT` | `BigInt` |
| `NUMERIC(p,s)` / `DECIMAL(p,s)` | `Decimal @db.Decimal(p,s)` |
| `TIMESTAMPTZ` / `TIMESTAMP` | `DateTime` |
| `DATE` | `DateTime @db.Date` |
| `JSONB` / `JSON` | `Json` |
| `UUID` | `String @db.Uuid` |

#### SQL to TypeORM Type Mapping

| SQL | TypeORM |
|-----|---------|
| `BIGSERIAL` | `@PrimaryGeneratedColumn('increment', { type: 'bigint' })` |
| `VARCHAR(n)` | `@Column({ type: 'varchar', length: n })` |
| `TEXT` | `@Column({ type: 'text' })` |
| `BOOLEAN` | `@Column({ type: 'boolean' })` |
| `NUMERIC(p,s)` | `@Column({ type: 'decimal', precision: p, scale: s })` |
| `TIMESTAMPTZ` | `@Column({ type: 'timestamptz' })` |
| `JSONB` | `@Column({ type: 'jsonb' })` |

### 4. Handle Format-Specific Features

#### Converting TO SQL
- Generate tables in dependency order (referenced tables first)
- Include all constraints, indexes, and comments
- Add `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` for MySQL
- Add header comment with metadata

#### Converting TO DBML
- Use `Ref:` syntax for relationships
- Map constraints to DBML annotations (`[pk]`, `[not null]`, `[unique]`)
- Include `Note:` for table and column documentation
- Group related tables in the same `Project` block

#### Converting TO Prisma
- Use `@@map("snake_case")` to preserve database table names
- Use `@map("snake_case")` for column names
- Define relations with `@relation(fields: [...], references: [...])`
- Include `@@index` for non-primary indexes
- Add `generator` and `datasource` blocks

#### Converting TO TypeORM
- Use decorators: `@Entity`, `@Column`, `@PrimaryGeneratedColumn`
- Map relationships: `@OneToMany`, `@ManyToOne`, `@ManyToMany`, `@JoinTable`
- Use `@CreateDateColumn` and `@UpdateDateColumn` for audit columns
- Export as TypeScript classes

#### Converting TO Sequelize
- Use `sequelize.define()` or class-based model syntax
- Map associations in `associate` static method
- Set `underscored: true` for snake_case column mapping
- Include model options (`tableName`, `timestamps`, `paranoid` for soft deletes)

### 5. Present the Result

Output the converted schema in the chat. After presenting:

- Note any features that could not be directly converted and the workarounds applied
- Flag any data type mappings that may lose precision or change behavior
- Ask if the user wants to save the output to a file
