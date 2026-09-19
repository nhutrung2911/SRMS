# SRMS — Smart Revenue Management System

> An intelligent revenue management and optimization platform for SMEs and E-commerce, transforming raw transactional data into actionable business recommendations for decision-makers.

![Status](https://img.shields.io/badge/status-active%20development-green)
![Backend](https://img.shields.io/badge/backend-Laravel%2011-red)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-blue)
![Database](https://img.shields.io/badge/database-MySQL%208.0%2B-orange)
![Security](https://img.shields.io/badge/auth-Sanctum%20RBAC-purple)

---

## Table of Contents

- [Problem Statement & Objectives](#problem-statement--objectives)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Installation & Getting Started](#installation--getting-started)
- [Directory Structure](#directory-structure)
- [Core Business Rules](#core-business-rules)
- [How SRMS Differs from Traditional BI Tools](#how-srms-differs-from-traditional-bi-tools)
- [Screenshots](#screenshots)
- [Author](#author)

---

## Problem Statement & Objectives

Small and medium-sized retail and e-commerce businesses generate vast quantities of daily sales data but struggle to extract actionable value from it:
* They cannot pinpoint which products genuinely drive net profit versus those generating hollow revenue.
* They lack automated mechanisms to identify and retain high-value customer segments before they churn.
* Promotional campaigns are often run on intuition rather than verified financial ROI.
* Stagnant inventory ("dead stock") ties up capital while fast-selling items unexpectedly run out of stock.

**SRMS** was architected to solve this end-to-end operational bottleneck through a continuous, closed-loop decision cycle:

```
Sales Transactions → Real-time Analytics → AI Insights → Actionable Recommendations → Manager Decision → Post-Action Impact Measurement
```

> **Key Distinction:** Unlike passive reporting dashboards, SRMS proactively detects operational risks, formulates concrete business recommendations, executes actions with a single click, and continuously tracks post-action financial impact.

---

## Key Features

### 📊 Executive Revenue Dashboard
High-level financial KPIs (Total Revenue, Gross Profit, Profit Margin %, Total Orders, Average Order Value) paired with period-over-period growth comparisons (Today, This Month, This Year) and dynamic revenue trend charts across customizable timeframes (7, 30, and 90 days).

### 📈 Multi-Dimensional Revenue Analytics
Comprehensive performance breakdown across Product Categories, Customer Segments, and historical monthly trends (`%Y-%m`). Identifies Top 8 revenue-generating products without relying on fabricated dimensions or external data sources.

### 🔮 Revenue Forecasting & Confidence Intervals
Projects future sales velocity across 7-day, 30-day, and next-month horizons using a Simple Moving Average (SMA) combined with sample standard deviation ($\sigma$, with $N < 2$ safety guards) to construct an authentic 90% confidence interval ($1.645\sigma$). Employs a robust 2-period baseline comparison to calculate authentic revenue momentum and avoid tautological zero-trends.

### 🧠 AI Insights & Recommendation Engine
Synthesizes real-time database state across inventory velocity, profit margins, at-risk customer segments, and active promotional campaigns into prioritized, evidence-backed insights. Managers can review quantitative evidence and either **Apply** an automated action (e.g., repricing a slow-moving item or generating a targeted retention voucher) or **Dismiss** it with an audit trail.

### 👥 Customer Analytics & RFM Segmentation
Automatically clusters customer behavior through algorithmic RFM analysis (Recency, Frequency, Monetary) into distinct operational segments: *Champions, Loyal, Potential Loyalists, Recent, At Risk,* and *Lost*. Includes dedicated customer profile pages displaying order histories, real spending trajectories, and VIP designations derived strictly from database records.

### 🛍️ Order Management with ACID Financial Guarantees
Complete transaction lifecycle (`Pending` $\rightarrow$ `Completed` $\rightarrow$ `Refunded` / `Cancelled`) wrapped in strict database transactions. Automatically calculates promotion discounts, prevents staff from tampering with fixed unit prices, atomically decrements/restores inventory levels, and aggregates customer lifetime spending.

### 📦 Inventory Velocity & Stock Optimization
Monitors warehouse quantities against calculated sales velocities, categorizing SKU risks (Critical, High, Medium, Low) based on estimated run-out horizons rather than naive unit counts. Supports audit-logged inventory adjustments (IN, OUT, ADJUSTMENT) with complete user attribution.

### 🏷️ Promotion Performance & Financial Ratio
Enables creation and lifecycle control of promotional campaigns. Evaluates real financial efficacy using Revenue-to-Discount Ratio and Pre/During/Post event analysis to prevent unprofitable discount leaks.

### 🎯 Post-Action Impact Analysis
Measures the real-world outcome of applied recommendations by benchmarking daily revenue and profit before versus after execution dates, closing the operational feedback loop.

---

## System Architecture

```
┌───────────────────────────┐         REST API (JSON)         ┌───────────────────────────┐
│         Frontend          │  ────────────────────────────►  │          Backend          │
│    React 18 + Vite + TS   │  ◄────────────────────────────  │     Laravel 11 Framework  │
│        (port 5173)        │      Bearer Token (Sanctum)     │        (port 8000)        │
└───────────────────────────┘                                 └─────────────┬─────────────┘
                                                                            │
                                                                            ▼
                                                               ┌───────────────────────────┐
                                                               │       MySQL 8.0+ DB       │
                                                               │   (18 Relational Tables)  │
                                                               └───────────────────────────┘
```

---

## Tech Stack

| Layer | Technologies & Libraries |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts |
| **Backend** | Laravel 11 (RESTful Architecture), PHP 8.3 |
| **Authentication & RBAC** | Laravel Sanctum (Token-based Auth with database-enforced role gates) |
| **Database** | MySQL 8.0+ (InnoDB, strict foreign keys, composite indexes, pre-aggregated tables) |
| **Development Environment** | Laragon / Docker (PHP 8.3, MySQL 8.0, Node.js 18+) |

---

## Role-Based Access Control (RBAC)

The system enforces strict multi-tier permissions across both frontend UI elements and backend controllers:

| Role | Permitted Actions & Capabilities |
|---|---|
| **Admin** | Unrestricted access: User administration, system settings, product catalog, orders, inventory audits, pricing, promotions, and full executive analytics. |
| **Manager** | Strategic operations: Access Dashboards, Revenue/Product/Customer Analytics, Revenue Forecasts, and AI Insights. Can execute AI recommendations, adjust prices, and launch promotions. |
| **Staff** | Sales & checkout: Register new customers, create orders with auto-applied promotions, update orders to Completed. **Restricted:** Cannot view confidential analytics, cannot edit product unit prices, and cannot cancel or refund orders (enforced by backend 403 Forbidden). |

---

## Installation & Getting Started

### Prerequisites
- **PHP** >= 8.3 with extensions (`pdo_mysql`, `mbstring`, `openssl`, `bcmath`)
- **Composer** >= 2.0
- **Node.js** >= 18 and **npm**
- **MySQL** >= 8.0

### 1. Backend Setup (Laravel)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate

# Configure your database credentials (DB_DATABASE, DB_USERNAME, DB_PASSWORD) in .env
php artisan migrate --seed
php artisan serve
```
*Backend server will start listening at `http://127.0.0.1:8000`.*

### 2. Frontend Setup (React + Vite)

```bash
cd project
npm install
npm run dev
```
*Frontend application will start listening at `http://localhost:5173`.*

### 3. Default Seeded Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@srms.com` | `password` |
| **Manager** | `manager@srms.com` | `password` |
| **Staff** | `staff1@srms.com` | `password` |

---

## Directory Structure

```
SRMS/
├── backend/                         # Laravel REST API
│   ├── app/
│   │   ├── Http/Controllers/        # Controllers (Order, Product, Inventory, Forecast, Analytics, etc.)
│   │   └── Models/                  # Eloquent models
│   ├── database/
│   │   ├── migrations/              # Database schema migrations
│   │   └── seeders/                 # Realistic historical e-commerce seeders
│   └── routes/
│       └── api.php                  # Protected REST API endpoints
├── project/                         # React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── components/              # UI design system (Cards, Charts, Modals, Badges, Layout)
│   │   ├── pages/                   # Application views (Dashboard, Forecast, Analytics, Orders, etc.)
│   │   ├── services/                # Axios API client & token interceptors
│   │   └── types/                   # TypeScript interfaces & domain types
└── schema.sql                       # Complete MySQL schema reference
```

---

## Core Business Rules

- **BR01 — Revenue Recognition:** Only orders marked as `Completed` are recognized in financial revenue and profit metrics.
- **BR02 — Atomicity & Stock Deduction:** When an order transitions to `Completed`, product inventory is decremented atomically within a database transaction, and an `inventory_transactions` audit record is created.
- **BR03 — Order Refund Lifecycle:** Refunding an order atomically restores warehouse quantities, reverses customer lifetime spending, and adjusts daily financial totals.
- **BR04 — Margin Formulation:** `Gross Profit = Selling Price - Cost Price - Discount Amount`. `Profit Margin = (Profit / Selling Price) × 100%`, evaluated against current selling prices.
- **BR05 — Price Floor Enforcement:** Selling prices cannot be set below unit cost (`current_price >= cost_price`), enforced both during manual management edits and automated recommendation execution.
- **BR06 — Single Source of Truth for Segments:** Customer classifications and VIP status are derived directly from the `customer_segments` RFM scoring table, eliminating redundant or conflicting business rules.
- **BR07 — Defensive Growth Calculation:** Trend and growth percentage calculations verify that baseline figures strictly exceed zero (`previous > 0`), returning `null` (displayed as `N/A`) when historical data is insufficient to prevent zero-division and `NaN` errors.

---

## How SRMS Differs from Traditional BI Tools

Standard Business Intelligence platforms (e.g., Power BI, Tableau, Metabase) excel at aggregating historical data and rendering visualizations, but they remain **passive reporting layers**:
1. **Passive vs. Proactive:** BI tools require analysts to manually spot anomalies. SRMS actively evaluates operational rules and pushes prioritized, contextual recommendations directly to decision-makers.
2. **Disconnected vs. Closed-Loop:** When an issue is identified in a typical BI tool, the manager must navigate to a separate ERP or eCommerce backoffice to take action. Because SRMS manages the transactional database, a recommendation (such as liquidating dead stock or adjusting a price) can be executed with a single click and tracked over time.

---

## Screenshots

![Dashboard Overview](docs/images/dashboard.png)

![Product Analytics](docs/images/product_analytics.png)

![AI Recommendations](docs/images/ai_recommendations.png)

---

## Author

**Nguyen Nhu Trung**  
*Developed as a comprehensive Web Engineering Capstone Project and professional portfolio demonstrating full-stack engineering, business domain modeling, database design, and business intelligence analysis.*
