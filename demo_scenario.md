# SRMS — Live Demonstration Scenario & Defense Guide
**Smart Retail Management System (Hệ Thống Quản Lý Bán Lẻ Thông Minh)**

---

## 1. Executive Summary & Architecture Overview

### 1.1 Technology Stack
- **Backend**: Laravel 11 REST API, PHP 8.3, Laravel Sanctum (Token-based Authentication), Eloquent ORM & Query Builder with ACID Transactions.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Database**: MySQL 8.0 (InnoDB engine, strict foreign key constraints, indexed transactional tables).
- **Automated Test Suite**: PHPUnit 11 with 23 Feature Tests (427 assertions, 100% passing) utilizing `DatabaseTransactions` to ensure zero state pollution.

### 1.2 Core Architectural Principles
1. **Single Source of Truth (SSOT)**: All KPI cards, charts, RFM customer scores, and AI insights are derived directly from transactional tables (`orders`, `order_details`, `inventory_transactions`) and deterministic rollup tables (`revenue_daily`, `customer_segments`). No numbers are fabricated or out-of-sync.
2. **Defensive Financial & Inventory Integrity**: Strict ACID database transactions enforce atomic stock deductions (`lockForUpdate`), prevent overselling, maintain immutable audit logs, and protect promotions from hard-deletion when referenced by historical orders.
3. **Pragmatic, Explainable Intelligence**: Rejection of "AI for hype". Statistical models (SMA with 90% Confidence Interval, RFM segmentation, dynamic inventory velocity) provide actionable, explainable decision boundaries tailored for retail managers.

---

## 2. Live Demo Script (5–7 Minutes)

### Act 1: Staff Persona — Point-of-Sale & Client Onboarding (2 minutes)
> **Goal**: Demonstrate front-desk workflow, client registration, price-tampering defense, and RBAC boundary enforcement.

1. **Login as Staff**:
   - URL: `http://localhost:5173/login`
   - Credentials: `staff1@srms.com` / `password`
   - **Observer Note**: Staff interface is streamlined for daily operations. High-level financial reporting and administrative settings are restricted.

2. **Walk-in Customer Registration**:
   - Navigate to **Customers** (`/customers`).
   - Click **Add Customer**.
   - Input: Name: `Tran Van An`, Phone: `0912345678`, Email: `an.tran@example.com`, Address: `123 Nguyen Hue, Da Nang`.
   - Click **Save Customer**.
   - **Technical Highlight**: System issues `POST /api/customers` (HTTP 201). Customer is initialized with `total_spending = 0`, `total_orders = 0`, and receives an initial segment snapshot (`Recent`, $R=5, F=1, M=1$). Staff is explicitly authorized to register walk-ins directly at checkout.

3. **Order Creation with Price Locking & Promotion**:
   - Navigate to **Orders** (`/orders`) -> Click **Create Order**.
   - Select Customer `Tran Van An`.
   - Add Product `Product 1` (SKU-0001) with Quantity: `2`.
   - Select an active Promotion (e.g., 10% Discount).
   - **Technical Highlight**: Unit price is automatically locked from `products.current_price` on the server. Client-side price tampering is completely blocked. Promotion discount is verified against start/end dates.
   - Click **Submit Order**. Order is created in **`Pending`** status.
   - **Technical Highlight**: Stock quantity is **not** decremented prematurely in `Pending` status.

4. **Order Completion (Atomic Inventory & Financial Commit)**:
   - Click on the newly created order -> Update status to **`Completed`**.
   - **Technical Highlight**: Under a single atomic transaction:
     - Product stock is decremented.
     - An `inventory_transactions` row (`type = OUT`, `reference_type = order`) is permanently recorded.
     - Customer metrics are incremented (`total_spending`, `total_orders`, `last_purchase_date`).
     - `revenue_daily` for today is updated.

5. **RBAC Boundary Demonstration (Staff Rejection)**:
   - While still on the completed order, attempt to change status to **`Refunded`** or **`Cancelled`**.
   - System returns **HTTP 403 Forbidden**: *"Forbidden. Only Admin or Manager can cancel or refund orders."*
   - Navigate directly to `/analytics/revenue`: Access is denied (HTTP 403).
   - **Key Takeaway**: Financial reversals and store profitability analytics are strictly walled off from operational staff.

---

### Act 2: Manager Persona — Analytics, AI Insights & 1-Click Action Loop (3 minutes)
> **Goal**: Demonstrate decision intelligence, explainable forecasting, and immediate closing of the decision-to-action loop.

1. **Login as Manager**:
   - Logout and login with: `manager@srms.com` / `password`.
   - Role badge updates to **Manager**.

