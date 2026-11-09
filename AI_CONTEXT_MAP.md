# AI_CONTEXT_MAP.md — Tài Liệu Tóm Tắt Kiến Trúc, Phân Quyền & Định Tuyến Dự Án MilktyWay F&B

> **MỤC ĐÍCH DÀNH CHO AI / DEVELOPER TIẾP THEO:**
> Đọc file này **ĐẦU TIÊN** trước khi quét codebase. File này tóm tắt toàn bộ kiến trúc, luồng nghiệp vụ F&B, `localStorage` keys, ma trận phân quyền (`auth.ts`), và bản đồ ánh xạ **Chức năng → File nguồn** để bạn nhảy thẳng vào đúng file cần sửa mà **không tốn token đọc lan man**.

---

## 1. Tổng Quan Công Nghệ & Lệnh Chạy
- **Tên dự án:** Hệ thống Quản trị Chuỗi Trà Sữa **MilktyWay** (12 chi nhánh `CN01` → `CN12`, 1 Kho tổng `central`, 1 Bếp trung tâm `kitchen`).
- **Tech Stack:** React 19 + TypeScript + React Router v7 (`react-router-dom`) + Vite 6 + TailwindCSS 3 + CSS Variables (`assets/css/app.css`).
- **Lệnh kiểm tra bắt buộc sau khi sửa code:**
  - Kiểm tra TypeScript & Build: `npm run build:react` (`tsc --noEmit && vite build`)
  - Chạy bộ kiểm thử E2E 15 kịch bản (69 assertions): `node scripts/e2e-business-flow.test.mjs`
- **Quy tắc UI / Code:**
  - Tái sử dụng component có sẵn trong `src/components/common/` (`Modal`, `DataTable`, `Badge`, `ConfirmDialog`, `useToast`).
  - Không thêm sub-header/tab điều hướng dư thừa ở đầu trang nếu `Sidebar.tsx` đã phân chia menu.
  - Không dùng emoji lòe loẹt trong giao diện.

---

## 2. Cơ Chế Fake Authorization & Tài Khoản Demo (`src/utils/auth.ts`)

Toàn bộ phân quyền trang (`canVisit`), phân quyền nút bấm/thao tác (`can`), và khóa phạm vi chi nhánh (`scopedBranch`) nằm tại **`src/utils/auth.ts`**.

### 2.1. Danh sách Tài khoản Fake (Mật khẩu mặc định: `123456`)
> **Lưu ý:** Trang `/login` chỉ còn 2 ô **Tài khoản (Email)** và **Mật khẩu** (đã bỏ 2 dropdown Vai trò & Chi nhánh). Hàm `loginByEmail(email, password, remember)` trong `src/utils/auth.ts` tự động nhận diện vai trò và chi nhánh ngầm dựa trên email đăng nhập.

| Role Key | Tên hiển thị | Email đăng nhập | Phạm vi (`scopedBranch()`) | Trang chủ (`homePath()`) | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `cashier` | Lê Quốc Tuấn Anh | `anh.lqt@milktyway.vn` | `"CN01"` (Nguyễn Huệ - Quầy POS01) | `/sales/pos` | Đã hoàn thiện theo ma trận POS |
| `manager` | Trần Thu Hà | `ha.tt@milktyway.vn` | `"CN05"` (Sư Vạn Hạnh / Hàng Xanh) | `/dashboard` | Đã hoàn thiện theo ma trận Quản lý CN |
| `warehouse` | Vũ Minh Khoa | `khoa.vm@milktyway.vn` | `null` (Kho tổng & Điều phối CN) | `/inventory/ingredients` | Đã hoàn thiện theo ma trận Nhân viên Kho |
| `owner` | Nguyễn Hoàng Long | `long.nh@milktyway.vn` | `null` (Toàn chuỗi 12 CN) | `/dashboard` | Đã hoàn thiện full quyền |

### 2.2. Các hàm Helper trong `src/utils/auth.ts`
- `checkLogin(): Role | null` — Lấy role hiện tại từ `sessionStorage` / `localStorage` (`milktyway.staff.session`).
- `isCashier()`, `isManager()` — Kiểm tra nhanh role.
- `scopedBranch(): string | null` — Trả về `"CN01"` nếu là `cashier`, `"CN05"` nếu là `manager`, `null` nếu là `owner`. Dùng để khóa `<select>` chi nhánh và lọc dữ liệu theo chi nhánh.
- `canVisit(path, role)` — Kiểm tra role có được vào route `path` hay không. Được dùng tự động ở:
  1. `src/routes/AppRoutes.tsx` (chặn truy cập URL trực tiếp, tự redirect về `homePath(role)`).
  2. `src/components/shared/Sidebar.tsx` (tự động ẩn các mục menu không có quyền).
  3. `src/components/shared/Header.tsx` (lọc kết quả tìm kiếm nhanh & ẩn link cài đặt).
