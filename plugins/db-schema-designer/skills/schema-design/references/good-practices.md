# Good Schema Design Practices

Annotated examples of well-designed schemas demonstrating best practices for PostgreSQL and MySQL.

## 1. Proper Table Structure with Audit Columns

### PostgreSQL

```sql
CREATE TABLE customer (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_customer_email UNIQUE (email),
    CONSTRAINT chk_customer_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_customer_email ON customer (email);
CREATE INDEX idx_customer_last_name ON customer (last_name);
```

### MySQL

```sql
CREATE TABLE customer (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_customer_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_customer_email ON customer (email);
CREATE INDEX idx_customer_last_name ON customer (last_name);
```

**Why this is good:**
- Singular table name (`customer`, not `customers`)
- `snake_case` naming throughout
- `BIGSERIAL`/`BIGINT` primary key allows for growth
- `NOT NULL` on required fields — NULL only where absence is meaningful (`phone`)
- Named constraints (`uq_`, `chk_` prefixes) for clarity in error messages and migrations
- Audit columns (`created_at`, `updated_at`) on every table
- Index on `email` for login lookups, `last_name` for search
- MySQL uses `InnoDB` engine and `utf8mb4` charset

---

## 2. One-to-Many Relationship with Proper Foreign Keys

```sql
-- PostgreSQL
CREATE TABLE order_header (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_order_header_customer FOREIGN KEY (customer_id)
        REFERENCES customer (id) ON DELETE RESTRICT,
    CONSTRAINT chk_order_header_status CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    CONSTRAINT chk_order_header_positive_amount CHECK (total_amount >= 0)
);

CREATE INDEX idx_order_header_customer_id ON order_header (customer_id);
CREATE INDEX idx_order_header_status ON order_header (status);
CREATE INDEX idx_order_header_order_date ON order_header (order_date);
```

**Why this is good:**
- Foreign key with explicit `ON DELETE RESTRICT` — prevents orphaned orders
- Foreign key column is indexed (`idx_order_header_customer_id`)
- `CHECK` constraint enforces valid status values
- `CHECK` constraint prevents negative amounts
- `NUMERIC(12, 2)` for monetary values, not `FLOAT`
- `total_amount` is a deliberate denormalization (documented via naming) to avoid recalculating from line items

---

## 3. Many-to-Many with Junction Table

```sql
-- PostgreSQL
CREATE TABLE product_tag (
    product_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (product_id, tag_id),
    CONSTRAINT fk_product_tag_product FOREIGN KEY (product_id)
        REFERENCES product (id) ON DELETE CASCADE,
    CONSTRAINT fk_product_tag_tag FOREIGN KEY (tag_id)
        REFERENCES tag (id) ON DELETE CASCADE
);

CREATE INDEX idx_product_tag_tag_id ON product_tag (tag_id);
```

**Why this is good:**
- Composite primary key — no surrogate key needed for a junction table
- `ON DELETE CASCADE` — when a product or tag is deleted, the association is cleaned up
- Index on `tag_id` for reverse lookups (finding products by tag)
- `product_id` is already indexed as the leading column of the primary key
- `created_at` tracks when the association was created

---

## 4. Self-Referencing Table for Hierarchies

```sql
-- PostgreSQL
CREATE TABLE category (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    parent_id BIGINT,
    depth INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id)
        REFERENCES category (id) ON DELETE SET NULL,
    CONSTRAINT uq_category_slug UNIQUE (slug),
    CONSTRAINT chk_category_depth CHECK (depth >= 0)
);

CREATE INDEX idx_category_parent_id ON category (parent_id);
CREATE INDEX idx_category_slug ON category (slug);
```

**Why this is good:**
- `parent_id` is nullable — top-level categories have no parent
- `ON DELETE SET NULL` — if parent is deleted, children become top-level
- `depth` column avoids recursive queries to determine level
- `sort_order` for deterministic ordering within a level
- `slug` with unique constraint for URL-friendly identifiers

---

## 5. Lookup Table Instead of Enum

```sql
-- PostgreSQL
CREATE TABLE payment_method (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT uq_payment_method_code UNIQUE (code)
);

INSERT INTO payment_method (code, display_name, sort_order) VALUES
    ('credit_card', 'Credit Card', 1),
    ('debit_card', 'Debit Card', 2),
    ('bank_transfer', 'Bank Transfer', 3),
    ('paypal', 'PayPal', 4);

CREATE TABLE payment (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    payment_method_id INTEGER NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_payment_order FOREIGN KEY (order_id)
        REFERENCES order_header (id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_method FOREIGN KEY (payment_method_id)
        REFERENCES payment_method (id) ON DELETE RESTRICT,
    CONSTRAINT chk_payment_positive_amount CHECK (amount > 0)
);
```

**Why this is good:**
- Lookup table instead of database enum — values can be added/modified without schema migration
- `code` column for programmatic access, `display_name` for UI
- `is_active` flag for soft-disabling payment methods without breaking references
- `sort_order` for deterministic display ordering

---

## 6. Soft Deletes Pattern

```sql
-- PostgreSQL
CREATE TABLE user_account (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_account_email UNIQUE (email),
    CONSTRAINT uq_user_account_username UNIQUE (username)
);

-- Partial index for active users only (PostgreSQL)
CREATE INDEX idx_user_account_active_email ON user_account (email) WHERE deleted_at IS NULL;
```

**Why this is good:**
- `deleted_at` NULL means active, non-NULL means soft-deleted with timestamp
- Partial index only covers active users — smaller, faster for login queries
- Unique constraints still prevent duplicate emails even for soft-deleted users (intentional — prevents re-registration confusion)
- No `is_deleted` boolean — `deleted_at` provides both the flag and the timestamp

---

## 7. Proper Use of Custom Types (PostgreSQL)

```sql
-- PostgreSQL
CREATE TYPE order_status AS ENUM ('draft', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

CREATE TABLE order_header (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    status order_status NOT NULL DEFAULT 'draft',
    -- ...
);
```

**Why this is good (for stable, small value sets):**
- Type-safe at the database level — prevents invalid values
- More storage-efficient than `VARCHAR`
- Self-documenting — the type definition shows all valid values
- Use this pattern only when values rarely change; otherwise prefer a lookup table

**Note:** This example uses a PostgreSQL `ENUM` type for `status`, while Section 2 uses a `VARCHAR` with a `CHECK` constraint for the same purpose. Both are valid approaches — use `ENUM` types for very stable value sets and `VARCHAR` with `CHECK` when values may evolve (adding a new enum value requires `ALTER TYPE`, while updating a `CHECK` constraint is simpler).