2. **Executive Dashboard**:
   - View top summary cards: **Total Revenue**, **Total Orders**, **Profit Margin**, and **Active Customers**.
   - Observe 2-period growth indicators (comparing against the preceding equivalent time horizon).

3. **Multi-Dimensional Revenue Analytics (`/analytics/revenue`)**:
   - View the 5 Core Financial KPIs: Total Revenue, Gross Profit, Profit Margin, Orders, and Revenue Acceleration.
   - Inspect **Monthly Trend**: Aggregated by Year-Month (`%Y-%m`) to eliminate multi-year collision.
   - Inspect **Category Distribution** and **Customer Segment Revenue Contribution**.
   - **Deliberate Design Choice**: No synthetic "Sales Channel" dimension is shown. Because the schema does not track POS vs Online channels, omitting this maintains absolute data ethics and honesty.

4. **Revenue Forecast with 90% Confidence Interval (`/forecast`)**:
   - Switch between horizon tabs: **7 Days**, **30 Days**, and **Next Month**.
   - Observe the smooth transition from historical revenue points into the forecast horizon.
   - Explain the shaded band: Calculated via Sample Standard Deviation ($\sigma$) with $Z_{0.90} = 1.645$ ($[\text{SMA} - 1.645\sigma, \text{SMA} + 1.645\sigma]$).
   - Point out the trend percentage: Uses a 2-period historical comparison ($T-60$ to $T-31$ vs $T-30$ to $T-1$) to provide a meaningful indicator of operational momentum.

5. **AI Insights Engine (4 Strategic Pillars)**:
   - Scroll to **AI Operational Insights**:
     - **Inventory Risk**: Detects items with stock below reorder level or $\le 7$ days of inventory remaining based on 30-day velocity.
     - **Pricing Opportunity**: Detects high-stock, low-velocity products with healthy margin headroom ($\ge 18\%$) suitable for targeted markdown.
     - **Customer At-Risk Segment**: Accurately matches customer count and historical revenue at risk from the RFM segmentation engine.
     - **Promotion Monitoring**: Tracks running campaigns to avoid margin erosion.
   - Click **"View Product"** on an insight: Seamlessly opens the product detail page with active filters.
   - Click **"Take Action"**: Redirects directly to **AI Recommendations**.

6. **1-Click Action Execution**:
   - On the AI Recommendations page, review the recommendation card.
   - Click **"Apply"**: The system automatically executes the suggested promotion or price adjustment within a transaction.
   - Post-action impact is recorded, closing the feedback loop between analytical insight and business execution.

---

### Act 3: Admin Persona — Inventory Audits, Refund Governance & ACID Resilience (2 minutes)
> **Goal**: Prove auditability, soft-delete governance, and transactional integrity during financial reversals.

1. **Login as Admin**:
   - Logout and login with: `admin@srms.com` / `password`.

2. **Inventory Audit Trail (`/inventory`)**:
   - Inspect product stock levels, status badges, and reorder alerts.
   - Open inventory transaction history: Every single item deduction or addition is traceable to a specific user, order ID, and timestamp (`type = IN / OUT / ADJUSTMENT`).

3. **Promotion Soft-Delete Governance**:
   - Navigate to **Promotions** (`/promotions`).
   - Attempt to delete a promotion that was previously applied to historical orders.
   - System rejects deletion with **HTTP 400**: *"Cannot delete promotion because it has associated orders. Please change its status to Expired instead."*
   - **Key Takeaway**: Preserves historical financial audit trails and ensures that revenue-to-discount calculations never reference orphaned foreign keys.

4. **Historical Order Refund & Full ACID Reversion**:
   - Select an existing completed order situated on a **past date** (e.g., `2026-08-15`).
   - Update order status to **`Refunded`**.
   - **Verify ACID Atomicity**:
     - Product stock is automatically returned to inventory ($+Q$).
     - An `inventory_transactions` row (`type = IN`, note: "Order refunded - Restock") is created.
     - Customer `total_spending` is decremented by the order amount.
     - The historical `revenue_daily` row for `2026-08-15` has its revenue, profit, and order count decremented.
     - Zero data corruption or orphan records remain.

---

## 3. Defense Q&A Cheat Sheet (Bảo Vệ Đồ Án)

