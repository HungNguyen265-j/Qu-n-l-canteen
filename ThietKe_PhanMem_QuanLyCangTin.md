# Thiết kế phần mềm quản lý căng tin trường học

> Tài liệu thiết kế được xây dựng dựa trên:
> - Bản demo giao diện: thư mục `canteen demo` (`index.html`, `style.css`, `script.js`, `data.js`)
> - Đặc tả nghiệp vụ Chương 1: `Chuong1_QuanLyCangTin_BoSung_7NhomChucNang.pdf`

---

## 1. Tổng quan dự án

### 1.1. Mục tiêu
Xây dựng ứng dụng web số hóa toàn bộ quy trình vận hành căng tin trường học: xem thực đơn, đặt món theo khung giờ nhận món, thanh toán (Ví Canteen / QR ngân hàng / tiền mặt), chế biến và bàn giao món, quản lý kho nguyên liệu, tài chính, nhân sự và báo cáo.

### 1.2. Phạm vi
- **Trong phạm vi:** thực đơn và bán hàng, đơn hàng và nhà bếp, nguyên liệu/kho, giao dịch và báo cáo, tài khoản/phân quyền, ca làm việc.
- **Ngoài phạm vi (tích hợp):** cổng thanh toán/ngân hàng, email/SMS, máy in hóa đơn – được xem là điểm tích hợp, phụ thuộc môi trường triển khai.

### 1.3. Đối tượng người dùng
| Vai trò | Mô tả | Quyền chính |
|---|---|---|
| Khách hàng | Sinh viên, giảng viên, cán bộ | Đặt món, thanh toán, ví, vé tháng, lịch sử đơn, đánh giá |
| NV Phục vụ (thu ngân) | Quầy | Tiếp nhận/xác nhận đơn, giao món, hóa đơn, hoàn tiền |
| NV Bếp | Chế biến | Danh sách đơn, chế biến, cập nhật trạng thái, thực đơn, định lượng |
| NV Kho | Nguyên liệu | Nhập/xuất/kiểm kê, tồn kho, hạn sử dụng, nhà cung cấp, đơn mua |
| NV Kế toán | Tài chính | Giao dịch, doanh thu, chi phí, đối soát, báo cáo tài chính |
| Quản trị viên | Hệ thống | Tài khoản, vai trò, phân quyền, cấu hình, báo cáo tổng hợp |

---

## 2. Kiến trúc hệ thống

### 2.1. Kiến trúc tổng thể (3 tầng)
```
┌─────────────────────────────────────────────┐
│  Tầng trình bày (Frontend Web)              │
│  HTML/CSS/JS (demo) hoặc React/Vue          │
│  - Auth, Dashboard, Bán hàng, Bếp, Kho...   │
└────────────────────┬────────────────────────┘
                     │ HTTPS / REST JSON
┌────────────────────▼────────────────────────┐
│  Tầng nghiệp vụ (Backend API)               │
│  Node.js/Express hoặc ASP.NET Core           │
│  - Xác thực JWT, phân quyền RBAC            │
│  - Xử lý đơn hàng, kho, tài chính, ca làm │
└────────────────────┬────────────────────────┘
                     │ SQL
┌────────────────────▼────────────────────────┐
│  Tầng dữ liệu (Database)                    │
│  PostgreSQL / MySQL                          │
└─────────────────────────────────────────────┘
```

### 2.2. Tích hợp bên ngoài
- **Cổng thanh toán:** QR ngân hàng, ví điện tử (VNPay/Momo) – xử lý nạp tiền, thanh toán, hoàn tiền.
- **Email/SMS:** xác thực đăng ký, thông báo món sẵn sàng.
- **Máy in hóa đơn:** in tự động khi món sẵn sàng (có tùy chọn bật/tắt).

### 2.3. Mô hình phân quyền (RBAC)
- Mỗi tài khoản gắn một vai trò.
- Quyền được kiểm tra tại **phía máy chủ** (NFR-04).
- Khách hàng chỉ xem dữ liệu của chính mình.
- Nhân viên chỉ thao tác trong phạm vi vai trò và ca làm việc.