- `can(action: Action, role)` — Kiểm tra quyền thao tác chi tiết trong trang:
  - `product.manage` (Tạo/sửa món), `product.lockAtBranch` (Khóa/mở bán món tại CN)
  - `promotion.manage` (Tạo/sửa/xóa khuyến mãi)
  - `ingredient.manage` (Quản lý danh mục nguyên liệu & ngưỡng tồn an toàn)
  - `stock.count` (Kiểm kê thực đếm mù), `stock.approveAdjustment` (Duyệt điều chỉnh tồn kho)
  - `purchase.create` (Lập đơn mua PO), `purchase.receive` (Kiểm nhận hàng theo phiếu nhập)
  - `pos.use` (Sử dụng quầy POS), `order.create` (Tạo đơn hàng), `order.reportShortage` (Báo thiếu nguyên liệu từ KDS cho quản lý)
  - `payment.refundReview` (Duyệt hoàn tiền), `complaint.handle` (Xử lý khiếu nại)
  - `user.manageBranch` (Quản lý & phân công nhân viên tại CN), `role.assign` (Phân quyền nhân viên)

---

## 3. Kho Dữ Liệu Chung & `localStorage` Keys (Shared State)

Dự án hoạt động 100% tương tác thực trên trình duyệt thông qua `localStorage` có dữ liệu mẫu (seed) khởi tạo sẵn:

1. **`src/pages/shared/business-demo.ts` + `src/pages/shared/useDemoState.ts`**
   - **Storage Key:** `"miltyway.user2.demo.v1"` (`DEMO_STORAGE_KEY`)
   - **Quản lý:** `stores` (12 chi nhánh), `categories`, `ingredients` (nguyên liệu + ngưỡng `minimum`), `units` (quy đổi đơn vị), `products`, `recipes` (BOM công thức), `lots` (lô tồn kho theo vị trí `central` / `kitchen` / `counter` + FEFO), `batches` (mẻ sơ chế), `purchaseOrders` (PO), `receipts` (phiếu nhận hàng), `plans` (kế hoạch cấp nguyên liệu đầu ca), `allocations` (phiếu điều chuyển kho → CN), `counts` (kiểm kê kho), `reconciliations` (đối soát ca).
2. **`src/pages/shared/sales-orders-store.ts`**
   - **Storage Keys:**
     - `"miltyway_sales_orders_v2"` (`STORAGE_ORDERS`) — Danh sách đơn bán hàng (`SalesOrder`), trạng thái pha chế KDS (`waiting` → `preparing` → `ready`).
     - `"miltyway_invoices_v2"` (`STORAGE_INVOICES`) — Danh sách hóa đơn (`InvoiceRecord`).
     - `"miltyway_sales_returns_v2"` (`STORAGE_RETURNS`) — Yêu cầu khiếu nại / đổi món / hoàn tiền (`ReturnRequest`).
   - **Hàm quan trọng:** `createPosOrder(...)` — Tạo đơn từ POS, tự động sinh hóa đơn và **tự động trừ tồn kho nguyên liệu tại quầy (`counter`)** theo định lượng công thức.
3. **Các `localStorage` Keys riêng từng trang:**
   - `"miltyway_shifts_v1"` (`ShiftsPage.tsx`) — Danh sách ca làm việc & bàn giao két tiền.
   - `"miltyway_sales_return_history_v1"` (`SalesReturnsPage.tsx`) — Lịch sử duyệt hoàn tiền.
   - Khóa/mở bán món theo chi nhánh KHÔNG có key riêng: lưu trong `DemoState.products[].lockedStoreIds` (key `miltyway.user2.demo.v1`).
   - `"miltyway_promotions_v1"` (`PromotionsPage.tsx`), `"miltyway_expenses_v1"` (`ExpensesPage.tsx`).
   - `"milktyway.<role>.name"`, `"milktyway.<role>.phone"`, `"milktyway.<role>.address"`, `"milktyway.<role>.password"` (`ProfilePage.tsx`, role ∈ cashier/manager/warehouse) và `"milktyway.staff.session"` (phiên đăng nhập).

---

## 4. Bản Đồ Ánh Xạ Chức Năng → File Nguồn (Feature-to-File Tracking Map)

