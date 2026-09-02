-- ============================================================
-- SRMS - Smart Revenue Management System
-- Database Schema (Phase 3) - MySQL 8.0+
-- Engine: InnoDB, Charset: utf8mb4
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. AUTH & USERS
-- ------------------------------------------------------------

CREATE TABLE roles (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,           -- admin, manager, staff
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id     INT UNSIGNED NOT NULL,
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    status      ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    INDEX idx_users_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 2. CATALOG (Category / Brand / Supplier / Product)
-- ------------------------------------------------------------

CREATE TABLE categories (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id   INT UNSIGNED NULL,
    name        VARCHAR(150) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_categories_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE brands (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE suppliers (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    contact_info VARCHAR(255) NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id     INT UNSIGNED NOT NULL,
    brand_id        INT UNSIGNED NULL,
    supplier_id     INT UNSIGNED NULL,
    name            VARCHAR(200) NOT NULL,
    sku             VARCHAR(64) NOT NULL UNIQUE,
    cost_price      DECIMAL(15,2) NOT NULL DEFAULT 0,      -- Giá vốn
    base_price      DECIMAL(15,2) NOT NULL DEFAULT 0,      -- Giá niêm yết
    current_price   DECIMAL(15,2) NOT NULL DEFAULT 0,      -- Giá bán hiện tại
    stock_quantity  INT NOT NULL DEFAULT 0,
    reorder_level   INT NOT NULL DEFAULT 10,
    status          ENUM('Active','Inactive','Out of Stock') NOT NULL DEFAULT 'Active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_products_brand    FOREIGN KEY (brand_id)    REFERENCES brands(id)     ON DELETE SET NULL,
    CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)  ON DELETE SET NULL,
    CONSTRAINT chk_products_price CHECK (current_price >= 0 AND cost_price >= 0),
    INDEX idx_products_category (category_id),
    INDEX idx_products_brand (brand_id),
    INDEX idx_products_supplier (supplier_id),
    INDEX idx_products_status (status),
    INDEX idx_products_stock (stock_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE product_images (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id  INT UNSIGNED NOT NULL,
    image_url   VARCHAR(500) NOT NULL,
    is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_images_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 3. CUSTOMERS & RFM SEGMENTATION
-- ------------------------------------------------------------

CREATE TABLE customers (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    email               VARCHAR(150) NULL UNIQUE,
    phone               VARCHAR(30) NULL,
    address             VARCHAR(500) NULL,
    total_spending      DECIMAL(18,2) NOT NULL DEFAULT 0,   -- Monetary
    total_orders        INT NOT NULL DEFAULT 0,             -- Frequency
    last_purchase_date  DATETIME NULL,                      -- Recency
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customers_spending (total_spending),
    INDEX idx_customers_last_purchase (last_purchase_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Snapshot hiện tại của phân tích RFM (được cronjob tính lại định kỳ)
CREATE TABLE customer_segments (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id   INT UNSIGNED NOT NULL UNIQUE,
    r_score       TINYINT UNSIGNED NOT NULL,   -- 1-5
    f_score       TINYINT UNSIGNED NOT NULL,   -- 1-5
    m_score       TINYINT UNSIGNED NOT NULL,   -- 1-5
    segment_name  VARCHAR(50) NOT NULL,        -- Champions, Loyal, At Risk, Lost...
    is_vip        BOOLEAN NOT NULL DEFAULT FALSE, -- suy ra từ segment_name, KHÔNG tính rule riêng
    calculated_at DATETIME NOT NULL,
    CONSTRAINT fk_segments_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_segments_name (segment_name),
    INDEX idx_segments_vip (is_vip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 4. INVENTORY & PRICE HISTORY
-- ------------------------------------------------------------

CREATE TABLE inventory_transactions (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id      INT UNSIGNED NOT NULL,
    type            ENUM('IN','OUT','ADJUSTMENT') NOT NULL,
    quantity        INT NOT NULL,
    reference_type  ENUM('order','purchase','adjustment') NOT NULL DEFAULT 'adjustment', -- FIX #3
    reference_id    INT UNSIGNED NULL,        -- order_id hoặc purchase order id tùy reference_type
    note            VARCHAR(255) NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inv_txn_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_inv_txn_product (product_id),
    INDEX idx_inv_txn_type (type),
    INDEX idx_inv_txn_reference (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE price_history (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id  INT UNSIGNED NOT NULL,
    old_price   DECIMAL(15,2) NOT NULL,
    new_price   DECIMAL(15,2) NOT NULL,
    changed_by  INT UNSIGNED NULL,             -- users.id, NULL nếu do hệ thống tự đổi
    reason      VARCHAR(255) NULL,             -- vd: "Recommendation applied", "Manual by manager"
    changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_price_history_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_price_history_user    FOREIGN KEY (changed_by) REFERENCES users(id)    ON DELETE SET NULL,
    INDEX idx_price_history_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 5. PROMOTIONS
-- ------------------------------------------------------------

CREATE TABLE promotions (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    discount_type    ENUM('PERCENT','FIXED') NOT NULL,
    discount_value   DECIMAL(15,2) NOT NULL,
    start_date       DATETIME NOT NULL,
    end_date         DATETIME NOT NULL,
    min_order_value  DECIMAL(15,2) NOT NULL DEFAULT 0,
    status           ENUM('Active','Expired','Draft') NOT NULL DEFAULT 'Draft',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_promotions_dates CHECK (end_date >= start_date),
    INDEX idx_promotions_status (status),
    INDEX idx_promotions_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE promotion_products (
    promotion_id  INT UNSIGNED NOT NULL,
    product_id    INT UNSIGNED NOT NULL,
    PRIMARY KEY (promotion_id, product_id),
    CONSTRAINT fk_promo_products_promotion FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    CONSTRAINT fk_promo_products_product   FOREIGN KEY (product_id)   REFERENCES products(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 6. ORDERS & PAYMENTS
-- ------------------------------------------------------------

CREATE TABLE orders (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id     INT UNSIGNED NOT NULL,
    staff_id        INT UNSIGNED NULL,          -- users.id, người tạo/xử lý đơn
    total_amount    DECIMAL(18,2) NOT NULL DEFAULT 0,   -- tổng trước giảm giá
    discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0,   -- tổng giảm giá (= SUM order_details.discount_amount)
    final_amount    DECIMAL(18,2) NOT NULL DEFAULT 0,   -- khách phải trả
    status          ENUM('Pending','Confirmed','Processing','Completed','Cancelled','Refunded')
                        NOT NULL DEFAULT 'Pending',
    order_date      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_staff    FOREIGN KEY (staff_id)    REFERENCES users(id)     ON DELETE SET NULL,
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Chi tiết đơn hàng: "đóng băng" giá + chi phí + promotion tại thời điểm mua
CREATE TABLE order_details (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        INT UNSIGNED NOT NULL,
    product_id      INT UNSIGNED NOT NULL,
    promotion_id    INT UNSIGNED NULL,          -- FIX #1: link tới promotion đã áp dụng (nếu có)
    quantity        INT NOT NULL,
    unit_price      DECIMAL(15,2) NOT NULL,     -- giá bán lúc mua (trước discount dòng này)
    cost_price      DECIMAL(15,2) NOT NULL,     -- giá vốn lúc mua
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0, -- số tiền giảm giá áp dụng cho dòng này
    total           DECIMAL(18,2) NOT NULL,     -- (unit_price * quantity) - discount_amount
    profit          DECIMAL(18,2) NOT NULL,     -- total - (cost_price * quantity)
    CONSTRAINT fk_order_details_order     FOREIGN KEY (order_id)     REFERENCES orders(id)     ON DELETE CASCADE,
    CONSTRAINT fk_order_details_product   FOREIGN KEY (product_id)   REFERENCES products(id)   ON DELETE RESTRICT,
    CONSTRAINT fk_order_details_promotion FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE SET NULL,
    INDEX idx_order_details_order (order_id),
    INDEX idx_order_details_product (product_id),
    INDEX idx_order_details_promotion (promotion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        INT UNSIGNED NOT NULL,
    payment_method  VARCHAR(50) NOT NULL,       -- Cash, Bank Transfer, COD, Momo...
    amount          DECIMAL(18,2) NOT NULL,
    status          ENUM('Unpaid','Paid','Refunded') NOT NULL DEFAULT 'Unpaid',
    paid_at         DATETIME NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_payments_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 7. ANALYTICS / RECOMMENDATION / FORECAST
-- ------------------------------------------------------------

-- Bảng aggregate chạy cronjob hằng ngày để Dashboard load nhanh
CREATE TABLE revenue_daily (
    `date`        DATE PRIMARY KEY,
    total_revenue DECIMAL(18,2) NOT NULL DEFAULT 0,
    total_profit  DECIMAL(18,2) NOT NULL DEFAULT 0,
    total_orders  INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE recommendations (
    id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type               ENUM('Pricing','Promotion','Inventory','Customer') NOT NULL,
    target_type        ENUM('product','customer') NOT NULL,   -- FIX #2: discriminator tường minh
    target_id          INT UNSIGNED NOT NULL,                 -- products.id hoặc customers.id tùy target_type
    reason             TEXT NOT NULL,                         -- vd: "Stock high, sales low"
    recommended_action TEXT NOT NULL,                         -- vd: "Reduce price by 10%"
    status             ENUM('Pending','Applied','Rejected') NOT NULL DEFAULT 'Pending',
    generated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at         TIMESTAMP NULL,
    INDEX idx_reco_type (type),
    INDEX idx_reco_target (target_type, target_id),
    INDEX idx_reco_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng optional cho Phase 10 (Forecasting) - tạo sẵn để không phải sửa schema giữa chừng
CREATE TABLE forecast_results (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    forecast_date     DATE NOT NULL,             -- ngày chạy dự báo
    period_type       ENUM('7_DAYS','30_DAYS','MONTH') NOT NULL,
    predicted_revenue DECIMAL(18,2) NOT NULL,
    model_used        VARCHAR(50) NOT NULL DEFAULT 'MOVING_AVERAGE', -- MOVING_AVERAGE | LINEAR_REGRESSION
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_forecast_date (forecast_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