---

## 3. Các phân hệ chức năng (7 nhóm)

| Mã | Nhóm chức năng | BR liên quan |
|---|---|---|
| F1 | Dữ liệu nền và thực đơn | BR3.7, BR3.8 |
| F2 | Tài khoản khách hàng và đặt món | BR1.1–BR1.12 |
| F3 | Thanh toán, Ví Canteen, vé tháng | BR1.5, BR1.8–BR1.10 |
| F4 | Điều phối đơn hàng, bếp, phục vụ | BR2.1–BR2.5, BR3.1–BR3.6 |
| F5 | Kho nguyên liệu và cung ứng | BR4.1–BR4.12 |
| F6 | Kế toán, đối soát, báo cáo | BR5.1–BR5.7 |
| F7 | Quản trị hệ thống và ca làm | BR6.1–BR6.5, BR7.1–BR7.6 |

---

## 4. Quy trình nghiệp vụ chính

### 4.1. Quy trình đặt món và thanh toán
1. Đăng nhập → 2. Xem thực đơn → 3. Thêm món vào giỏ → 4. Chọn khung giờ nhận món
5. Chọn phương thức thanh toán → 6. Thanh toán (Ví/QR/Tiền mặt)
7. Ghi nhận đơn hàng, chuyển sang bếp → 8. Bếp chế biến → 9. Hoàn tất, thông báo "Sẵn sàng lấy đồ"
10. In hóa đơn tự động → 11. Khách nhận món → 12. Lưu trữ lịch sử.

### 4.2. Quy trình quản lý kho
1. Khai báo nguyên liệu & định lượng món
2. Theo dõi biến động (nhập/xuất/chế biến/hao hụt/điều chỉnh)
3. Cảnh báo khi tồn < mức tối thiểu
4. Lập đơn mua hàng, xác nhận nhập kho (lô, hạn sử dụng)
5. Kiểm kê, ghi chênh lệch
6. Loại bỏ lô hết hạn, chuyển giá trị hao hụt cho kế toán.

---

## 5. Thiết kế cơ sở dữ liệu

### 5.1. Các thực thể chính

**Người dùng & phân quyền**
- `users(id, username, email, phone, password_hash, role_id, status, created_at)`
- `roles(id, name, description)`
- `role_permissions(role_id, permission_code)`

**Thực đơn**
- `menu_categories(id, name, status)`
- `dishes(id, category_id, name, price, description, image_url, status, avg_rating)`
- `dish_ingredients(dish_id, ingredient_id, quantity, unit)`

**Kho**
- `ingredients(id, code, name, unit, min_stock, group, status)`
- `suppliers(id, name, contact, status)`
- `ingredient_batches(id, ingredient_id, supplier_id, quantity, expiry_date, received_date)`
- `purchase_orders(id, supplier_id, status, total_amount, created_at)`
- `purchase_order_lines(id, order_id, ingredient_id, quantity, unit_price)`
- `inventory_transactions(id, ingredient_id, batch_id, type, quantity, reason, performed_by, created_at)`
- `inventory_adjustments(id, ingredient_id, diff_quantity, reason, approved_by)`

**Đơn hàng & thanh toán**
- `wallets(customer_id, balance, updated_at)`
- `orders(id, code, customer_id, total_amount, status, payment_method, pickup_time_slot, note, created_at)`
- `order_items(id, order_id, dish_id, quantity, unit_price)`
- `payments(id, order_id, type, amount, method, status, external_ref, created_at)`
- `monthly_tickets(id, customer_id, package_id, start_date, end_date, status)`
- `ticket_packages(id, name, price, meal_count, duration_days)`
- `reviews(id, customer_id, dish_id, order_id, rating, comment, created_at)`