Khi cần sửa hoặc thêm tính năng ở phân hệ nào, chỉ cần mở đúng file trong bảng dưới đây:

### A. Layout, Điều Hướng & Xác Thực
| Chức năng | Đường dẫn Route | File nguồn chính | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- |
| Cấu hình Role, Route Guard, Action Permission | Toàn hệ thống | `src/utils/auth.ts`<br>`src/routes/AppRoutes.tsx` | Muốn mở/khóa trang hoặc thêm role mới → sửa `auth.ts` |
| Menu dọc tự động lọc theo quyền | Toàn hệ thống | `src/components/shared/Sidebar.tsx` | Mảng `SECTIONS` lọc tự động qua `canVisit(entry.to)` |
| Thanh tìm kiếm nhanh & User Menu | Toàn hệ thống | `src/components/shared/Header.tsx` | Hiển thị `sessionUser()` và lọc gợi ý tìm kiếm qua `canVisit` |
| Đăng nhập & Chọn nhanh tài khoản Demo | `/login` | `src/pages/auth/LoginPage.tsx` | Tự khóa chi nhánh `CN01` (cashier) / `CN05` (manager) |
| Hồ sơ cá nhân & Đổi mật khẩu | `/profile` | `src/pages/auth/ProfilePage.tsx` | Lưu tên/SĐT/mật khẩu theo role vào `localStorage` |

### B. Bán Hàng, POS, KDS, Ca Làm Việc & Hóa Đơn
| Chức năng | Đường dẫn Route | File nguồn chính | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- |
| Quầy bán hàng POS (Tạo đơn, tính điểm, thu tiền) | `/sales/pos` | `src/pages/sales/PosTerminalPage.tsx` | Chỉ `cashier` & `owner` có quyền `pos.use`. Gọi `createPosOrder()` |
| Danh sách đơn hàng | `/sales` | `src/pages/sales/SalesListPage.tsx` | Lọc theo `scopedBranch()`. Ẩn nút tạo đơn nếu `!can("order.create")` |
| Hàng đợi pha chế KDS (Barista) | `/sales/preparation` | `src/pages/sales/PreparationQueuePage.tsx` | Chuyển trạng thái `waiting` → `preparing` → `ready` → `completed`. Nút "Báo thiếu" kiểm tra `can("order.reportShortage")` |
| Quản lý quầy POS, Mở/Đóng ca & Thống kê chốt ca | `/sales/shifts` | `src/pages/sales/ShiftsPage.tsx` | Có thống kê tiền đóng ca, bật/tắt 3 quầy `POS01..03`, mở ca, gửi yêu cầu & xác nhận bàn giao quỹ tiền mặt |
| Khiếu nại, Đổi món & Duyệt hoàn tiền | `/sales/returns` | `src/pages/sales/SalesReturnsPage.tsx` | `cashier` gửi khiếu nại; `manager`/`owner` (`can("payment.refundReview")`) duyệt/từ chối hoàn tiền |
| Danh sách & Chi tiết Hóa đơn | `/invoices`<br>`/invoices/:id` | `src/pages/invoices/InvoicesPage.tsx`<br>`src/pages/invoices/InvoiceDetailsPage.tsx` | Đối soát giao dịch thanh toán, lọc theo `scopedBranch()` |

