# Normalization Examples

Step-by-step before/after transformations demonstrating progressive normalization from 1NF through 3NF.

## Example: E-Commerce Order System

### Starting Point: Unnormalized Data

A single spreadsheet-style table storing all order data:

```sql
CREATE TABLE order_data (
    order_id INT,
    order_date DATE,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_city VARCHAR(100),
    customer_state VARCHAR(50),
    customer_zip VARCHAR(10),
    product1_name VARCHAR(255),
    product1_price DECIMAL(10,2),
    product1_qty INT,
    product2_name VARCHAR(255),
    product2_price DECIMAL(10,2),
    product2_qty INT,
    product3_name VARCHAR(255),
    product3_price DECIMAL(10,2),
    product3_qty INT
);
```

**Problems:**
- Repeating groups (`product1_*`, `product2_*`, `product3_*`)
- Limited to 3 products per order
- Massive NULL waste when orders have fewer than 3 products
- Customer data repeated for every order

---

### Step 1: Apply First Normal Form (1NF)

**Rule**: Eliminate repeating groups. Every column must contain atomic values. Each row must be uniquely identifiable.

**Action**: Move products into separate rows. Add a primary key.

```sql
CREATE TABLE order_data (
    order_id INT,
    order_date DATE,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_city VARCHAR(100),
    customer_state VARCHAR(50),
    customer_zip VARCHAR(10),
    product_name VARCHAR(255),
    product_price DECIMAL(10,2),
    product_qty INT,
    PRIMARY KEY (order_id, product_name)
);
```

**What changed:**
- Repeating product columns replaced with one set of product columns per row
- Composite primary key `(order_id, product_name)` uniquely identifies each row
- No limit on products per order
- No NULL columns for missing products

**Remaining problems:**
- Customer data depends only on `order_id`, not on the full composite key (partial dependency)

---

### Step 2: Apply Second Normal Form (2NF)

**Rule**: Eliminate partial dependencies. Every non-key column must depend on the entire composite primary key.

**Analysis of dependencies:**
- `order_date` depends on `order_id` only → partial dependency
- `customer_name` depends on `order_id` only → partial dependency
- `customer_email` depends on `order_id` only → partial dependency
- `product_price` depends on `product_name` only → partial dependency
- `product_qty` depends on `(order_id, product_name)` → full dependency ✓

**Action**: Split into tables where each non-key column depends on the entire key.

```sql
-- Order information (depends on order_id)
CREATE TABLE order_header (
    order_id INT PRIMARY KEY,
    order_date DATE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_city VARCHAR(100),
    customer_state VARCHAR(50),
    customer_zip VARCHAR(10)
);

-- Product information (depends on product_name)
CREATE TABLE product (
    product_name VARCHAR(255) PRIMARY KEY,
    product_price DECIMAL(10,2) NOT NULL
);

-- Order line items (depends on both order_id and product_name)
CREATE TABLE order_item (
    order_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    PRIMARY KEY (order_id, product_name),
    FOREIGN KEY (order_id) REFERENCES order_header (order_id),
    FOREIGN KEY (product_name) REFERENCES product (product_name)
);
```

**What changed:**
- `order_header` holds data dependent on `order_id`
- `product` holds data dependent on `product_name`
- `order_item` holds only data dependent on the full composite key
- Foreign keys enforce referential integrity

**Remaining problems:**
- In `order_header`: `customer_city` and `customer_state` depend on `customer_zip`, not on `order_id` (transitive dependency)

---

### Step 3: Apply Third Normal Form (3NF)

**Rule**: Eliminate transitive dependencies. Non-key columns must depend only on the primary key, not on other non-key columns.

**Analysis of transitive dependencies in `order_header`:**
- `customer_city` depends on `customer_zip` (not directly on `order_id`)
- `customer_state` depends on `customer_zip` (not directly on `order_id`)
- `customer_name`, `customer_email`, `customer_phone` depend on the customer, not the order

**Action**: Extract entities with their own identity.

