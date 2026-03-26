---
name: create-schema
description: This skill should be used when the user asks to "create a schema", "generate tables", "design a database for", "build a schema from scratch", or provides a natural language description of a database to create. Outputs PostgreSQL or MySQL SQL, DBML, Prisma, TypeORM, or Sequelize.
argument-hint: <description of the database schema to create>
allowed-tools: Read, Write, Edit, Glob, Grep
version: 0.1.0
---

# Create Database Schema

Generate a complete relational database schema from a natural language description. Output the schema in the chat for review before writing to any file.

## Workflow

### 1. Gather Requirements

Before generating any SQL, clarify the following with the user if not already specified:

- **Target database**: PostgreSQL or MySQL (ask each time)
- **Output format**: SQL, DBML, Prisma, TypeORM, Sequelize, or other (ask each time)
- **Entities and relationships**: Confirm the core entities and how they relate
- **Business rules**: Any constraints, validations, or special requirements

If the user provides a clear, detailed description, proceed without asking redundant questions.

### 2. Design the Schema

Apply these principles in order:

1. **Identify entities** — Extract nouns from the description as candidate tables
2. **Define relationships** — Determine one-to-one, one-to-many, many-to-many relationships
3. **Normalize to 3NF** — Apply normalization rules progressively (1NF → 2NF → 3NF)
4. **Apply naming conventions** — `snake_case`, singular table names, `<table>_id` for foreign keys
5. **Choose data types** — Use appropriate types for the target database (refer to schema-design skill)
6. **Add constraints** — PRIMARY KEY, FOREIGN KEY, NOT NULL, UNIQUE, CHECK
7. **Add indexes** — On foreign keys, frequently queried columns, and unique constraints
8. **Add audit columns** — `created_at` and `updated_at` on every table
9. **Consider denormalization** — Only when justified by read-heavy patterns; document the reason

### 3. Generate Output

Structure the output in this order:

#### For SQL output:

```
1. Custom types / ENUMs (if any)
2. Tables in dependency order (referenced tables first)
3. Indexes
4. Seed data templates (INSERT statements with example data)
5. Migration metadata (comments with version/description)
```

Include a header comment block:

```sql
-- =============================================================================
-- Schema: <name>
-- Database: PostgreSQL / MySQL
-- Description: <brief description>
-- Generated: <date>
-- =============================================================================
```

#### For DBML output:

```dbml
Project schema_name {
  database_type: 'PostgreSQL'
  Note: 'Description'
}

Table table_name {
  id bigserial [pk, increment]
  column_name type [not null, unique, note: 'description']

  Indexes {
    column_name [name: 'idx_table_column']
  }
}

Ref: table_a.foreign_id > table_b.id
```

#### For Prisma output:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model TableName {
  id        BigInt   @id @default(autoincrement())
  column    String
  relation  Related  @relation(fields: [relatedId], references: [id])
  relatedId BigInt
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("table_name")
  @@index([relatedId])
}
```

#### For TypeORM output:

```typescript
@Entity('table_name')
export class TableName {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  columnName: string;

  @ManyToOne(() => Related, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'related_id' })
  related: Related;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

#### For Sequelize output:

```javascript
module.exports = (sequelize, DataTypes) => {
  const TableName = sequelize.define('TableName', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    columnName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'column_name'
    }
  }, {
    tableName: 'table_name',
    underscored: true,
    timestamps: true
  });

  TableName.associate = (models) => {
    TableName.belongsTo(models.Related, {
      foreignKey: 'related_id',
      onDelete: 'RESTRICT'
    });
  };

  return TableName;
};
```

### 4. Include Supporting Elements

After the main schema, generate:

- **Seed data template**: INSERT statements with realistic example data for each table (3-5 rows per table)
- **Migration file header**: Comment block with migration version, description, and rollback instructions

### 5. Present for Review

Output the complete schema in the chat. Do not write files unless the user explicitly requests it. After presenting:

- Summarize the tables created, relationships, and any design decisions made
- Note any denormalization applied and why
- Ask if the user wants modifications before saving to a file