### Q1: Tại sao hệ thống dùng Simple Moving Average (SMA) kèm Confidence Interval thay vì các mô hình phức tạp hơn như ARIMA, SARIMA, LSTM hay Deep Learning?
**Trả lời (Trọng tâm Thống kê & Thực tế Kỹ thuật):**
> "Đây là **quyết định thiết kế có chủ đích** xuất phát từ nguyên tắc nền tảng của dự án: *Không áp dụng công nghệ chỉ để tạo cảm giác hiện đại (no AI for hype)*, mà phải dựa trên cơ sở thống kê toán học vững chắc.
>
> 1. **Vấn đề kích thước mẫu (Sample Size) & Nguy cơ Overfitting**:
>    Trong môi trường bán lẻ thực tế ở giai đoạn triển khai ban đầu (hoặc dữ liệu lịch sử cửa hàng trong 30–90 ngày), chúng ta chỉ có từ 30 đến 90 điểm dữ liệu chuỗi thời gian.
>    - Các mô hình phức tạp như **ARIMA/SARIMA** yêu cầu tối thiểu 50–100+ chu kỳ dữ liệu để ước lượng tin cậy các tham số $(p, d, q) \times (P, D, Q)_s$, kiểm định tính dừng (stationarity), và khử nhiễu tự tương quan (ACF/PACF). Khi áp dụng vào chuỗi dữ liệu ngắn và nhiều biến động đột xuất của cửa hàng bán lẻ, ARIMA có xu hướng **overfit nghiêm trọng**, tạo ra các cận dự báo dao động phi thực tế.
>    - Các mạng nơ-ron như **LSTM / Deep Learning** đòi hỏi hàng chục ngàn mẫu để huấn luyện trọng số mà không bị hiện tượng học vẹt (high variance). Với 30–90 điểm, LSTM chắc chắn overfit và kém tin cậy hơn một phép tính trung bình giản đơn.
>
> 2. **Tính vững chắc (Robustness) & Khả năng giải thích (Interpretability)**:
>    - **SMA(30)** đóng vai trò là một ước lượng không chệch (unbiased estimator) cho mức cầu trung bình ngắn hạn trong điều kiện dừng cục bộ.
>    - Kết hợp với **Độ lệch chuẩn mẫu ($\sigma$)** và phân phối chuẩn với hệ số tin cậy 90% ($Z_{0.90} = 1.645$), hệ thống cung cấp **dải biên an toàn có thể giải thích được**: Cận dưới là kịch bản thận trọng (Worst-case) giúp quản trị dòng tiền, và cận trên là kịch bản lạc quan (Best-case) giúp chuẩn bị tồn kho an toàn.
>    - Mã nguồn được bảo vệ bằng kiểm tra $N < 2$ (gán $\sigma = 0$) để loại bỏ lỗi chia cho 0 khi dữ liệu quá ít.
>
> Tóm lại: Đây là sự lựa chọn tối ưu về mặt thống kê và vận hành kinh doanh, mang lại độ tin cậy cao nhất cho người quản lý cửa hàng."

---

### Q2: Làm thế nào hệ thống đảm bảo tính nhất quán dữ liệu (Single Source of Truth) giữa Dashboard, Customer Analytics và Customer Detail?
**Trả lời:**
> "Toàn bộ hệ thống tuân thủ nghiêm ngặt nguyên lý **Single Source of Truth**:
> 1. Không bao giờ lưu trữ số liệu tổng hợp trùng lặp hoặc tính toán lại bằng các công thức dị biệt ở các trang khác nhau.
> 2. Chỉ số chi tiêu (`total_spent`), tần suất mua (`total_orders`), và ngày mua cuối (`last_purchase_date`) trên trang Chi tiết Khách hàng (`CustomerDetailPage`) được lấy trực tiếp từ bảng `customers`.
> 3. Điểm số RFM ($R, F, M$), phân hạng phân khúc (`segment_name`), và cờ VIP được đọc trực tiếp từ bảng `customer_segments` — cùng một bảng dữ liệu mà Customer Analytics và AI Insights sử dụng.
> 4. Do đó, bất kỳ hành động bán hàng hay hoàn tiền nào làm thay đổi bảng `customers` đều ngay lập tức phản ánh đồng bộ 100% trên toàn bộ các màn hình hiển thị."

---

### Q3: Cơ chế nào đảm bảo tính toàn vẹn dữ liệu (ACID) khi xảy ra tranh chấp đơn hàng hoặc thiếu hụt tồn kho?
**Trả lời:**
> "Hệ thống sử dụng **Database Transactions** kết hợp cơ chế khóa bi quan (**Pessimistic Locking**):
> 1. Khi cập nhật đơn hàng sang trạng thái `Completed`, hệ thống mở transaction (`DB::beginTransaction()`) và thực hiện `DB::table('products')->where('id', $item->product_id)->lockForUpdate()`.
> 2. Nếu `stock_quantity < requested_quantity`, hệ thống lập tức ném ra Exception. Toàn bộ transaction bị `DB::rollBack()` ngay lập tức: tồn kho không bị trừ, lịch sử giao dịch không bị ghi nhận, chi tiêu của khách hàng và doanh thu ngày hoàn toàn giữ nguyên, trả về lỗi HTTP 422.
> 3. Cơ chế này đã được chứng minh qua test case `test_order_completion_rolls_back_on_insufficient_stock` trong bộ kiểm thử tự động."