```sql
-- Zip code lookup (city and state depend on zip)
CREATE TABLE zip_code (
    zip VARCHAR(10) PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL
);

-- Customer entity (extracted from order)
CREATE TABLE customer (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    zip VARCHAR(10),

    CONSTRAINT uq_customer_email UNIQUE (email),
    CONSTRAINT fk_customer_zip FOREIGN KEY (zip) REFERENCES zip_code (zip)
);

-- Product with surrogate key
CREATE TABLE product (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,

    CONSTRAINT uq_product_name UNIQUE (name),
    CONSTRAINT chk_product_positive_price CHECK (price > 0)
);

-- Order references customer
CREATE TABLE order_header (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_order_header_customer FOREIGN KEY (customer_id)
        REFERENCES customer (id) ON DELETE RESTRICT
);

-- Order items reference both order and product
CREATE TABLE order_item (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,

    CONSTRAINT fk_order_item_order FOREIGN KEY (order_id)
        REFERENCES order_header (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_item_product FOREIGN KEY (product_id)
        REFERENCES product (id) ON DELETE RESTRICT,
    CONSTRAINT chk_order_item_positive_qty CHECK (quantity > 0),
    CONSTRAINT chk_order_item_positive_price CHECK (unit_price > 0)
);

-- Indexes on foreign keys
CREATE INDEX idx_customer_zip ON customer (zip);
CREATE INDEX idx_order_header_customer_id ON order_header (customer_id);
CREATE INDEX idx_order_item_order_id ON order_item (order_id);
CREATE INDEX idx_order_item_product_id ON order_item (product_id);
```

**What changed:**
- `zip_code` table eliminates the transitive dependency (city/state → zip)
- `customer` table extracted as its own entity with surrogate key
- `product` table uses surrogate key instead of natural key
- `order_item` stores `unit_price` (price at time of order, deliberate denormalization)
- All foreign keys have indexes
- Named constraints throughout
- `CHECK` constraints for business rules
- Audit columns added

---

## Summary of Changes

| Stage | Tables | Key Improvements |
|-------|--------|-----------------|
| Unnormalized | 1 | Starting point — all data in one table |
| 1NF | 1 | Eliminated repeating groups, added composite PK |
| 2NF | 3 | Eliminated partial dependencies, split by dependency |
| 3NF | 5 | Eliminated transitive dependencies, extracted entities |

---

## Example 2: Employee Department System

### Unnormalized

```sql
CREATE TABLE employee_data (
    emp_id INT,
    emp_name VARCHAR(100),
    dept_name VARCHAR(100),
    dept_location VARCHAR(100),
    dept_manager VARCHAR(100),
    skill1 VARCHAR(50),
    skill2 VARCHAR(50),
    skill3 VARCHAR(50)
);
```

### After 1NF — Eliminate Repeating Groups

```sql
CREATE TABLE employee_skill (
    emp_id INT,
    emp_name VARCHAR(100),
    dept_name VARCHAR(100),
    dept_location VARCHAR(100),
    dept_manager VARCHAR(100),
    skill VARCHAR(50),
    PRIMARY KEY (emp_id, skill)
);
```

### After 2NF — Eliminate Partial Dependencies

```sql
CREATE TABLE employee (
    emp_id INT PRIMARY KEY,
    emp_name VARCHAR(100) NOT NULL,
    dept_name VARCHAR(100) NOT NULL
);

-- dept_location and dept_manager depend on dept_name, handled in 3NF

CREATE TABLE employee_skill (
    emp_id INT NOT NULL,
    skill VARCHAR(50) NOT NULL,
    PRIMARY KEY (emp_id, skill),
    FOREIGN KEY (emp_id) REFERENCES employee (emp_id)
);
```

### After 3NF — Eliminate Transitive Dependencies

```sql
CREATE TABLE department (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    manager_id BIGINT,

    CONSTRAINT uq_department_name UNIQUE (name)
);

CREATE TABLE employee (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department_id BIGINT NOT NULL,

    CONSTRAINT fk_employee_department FOREIGN KEY (department_id)
        REFERENCES department (id) ON DELETE RESTRICT
);

-- Add manager FK after employee exists
ALTER TABLE department
    ADD CONSTRAINT fk_department_manager FOREIGN KEY (manager_id)
        REFERENCES employee (id) ON DELETE SET NULL;

CREATE TABLE skill (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    CONSTRAINT uq_skill_name UNIQUE (name)
);

CREATE TABLE employee_skill (
    employee_id BIGINT NOT NULL,
    skill_id INT NOT NULL,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate',
    PRIMARY KEY (employee_id, skill_id),
    CONSTRAINT fk_employee_skill_employee FOREIGN KEY (employee_id)
        REFERENCES employee (id) ON DELETE CASCADE,
    CONSTRAINT fk_employee_skill_skill FOREIGN KEY (skill_id)
        REFERENCES skill (id) ON DELETE CASCADE
);

CREATE INDEX idx_employee_department_id ON employee (department_id);
CREATE INDEX idx_employee_skill_skill_id ON employee_skill (skill_id);
```

**Key improvements in 3NF:**
- `department` extracted — `location` and `manager` no longer transitively depend on `emp_id`
- `skill` extracted into lookup table — enables referential integrity and metadata
- `employee_skill` junction table with proficiency level
- Surrogate keys replace natural keys
- Named constraints and indexes on all foreign keys