### C. Thực Đơn, Kho, Mua Hàng, Sơ Chế & Cấp Phát
| Chức năng | Đường dẫn Route | File nguồn chính | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- |
| Thực đơn sản phẩm & Khóa/Mở bán món tại CN | `/inventory/products` | `src/pages/inventory/ProductsPage.tsx` | `can("product.manage")` để thêm/sửa; `can("product.lockAtBranch")` để khóa/mở bán món tại chi nhánh trong Modal |
| Thêm / Chi tiết Sản phẩm | `/inventory/products/new`<br>`/inventory/products/:id` | `src/pages/inventory/AddProductPage.tsx`<br>`src/pages/inventory/ProductDetailsPage.tsx` | Chỉ `owner` truy cập |
| Danh mục nguyên liệu, Lô HSD & Ngưỡng an toàn | `/inventory/ingredients` | `src/pages/inventory/IngredientsPage.tsx` | Quản lý nguyên liệu, xem cảnh báo cận hạn/hết hàng, sửa ngưỡng tồn an toàn (`minimum`) trong Modal |
| Kiểm kê kho & Phê duyệt điều chỉnh tồn kho | `/inventory/stock-adjustment` | `src/pages/inventory/StockAdjustmentPage.tsx` | `can("stock.count")` để nhập kiểm đếm mù; `can("stock.approveAdjustment")` để Quản lý CN/Owner duyệt điều chỉnh |
| Tồn kho nguyên liệu tại quầy chi nhánh | `/stores/ingredients` | `src/pages/stores/StoreIngredientsPage.tsx` | Lọc tồn kho quầy theo `scopedBranch()`, cảnh báo thiếu hụt |
| Đối soát tiêu hao nguyên liệu cuối ca | `/stores/shift-reconciliation` | `src/pages/stores/ShiftReconciliationPage.tsx` | Tính `Tồn lý thuyết = Đầu ca + Nhận - Bán - Hủy`, đối chiếu thực đếm |
| Đơn mua nguyên liệu (PO) | `/purchases`<br>`/purchases/new` | `src/pages/purchases/PurchasesPage.tsx`<br>`src/pages/purchases/AddPurchasePage.tsx` | `manager` được lập PO (`can("purchase.create")`), nhưng ẩn nút Kiểm nhận (`!can("purchase.receive")`) |
| Phiếu nhập kho & Điều chuyển kho → CN | `/purchases/receipts`<br>`/purchases/transfers` | `src/pages/purchases/ReceiptsPage.tsx`<br>`src/pages/purchases/StockTransfersPage.tsx` | Kiểm nhận lô mới và xuất/nhận điều chuyển từ bếp/kho tổng về chi nhánh |
| Lập & Duyệt yêu cầu cấp nguyên liệu đầu ca | `/distribution/planning` | `src/pages/distribution/DistributionPlanningPage.tsx` | `manager` lập và phê duyệt kế hoạch cấp nguyên liệu đầu ca cho `CN05` |
| Công thức (BOM) & Mẻ sơ chế | `/production/recipes`<br>`/production/batches` | `src/pages/production/RecipesPage.tsx`<br>`src/pages/production/BatchesPage.tsx` | Quản lý định lượng pha chế & nấu mẻ bán thành phẩm (Trà nền, Trân châu) |

### D. Khuyến Mãi, Khách Hàng, Nhân Sự & Báo Cáo
| Chức năng | Đường dẫn Route | File nguồn chính | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- |
| Chương trình khuyến mãi & Voucher | `/marketing/promotions` | `src/pages/sales/PromotionsPage.tsx` | Tạo mới trong Modal popup. `manager` & `cashier` chỉ xem (`!can("promotion.manage")`) các KM đang chạy tại CN |
| Điều chỉnh KM theo 12 chi nhánh | `/marketing/branch-promotions` | `src/pages/sales/BranchPromotionsPage.tsx` | Dành cho `owner` điều phối KM toàn chuỗi |
| Khách hàng & Tích điểm hạng thành viên | `/customers` | `src/pages/sales/CustomersPage.tsx` | Quản lý hội viên Silver / Gold / VIP |
| Quản lý nhân viên & Phân công tại CN | `/users` | `src/pages/users/UsersPage.tsx` | `manager` xem & phân công nhân viên thuộc `CN05` |
| Phân quyền vai trò (Role Matrix UI) | `/users/roles` | `src/pages/users/RolesPage.tsx` | Ma trận checkbox phân quyền trực quan |
| Dashboard & 4 Báo cáo (Doanh thu, Tồn kho, Sản phẩm, Chi nhánh) | `/dashboard`<br>`/reports/sales-report`<br>`/reports/inventory-report`<br>`/reports/profit-loss` | `src/pages/sales/DashboardPage.tsx`<br>`src/pages/reports/SalesReportPage.tsx`<br>`src/pages/reports/InventoryReportPage.tsx`<br>`src/pages/reports/ProfitLossPage.tsx` | Tự động khóa filter chi nhánh về `scopedBranch()` (`CN05`) khi đăng nhập bằng `manager` |

---

## 5. Lịch Sử Các Thay Đổi Quan Trọng Đã Thực Hiện (Context Summary)
1. **Tối ưu giao diện Khuyến mãi (`PromotionsPage.tsx`):**
   - Đã bỏ thanh tab điều hướng thừa ở đầu trang (vì Sidebar đã chia sẵn).
   - Chuyển toàn bộ form *"Tạo chương trình khuyến mãi mới"* thành popup `Modal` gọn gàng, xóa form nằm cố định bên dưới trang.