**Nhân sự & ca làm**
- `employees(id, user_id, full_name, phone, position, department, hire_date, status)`
- `shift_definitions(id, key, label, start_time, end_time)`
- `shift_schedules(id, employee_id, shift_id, work_date, status)`
- `shift_swap_requests(id, requester_id, target_id, schedule_id, reason, status)`
- `attendance(id, employee_id, schedule_id, check_in, check_out, status)`
- `system_config(key, value, updated_at)`

**Kiểm toán**
- `audit_logs(id, actor_id, action, target_type, target_id, result, created_at)`

### 5.2. Quan hệ chính (ERD tóm tắt)
```
users 1--1 wallets
users 1--* orders
orders 1--* order_items
dishes 1--* dish_ingredients --* ingredients
ingredients 1--* ingredient_batches
suppliers 1--* purchase_orders 1--* purchase_order_lines
employees 1--* shift_schedules
shift_definitions 1--* shift_schedules
```

---

## 6. Thiết kế API (REST)

### 6.1. Xác thực
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/staff-login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`

### 6.2. Thực đơn & đặt món
- `GET /api/menu?cat=&search=`
- `GET /api/menu/{id}`
- `POST /api/cart` (client-side) / `POST /api/orders`
- `GET /api/orders/{id}`
- `GET /api/orders?customer=&status=&from=&to=`
- `PATCH /api/orders/{id}/cancel`

### 6.3. Thanh toán & ví
- `GET /api/wallet`
- `POST /api/wallet/topup`
- `POST /api/payments`
- `GET /api/payments/{id}`
- `POST /api/tickets` (đăng ký vé tháng)
- `GET /api/tickets`

### 6.4. Bếp & phục vụ
- `GET /api/kitchen/orders?status=`
- `PATCH /api/kitchen/orders/{id}/status`
- `POST /api/kitchen/handover`

### 6.5. Kho
- `GET /api/ingredients`
- `POST /api/ingredients`
- `PUT /api/ingredients/{id}`
- `POST /api/inventory/receipts`
- `POST /api/inventory/issues`
- `POST /api/inventory/adjustments`
- `POST /api/inventory/stocktake`
- `GET /api/suppliers`
- `POST /api/purchase-orders`
- `GET /api/purchase-orders`

### 6.6. Tài chính & báo cáo
- `GET /api/transactions`
- `POST /api/expenses`
- `POST /api/reconciliation`
- `GET /api/reports/revenue?from=&to=`
- `GET /api/reports/financial?period=`
- `GET /api/reports/top-dishes`

### 6.7. Quản trị & ca làm
- `GET/POST/PUT/PATCH /api/users`
- `GET/POST/PUT/DELETE /api/roles`
- `GET/PUT /api/config`
- `GET /api/reports/summary`
- `POST /api/shifts/register`
- `GET /api/shifts/schedule?week=`
- `POST /api/shifts/swap`
- `POST /api/attendance/check-in`
- `POST /api/attendance/check-out`
- `GET /api/employees`

---

## 7. Thiết kế giao diện (theo demo)

### 7.1. Trang xác thực
- Tab Đăng nhập / Đăng ký khách hàng.
- Form đăng nhập nhân viên (chọn vai trò: Admin, Phục vụ, Bếp, Kho, Kế toán).

### 7.2. Bố cục ứng dụng (sau đăng nhập)
- **Sidebar** (trái): logo, vai trò, menu theo quyền, thông tin người dùng, đăng xuất.
- **Topbar**: tiêu đề trang, ngày giờ, thông báo, tên người dùng.
- **Content**: nội dung trang.

### 7.3. Các trang theo vai trò (theo `data.js`)
- Admin: Tổng quan, Bán hàng, Nhà bếp, Lịch sử đơn, Món ăn, Kho, Tài chính, Báo cáo, Ca làm, Quản trị.
- Khách hàng: Bán hàng, Lịch sử đơn.
- NV Phục vụ: Tổng quan, Nhà bếp, Lịch sử đơn.
- NV Bếp: Tổng quan, Nhà bếp, Món ăn.
- NV Kho: Tổng quan, Kho.
- NV Kế toán: Tổng quan, Tài chính, Báo cáo.

### 7.4. Các màn hình chính
- **Tổng quan:** KPI doanh thu/đơn/món bán chạy/cảnh báo nguyên liệu; biểu đồ 7 ngày; top món; đơn mới; cảnh báo kho.
- **Bán hàng:** lưới món theo danh mục, giỏ hàng, khung giờ nhận món, ghi chú, thanh toán.
- **Nhà bếp:** Kanban 3 cột (Chờ xử lý / Đang chế biến / Hoàn thành).
- **Lịch sử đơn:** bảng lọc theo mã/tên/ngày/trạng thái.
- **Quản lý món ăn:** bảng + modal thêm/sửa.
- **Kho:** bảng nguyên liệu + modal nhập/xuất kho.
- **Tài chính:** KPI, giao dịch, vé tháng, đối soát.
- **Báo cáo:** KPI, biểu đồ, top 10 món.
- **Ca làm việc:** lịch tuần, chấm công.
- **Quản trị:** tài khoản, vai trò/phân quyền, cấu hình hệ thống.
- **Hồ sơ:** thông tin cá nhân, ví canteen, nạp tiền.

---

## 8. Yêu cầu phi chức năng (NFR)

| Mã | Nội dung |
|---|---|
| NFR-01 | 95% thao tác thông thường phản hồi ≤ 2s; báo cáo ≤ 5s |
| NFR-02 | Tải tối thiểu 100 phiên đồng thời |
| NFR-03 | Nhất quán đơn hàng, giao dịch, số dư ví, hoàn tiền; không ghi lặp |
| NFR-04 | Phân quyền phía máy chủ; mật khẩu băm chuyên dụng |
| NFR-05 | Phiên hết hạn sau 30 phút không hoạt động; giới hạn đăng nhập sai |
| NFR-06 | Kiểm tra dữ liệu đầu vào ở giao diện và máy chủ |
| NFR-07 | Tương thích Chrome/Edge; hỗ trợ máy tính và tablet |
| NFR-08 | Sao lưu mỗi ngày; khôi phục ≤ 4 giờ, mất ≤ 24 giờ dữ liệu |
| NFR-09 | Nhật ký kiểm toán cho thao tác nhạy cảm |
| NFR-10 | Thông báo rõ ràng tiếng Việt |
| NFR-11 | Khả dụng ≥ 99% |
| NFR-12 | In hóa đơn tự động khi bật; lưu thông tin để in lại |

---

## 9. Kế hoạch triển khai

### 9.1. Giai đoạn
1. **Phân tích & thiết kế** (hiện tại): yêu cầu, use-case, DB, API, UI.
2. **Xây dựng backend**: API, xác thực, nghiệp vụ.
3. **Xây dựng frontend**: chuyển demo sang ứng dụng có API.
4. **Tích hợp**: thanh toán, email/SMS, máy in.
5. **Kiểm thử**: đơn vị, tích hợp, tải, bảo mật.
6. **Triển khai & nghiệm thu**.

### 9.2. Công nghệ đề xuất
- Frontend: React + TypeScript (hoặc giữ HTML/CSS/JS như demo).
- Backend: Node.js (Express/NestJS) hoặc ASP.NET Core.
- Database: PostgreSQL.
- Cache/Queue: Redis (tùy chọn cho realtime).
- Realtime: WebSocket/SSE cho bếp và đơn hàng.

---

## 10. Kết luận

Thiết kế trên tổng hợp đầy đủ các yêu cầu từ đặc tả Chương 1 (7 nhóm chức năng, 55 use-case, BR1–BR7) và bản demo giao diện, cung cấp nền tảng để triển khai hệ thống quản lý căng tin trường học hoàn chỉnh, đáp ứng cả nghiệp vụ bán hàng, kho, tài chính, nhân sự và quản trị.