---

### Q4: Phân quyền RBAC (Role-Based Access Control) được tổ chức như thế nào và tại sao Nhân viên (Staff) được phép thêm/sửa khách hàng?
**Trả lời:**
> "Hệ thống phân chia 3 vai trò rõ ràng và được kiểm soát chặt chẽ ở tầng Backend (API Middleware và Policy):
> - **Staff**: Được tối ưu cho quy trình bán hàng tại quầy. Staff được **chủ động phân quyền** thêm mới và cập nhật thông tin khách hàng (`CustomerController::store`, `update`) vì trong nghiệp vụ thực tế, nhân viên thu ngân là người trực tiếp tiếp xúc và đăng ký thẻ thành viên cho khách hàng mới ngay khi thanh toán. Tuy nhiên, Staff bị cấm hoàn tiền/hủy đơn (`PUT /orders/{id}`) và không có quyền xem phân tích tài chính chuyên sâu (`/analytics/revenue`).
> - **Manager**: Có toàn quyền theo dõi báo cáo doanh thu đa chiều, dự báo nhu cầu, xem AI Insights và phê duyệt áp dụng khuyến mãi/giá bán (`AI Recommendations`).
> - **Admin**: Nắm quyền quản trị tối cao, quản lý danh mục sản phẩm, người dùng hệ thống, và thực hiện xóa/phê duyệt đặc quyền."

---

### Q5: Tại sao trong Báo cáo Doanh thu (Revenue Analytics) lại bỏ chiều Kênh Bán Hàng (Sales Channel)?
**Trả lời:**
> "Đây là quyết định tuân thủ **tính trung thực của dữ liệu (Data Integrity)**:
> 1. Trong lược đồ cơ sở dữ liệu hiện tại, bảng `orders` chỉ lưu vết giao dịch tại điểm bán cùng thông tin khách hàng và nhân viên, không có cột phân loại kênh bán hàng (như Online, POS, Marketplace).
> 2. Nếu chúng ta nhóm dữ liệu theo Channel bằng cách giả lập số liệu ngẫu nhiên ở controller, hệ thống sẽ sinh ra các số liệu ảo trông có vẻ đẹp nhưng hoàn toàn vô căn cứ và đánh lừa người quản lý.
> 3. Thay vào đó, hệ thống tập trung phân tích sâu vào các chiều dữ liệu thực có trong database: **Thời gian (theo `%Y-%m` tránh va chạm giữa các năm)**, **Danh mục Sản phẩm (Category)**, và **Phân khúc Khách hàng (Customer Segment)**."

---

### Q6: Bộ kiểm thử tự động (Automated Testing) được xây dựng như thế nào để đảm bảo chất lượng hệ thống?
**Trả lời:**
> "Hệ thống sở hữu bộ kiểm thử tự động toàn diện gồm **5 Test Suite (23 test cases, 427 assertions)** chạy trên môi trường MySQL thực tế:
> 1. `AuthAndRbacTest`: Kiểm tra xác thực Sanctum, chặn Staff (403), cho phép Manager/Admin, và xác nhận Staff/Manager/Admin đều thao tác được với Customer.
> 2. `OrderLifecycleAndAcidTest`: Kiểm tra vòng đời đơn hàng, khóa giá chống giả mạo, trừ kho nguyên tử, rollback khi hết hàng, và **hoàn tiền trên ngày quá khứ cụ thể** nhằm bảo vệ hệ thống khỏi lỗi hồi quy `revenue_daily`.
> 3. `PromotionLogicTest`: Kiểm tra công thức giảm giá phần trăm/cố định, cơ chế chống xóa khuyến mãi đã có đơn hàng, và phòng ngừa lỗi chia cho 0.
> 4. `ForecastAndInsightsTest`: Kiểm tra dải biên SMA 90% CI, trường hợp biên $N < 2$, và 4 trụ cột AI insights.
> 5. `CustomerAndRevenueAnalyticsTest`: Kiểm tra tính nhất quán Single Source of Truth, phân tích doanh thu 5 KPIs, và đảm bảo không xuất hiện chiều dữ liệu giả mạo.
>
> Tất cả các test đều dùng trait `DatabaseTransactions` — mỗi test case tự động rollback toàn bộ sau khi chạy xong, giữ nguyên vẹn dữ liệu mẫu mà không làm sai lệch cơ sở dữ liệu."
