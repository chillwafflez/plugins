# Bad Schema Design Practices

Common anti-patterns with explanations of the problems they cause and how to fix them.

## 1. God Table (Everything in One Table)

### The Problem

```sql
-- BAD: Single table trying to store everything
CREATE TABLE user (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    order_id INT,
    order_date DATE,
    order_total DECIMAL(10,2),
    product_name VARCHAR(255),
    product_price DECIMAL(10,2),
    product_quantity INT,
    shipping_address TEXT,
    billing_address TEXT,
    payment_method VARCHAR(50),
    payment_status VARCHAR(20)
);
```

### Why It's Bad

- Massive data duplication — user info repeated for every order and product
- Update anomalies — changing a user's email requires updating every row
- Delete anomalies — deleting the last order for a user loses the user's data
- Insert anomalies — cannot add a user without creating an order
- Violates 1NF, 2NF, and 3NF simultaneously

### The Fix

Decompose into properly related tables: `user`, `order_header`, `order_item`, `product`, `address`, `payment`.

---

## 2. Missing Foreign Keys (Implicit Relationships)

### The Problem

```sql
-- BAD: No foreign key constraints
CREATE TABLE order_header (
    id SERIAL PRIMARY KEY,
    customer_id INT,        -- No FK constraint!
    product_id INT,         -- No FK constraint!
    quantity INT
);
```

### Why It's Bad

- No referential integrity — `customer_id` could reference a non-existent customer
- Orphaned records accumulate over time
- Application code becomes the only guard against invalid data
- Makes it impossible to understand relationships from the schema alone

### The Fix

```sql
CREATE TABLE order_header (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    CONSTRAINT fk_order_header_customer FOREIGN KEY (customer_id)
        REFERENCES customer (id) ON DELETE RESTRICT
);
```

---

## 3. Storing Multiple Values in One Column

### The Problem

```sql
-- BAD: Comma-separated values in a single column
CREATE TABLE product (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    tags VARCHAR(500)       -- Stores "electronics,sale,featured"
);
```

### Why It's Bad

- Violates 1NF — column is not atomic
- Cannot efficiently query for products with a specific tag
- Cannot enforce referential integrity on individual tags
- `LIKE '%sale%'` queries are slow and can produce false matches (e.g., "wholesale")
- Cannot index individual values

### The Fix

```sql
CREATE TABLE tag (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    CONSTRAINT uq_tag_name UNIQUE (name)
);

CREATE TABLE product_tag (
    product_id BIGINT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (product_id, tag_id),
    CONSTRAINT fk_product_tag_product FOREIGN KEY (product_id) REFERENCES product (id) ON DELETE CASCADE,
    CONSTRAINT fk_product_tag_tag FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE
);
```

---

## 4. Using Float for Money

### The Problem

```sql
-- BAD: Floating point for monetary values
CREATE TABLE invoice (
    id SERIAL PRIMARY KEY,
    amount FLOAT,           -- WRONG!
    tax DOUBLE PRECISION    -- ALSO WRONG!
);
```

### Why It's Bad

- Floating point arithmetic introduces rounding errors
- `0.1 + 0.2 != 0.3` in floating point
- Financial calculations accumulate errors over time
- Audit and compliance failures

### The Fix

```sql
CREATE TABLE invoice (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(12, 2) NOT NULL,
    tax NUMERIC(12, 2) NOT NULL
);
```

---

## 5. No Primary Key

### The Problem

```sql
-- BAD: Table with no primary key
CREATE TABLE log_entry (
    timestamp DATETIME,
    user_id INT,
    action VARCHAR(255),
    details TEXT
);
```

### Why It's Bad

- No way to uniquely identify a row
- Cannot create foreign key references to this table
- Duplicate detection is impossible
- ORM tools cannot function without a primary key
- Replication and partitioning may not work correctly

### The Fix

```sql
CREATE TABLE log_entry (
    id BIGSERIAL PRIMARY KEY,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id BIGINT NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,

    CONSTRAINT fk_log_entry_user FOREIGN KEY (user_id) REFERENCES user_account (id)
);
```

---

## 6. Overusing NULL

### The Problem

```sql
-- BAD: Everything nullable
CREATE TABLE employee (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),    -- Can be NULL
    last_name VARCHAR(100),     -- Can be NULL
    email VARCHAR(255),         -- Can be NULL
    department VARCHAR(50),     -- Can be NULL
    hire_date DATE              -- Can be NULL
);
```

### Why It's Bad

- Every required field should be `NOT NULL` — an employee must have a name and email
- NULL introduces three-valued logic (`TRUE`, `FALSE`, `NULL`) in queries
- `NULL != NULL` — comparisons with NULL are counterintuitive
- Aggregations silently skip NULL values
- Application code must handle NULL everywhere

### The Fix