2. **Kiểm toán & Chuẩn hóa toàn bộ luồng CRUD + E2E Test (`scripts/e2e-business-flow.test.mjs`):**
   - Xây dựng 15 kịch bản E2E kiểm thử xuyên suốt: Bán hàng POS → Áp voucher/VIP → Tự động trừ tồn kho quầy theo công thức → Hàng đợi pha chế KDS → Hóa đơn → Hoàn tiền/Khiếu nại → Bàn giao ca & lệch tiền mặt → Đơn B2B lớn → Thăng hạng thành viên → FEFO & chặn lô hết hạn → Điều chuyển lệch số lượng → Đối soát tiêu hao cuối ca → Ma trận phân quyền Quản lý chi nhánh.
3. **Hoàn thiện Fake Authorization cho cả 3 Role (`cashier`, `manager`, `warehouse`) + `owner`:**
   - Gỡ bỏ 2 ô chọn Vai trò & Chi nhánh ở `LoginPage.tsx`, tự động nhận diện ngầm từ Email qua `loginByEmail()`.
   - Phân quyền chặt chẽ từ Route (`AppRoutes.tsx`), Menu (`Sidebar.tsx`, `Header.tsx`), phạm vi dữ liệu chi nhánh (`scopedBranch()`) đến từng nút bấm (`can(...)`) theo đúng ma trận 8 nhóm chức năng cho từng vai trò.

---

## 6. Hướng Dẫn Nhanh Khi Nhận Task Mới (Dành Cho AI Tiếp Theo)
- **Nếu user yêu cầu làm tiếp Fake Authorization cho role mới (ví dụ: `warehouse` - Thủ kho / Nhân viên kho):**
  1. Mở `src/utils/auth.ts`: Thêm `warehousePages` vào `canVisit()` và `warehouseActions` vào `can()`, cập nhật `scopedBranch()` nếu kho gắn với chi nhánh.
  2. Kiểm tra `src/pages/auth/LoginPage.tsx` và `src/pages/auth/ProfilePage.tsx` (đã hỗ trợ sẵn role `warehouse`, chỉ cần kiểm tra chi nhánh mặc định).
  3. Kiểm tra các trang Kho (`IngredientsPage.tsx`, `StockAdjustmentPage.tsx`, `PurchasesPage.tsx`, `ReceiptsPage.tsx`, `StockTransfersPage.tsx`, `BatchesPage.tsx`, `ShiftReconciliationPage.tsx`) để bật/tắt nút theo `can(...)`.
  4. Chạy `npm run build:react` và `node scripts/e2e-business-flow.test.mjs` để đảm bảo không vỡ bất kỳ luồng nào.


---

## 7. Cập Nhật Sau Đợt Rà Soát Đồng Bộ (đọc trước khi sửa phân quyền / báo cáo)
- **Test phân quyền chạy trên code thật:** `node scripts/auth-matrix.test.mjs` biên dịch `src/utils/auth.ts` bằng esbuild, đối chiếu `canVisit`/`can`/`loginByEmail`/redirect với **mọi route trong `AppRoutes.tsx`** (route mới chưa khai báo trong bảng `ROUTES` của test sẽ làm test FAIL). Kịch bản 15 của `scripts/e2e-business-flow.test.mjs` gọi lại test này. **Khi thêm route hoặc đổi quyền: sửa `auth.ts` + bảng `ROUTES`/`ALLOWED_ACTIONS` trong test.**
- **`RolesPage.tsx` không còn hardcode checkbox:** mỗi dòng dẫn xuất từ `canVisit()` / `can()` (mảng `permissionSources`), nên ma trận hiển thị luôn khớp quyền thật.
- **Báo cáo tồn kho & Dashboard đọc `DemoState`** qua `src/pages/shared/stock-summary.ts` (`buildStockSummary`): tồn, giá trị, lô cận hạn/quá hạn, nguyên liệu dưới ngưỡng thay đổi theo kiểm kê, nhập kho, cấp phát, POS. (Doanh thu/đơn hàng trên Dashboard vẫn là `dashboardDemo` mock.)
- **Thông báo Header** có `path` + `branch`: chỉ hiện nếu role vào được `path` và đúng chi nhánh phạm vi.
- **Phạm vi NV Kho (`khoa.vm@`)**: Kho Tổng & điều phối chi nhánh (`scopedBranch()` = null), mã `NV-KHO-01`. Nhân viên mock của CN05 trong `UsersPage` (`EMP-05`, `EMP-06`) chỉ để quản lý CN05 quản lý, không có tài khoản đăng nhập.
- Breadcrumb dùng `homePath()` thay vì `/dashboard` cứng (test sẽ báo nếu quay lại hardcode ở các trang đã kiểm).