```sql
CREATE TABLE employee (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    department_id BIGINT NOT NULL,
    hire_date DATE NOT NULL,
    termination_date DATE,          -- NULL is meaningful here: still employed

    CONSTRAINT uq_employee_email UNIQUE (email),
    CONSTRAINT fk_employee_department FOREIGN KEY (department_id) REFERENCES department (id)
);
```

Only allow NULL when the absence of a value carries meaning.

---

## 7. Polymorphic Associations with Type/ID Columns

### The Problem

```sql
-- BAD: Polymorphic association
CREATE TABLE comment (
    id SERIAL PRIMARY KEY,
    body TEXT NOT NULL,
    commentable_type VARCHAR(50),   -- 'post', 'photo', 'video'
    commentable_id INT              -- References different tables depending on type
);
```

### Why It's Bad

- Cannot create a foreign key constraint — `commentable_id` could reference any table
- No referential integrity enforcement
- Queries require conditional logic based on `commentable_type`
- Adding a new commentable type is error-prone
- Database cannot optimize joins

### The Fix

```sql
-- Use separate junction tables
CREATE TABLE post_comment (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_post_comment_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE
);

CREATE TABLE photo_comment (
    id BIGSERIAL PRIMARY KEY,
    photo_id BIGINT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_photo_comment_photo FOREIGN KEY (photo_id) REFERENCES photo (id) ON DELETE CASCADE
);
```

Or use a shared `comment` table with nullable foreign keys (one per target) if the number of targets is small and stable.

---

## 8. Using Reserved Words as Identifiers

### The Problem

```sql
-- BAD: Reserved words as table/column names
CREATE TABLE order (           -- "order" is reserved (ORDER BY)
    id SERIAL PRIMARY KEY,
    select VARCHAR(255),       -- "select" is reserved
    group VARCHAR(50),         -- "group" is reserved
    date DATE                  -- "date" is a type name
);
```

### Why It's Bad

- Requires quoting everywhere (`"order"`, `` `order` ``) — easy to forget, causes bugs
- Different databases quote differently (double quotes vs backticks)
- Makes SQL harder to read and maintain
- Some ORMs struggle with reserved word identifiers

### The Fix

Use descriptive, non-reserved names:

```sql
CREATE TABLE order_header (
    id BIGSERIAL PRIMARY KEY,
    selection VARCHAR(255),
    group_name VARCHAR(50),
    order_date DATE
);
```

---

## 9. Over-Indexing

### The Problem

```sql
-- BAD: Index on every column
CREATE TABLE product (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    price DECIMAL(10,2),
    weight DECIMAL(8,2),
    color VARCHAR(30),
    size VARCHAR(20)
);

CREATE INDEX idx_product_name ON product (name);
CREATE INDEX idx_product_description ON product (description);  -- Index on TEXT!
CREATE INDEX idx_product_price ON product (price);
CREATE INDEX idx_product_weight ON product (weight);
CREATE INDEX idx_product_color ON product (color);
CREATE INDEX idx_product_size ON product (size);
CREATE INDEX idx_product_name_price ON product (name, price);
CREATE INDEX idx_product_color_size ON product (color, size);
```

### Why It's Bad

- Every index adds write overhead (INSERT, UPDATE, DELETE are slower)
- Indexes consume disk space
- Index on `TEXT` column is usually wasteful — use full-text search instead
- Redundant composite indexes waste resources
- Query planner may choose suboptimal index with too many options

### The Fix

Only index columns that appear in `WHERE`, `JOIN`, `ORDER BY`, or `GROUP BY` clauses of actual queries:

```sql
CREATE INDEX idx_product_name ON product (name);    -- Searched frequently
CREATE INDEX idx_product_price ON product (price);  -- Used in filters/sorting
-- That's it. Add more only when query performance data justifies them.
```

---

## 10. Using EAV (Entity-Attribute-Value) Pattern

### The Problem

```sql
-- BAD: Entity-Attribute-Value anti-pattern
CREATE TABLE product_attribute (
    product_id INT,
    attribute_name VARCHAR(100),
    attribute_value VARCHAR(500)
);

-- Stores data like:
-- (1, 'color', 'red')
-- (1, 'size', 'large')
-- (1, 'weight', '2.5')
```

### Why It's Bad

- No type safety — everything stored as strings
- Cannot add constraints on individual attributes
- Queries become complex pivots
- Terrible performance for filtering/sorting on specific attributes
- Schema provides no documentation of what attributes exist

### The Fix

For a known set of attributes, use typed columns. For truly dynamic attributes, use `JSONB` (PostgreSQL) or `JSON` (MySQL) with validation:

```sql
-- Option 1: Typed columns (preferred when attributes are known)
CREATE TABLE product (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(30),
    size VARCHAR(20),
    weight NUMERIC(8, 2)
);

-- Option 2: JSONB for truly dynamic attributes
CREATE TABLE product (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_product_attributes ON product USING GIN (attributes);
```
