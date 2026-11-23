# ĐẶC TẢ PHÂN CÔNG TASK SIÊU CHI TIẾT CHO 2 NGƯỜI (BẢN HƯỚNG DẪN TỪNG DÒNG & TỪNG THAO TÁC — ĐỒNG BỘ 100% VỚI `FEEDBACK DETAILS.md`)

> **Tài liệu này chuyển hóa toàn bộ 100% nội dung phân tích chuyên sâu trong [FEEDBACK DETAILS.md](file:///d:/OOAD/HaiLyDa-FrontEnd/FEEDBACK%20DETAILS.md) thành kịch bản hành động từng bước (Step-by-Step Action Guide) chia đều cho 2 thành viên.**
>
> **3 Cam kết của tài liệu này:**
> 1. **Độ chi tiết tương đương 100% với `FEEDBACK DETAILS.md`**: Chỉ rõ tới từng **đường dẫn file**, **số dòng hiện tại**, **tên biến / tên state / tên hàm / tên thuộc tính trong object**, **cụ thể từng trường dữ liệu dùng để Sort (`A → Z`, `Z → A`, `Mới nhất`, `Cũ nhất`, `Priority`)**, **cơ chế kiểm tra tất cả các món có chứa 1 nguyên liệu được tìm kiếm**, **các class Tailwind CSS đang gây lỗi và class cần thay thế**, và **luồng sự kiện khi người dùng bấm nút**.
> 2. **Chỉ hướng dẫn bằng lời và cấu trúc thuộc tính rõ ràng — Không chèn các khối code mẫu dài & Không chứa công thức toán học (mọi phép tính toán học là việc của Backend, Frontend chỉ nhận và hiển thị các trường dữ liệu đã tính sẵn kèm nhãn thuyết minh)**.
> 3. **Hệ thống tổ hợp phím tắt POS tối giản (Chỉ 5 phím tắt cốt lõi, KHÔNG lạm dụng tràn lan, KHÔNG dùng `F1..F12`)**: Chỉ dùng `/`, `` ` `` / `~`, `Alt + D`, `Alt + H`, `Ctrl + Enter`.

---

## MỤC LỤC & BẢNG PHÂN CHIA TỔNG THỂ (50% - 50% KHỐI LƯỢNG, KHÔNG ĐỤNG FILE)

| Tiêu chí | NGƯỜI 1 — Khối Tiền sảnh, Bán hàng, Ca, Khuyến mãi & Khách hàng | NGƯỜI 2 — Khối Hậu cần, Kho, Sản xuất, Kế hoạch, Đối soát, NCC & Báo cáo |
|---|---|---|
| **Trọng tâm nghiệp vụ** | Toàn bộ hành trình đơn hàng từ lúc Khách hàng / Thu ngân tạo đơn -> Pha chế -> Đổi trả hoàn tiền -> Chốt ca kiểm kê 2 bên -> Áp dụng khuyến mãi. | Toàn bộ chuỗi cung ứng từ Nhà cung cấp -> Nguyên liệu `F0 / F1` -> Công thức -> Lô mẻ & Truy vết -> Kế hoạch Kho Tổng -> Đối soát cửa hàng -> Dashboard & Báo cáo tài chính. |
| **Danh sách Task** | - **Task A1**: Điểm bán hàng POS (`/sales/pos`) + Ẩn Sidebar Focus Mode + 5 phím tắt cốt lõi (`/`, `` ` ``/`~`, `Alt+D`, `Alt+H`, `Ctrl+Enter`)<br>- **Task A2**: Hàng đợi pha chế KDS (`/sales/preparation`) — Thu gọn & Hiển thị công thức chế biến<br>- **Task A3**: Mở/Đóng ca, Rule kiểm kê, Giải trình `Người mở ≠ Người đóng` & Chốt ca xác thực 2 bên (`/sales/shifts`)<br>- **Task A4**: Đổi trả & Hoàn tiền (`readOnly` tự động hiển thị từ Backend), Đổi 1 món vs Cả đơn, Ghi vào đơn gốc vs Tạo đơn mới (`/sales/returns`)<br>- **Task A5**: Khuyến mãi (`/marketing/promotions`) & Khuyến mãi chi nhánh (`/marketing/branch-promotions`)<br>- **Task A6**: Cổng Khách hàng (`/customer`) — Chọn chi nhánh gần tôi, Tùy chọn Đăng nhập & Lưu thông tin, Tra cứu không cần OTP | - **Task B1**: Nâng cấp dữ liệu gốc Kho - Sản xuất (`business-demo.ts`) & Danh sách sản phẩm theo Chi nhánh + Kiểm tra món chứa nguyên liệu + Nút sắp xếp nói rõ trường (`/inventory/products`)<br>- **Task B2**: Bảng điều khiển Tổng quan (`/dashboard`) — Đơn vị thời gian, Lượng khách theo CN, Tooltip/Pop-up, Thuyết minh ngưỡng ROP & Khóa nguyên liệu ngưng xài<br>- **Task B3**: Công thức sản xuất (`/production/recipes`) — Sắp xếp (`priority`, `effectiveDate`, `product.name`), Kiểm tra tất cả các món chứa 1 nguyên liệu được tìm kiếm & Thay thế nhanh nguyên liệu (Bài toán Trà A trong món X, Y, Z)<br>- **Task B4**: Lô/Mẻ sản xuất (`/production/batches`) — Phân phối nguyên liệu về CN & Truy vết nguồn gốc 2 chiều<br>- **Task B5**: Kế hoạch sản xuất (`/production/planning` & `/distribution/planning`) — Kế hoạch cố định, Lượng thêm tạm thời, Góp ý Thanh Hương & Cây phân cấp `F0 -> F1 -> Món`<br>- **Task B6**: Tồn kho cửa hàng (`/stores/ingredients`) & Đối soát ca theo Chi nhánh (`/stores/shift-reconciliation`)<br>- **Task B7**: Nhà cung cấp (`/suppliers` kèm Sort `name` và `partnerSince`), Báo cáo Tồn kho (`/reports/inventory-report`) & Báo cáo Lãi Lỗ (`/reports/profit-loss`) |
| **Danh sách File phụ trách riêng** | 1. [products.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/sales/products.ts)<br>2. [PosTerminalPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PosTerminalPage.tsx)<br>3. [PosCart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/sales/PosCart.tsx)<br>4. [MainLayout.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/layouts/MainLayout.tsx)<br>5. [Header.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/shared/Header.tsx)<br>6. [pos-template.css](file:///d:/OOAD/HaiLyDa-FrontEnd/src/assets/css/pos-template.css)<br>7. [PreparationQueuePage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PreparationQueuePage.tsx)<br>8. [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx)<br>9. [SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx)<br>10. [sales-orders-store.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/sales-orders-store.ts)<br>11. [PromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PromotionsPage.tsx)<br>12. [BranchPromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/BranchPromotionsPage.tsx)<br>13. [BranchesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/branches/BranchesPage.tsx)<br>14. [LoginPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/auth/LoginPage.tsx) & [ForgotPasswordPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/auth/ForgotPasswordPage.tsx)<br>15. `src/pages/customer/CustomerPortalPage.tsx` *(Tạo mới)* | 1. [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts)<br>2. [ProductsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/inventory/ProductsPage.tsx)<br>3. [DashboardPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/DashboardPage.tsx)<br>4. [TemplateChart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/shared/TemplateChart.tsx)<br>5. [charts.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/dashboard/charts.ts)<br>6. [stock-summary.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/stock-summary.ts)<br>7. [RecipesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/RecipesPage.tsx)<br>8. [BatchesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/BatchesPage.tsx)<br>9. [DistributionPlanningPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/distribution/DistributionPlanningPage.tsx)<br>10. [StoreIngredientsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/StoreIngredientsPage.tsx)<br>11. [ShiftReconciliationPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/ShiftReconciliationPage.tsx)<br>12. [SuppliersPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/suppliers/SuppliersPage.tsx)<br>13. [InventoryReportPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/InventoryReportPage.tsx)<br>14. [ProfitLossPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/ProfitLossPage.tsx)<br>15. [SalesReportPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/SalesReportPage.tsx) |

---

## GIAI ĐOẠN 0: ĐỒNG BỘ 2 FILE CẤU HÌNH CHUNG TRƯỚC KHI TÁCH NHÁNH (20 PHÚT ĐẦU)

Hai thành viên thống nhất sửa nhanh **2 file điều hướng & phân quyền** dưới đây trước tiên rồi commit lên nhánh gốc. Nhờ vậy trong suốt quá trình code, Người 1 và Người 2 không ai chạm vào file của người kia.

### Bước 0.1 — Sửa file phân quyền [auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts)
1. **Mở file** [auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts) tại vùng khai báo quyền thao tác (`ActionKey` và `ROLE_ACTIONS`, từ dòng 14 đến dòng 50):
   - Hiện tại các quyền thao tác ca chỉ có `"shift.open"` và `"shift.close"`, và ở dòng 48 `owner` đang nắm giữ `"*all*"` nên Admin tổng lại có quyền mở ca trực tiếp tại quầy (trái với yêu cầu giảng viên: *Mở/đóng ca chỉ nên quy định trong phạm vi chi nhánh, do Quản lý tổng không có mặt trực tiếp không thể quản lý được; Quản lý tổng chỉ đối soát báo cáo và phân công nhân viên thuộc chi nhánh nào*).
   - **Thao tác cần làm**:
     - Bổ sung thêm các mã quyền thao tác cụ thể vào `ActionKey`:
       - `shift.openBranch`: Mở ca trực tiếp tại quầy chi nhánh (chỉ cấp cho `cashier` và `manager`).
       - `shift.closeRequestBranch`: Đếm tiền, kiểm kê cuối ca và ký bàn giao Bên 1 (chỉ cấp cho `cashier` và `manager`).
       - `shift.verifySecondParty`: Xác thực chốt ca Bên 2 tại chi nhánh (chỉ cấp cho `manager` hoặc Ca trưởng nhận ca tại chi nhánh).
       - `staff.assignBranch`: Phân công / điều chuyển nhân viên thuộc chi nhánh nào (chỉ cấp cho `owner`).
     - Trong hàm `can(action)` (khoảng dòng 160–166): Thêm một điều kiện kiểm tra riêng cho `"shift.openBranch"` để nếu `role === "owner"` thì trả về `false` (Quản trị tổng không trực tiếp mở ca tại quầy mà chỉ xem báo cáo ca và đối soát).
2. **Tại vùng khai báo danh sách đường dẫn được phép truy cập theo vai trò (`ROLE_ALLOWED_PATHS`, từ dòng 52 đến dòng 88)**:
   - Trong mảng `managerPages` (dòng 60–67):
     - Hiện tại đang **thiếu** `/stores/shift-reconciliation`, dẫn đến nghịch lý Quản lý chi nhánh có quyền `stock.approveAdjustment` nhưng khi vào `/stores/shift-reconciliation` lại bị chặn! Hãy **thêm `"/stores/shift-reconciliation"` và `"/production/planning"` vào `managerPages`**.
   - Trong mảng `warehousePages` (dòng 68–72) và danh sách trang của `owner`:
     - Thêm `"/production/planning"` (để khớp với đường dẫn giảng viên ghi trong note, song song với `"/distribution/planning"`).
   - Trong mảng `cashierPages` (dòng 73–77):
     - Thêm `"/marketing/promotions"` vào `cashierPages` để nhân viên bán hàng mở xem được danh sách khuyến mãi (nhưng không có quyền `promotion.manage` nên chỉ xem tra cứu, không thêm/sửa/xóa được).
   - Cho phép đường dẫn công khai `"/customer"` hiển thị với mọi vai trò trong hàm `canAccessPath(path)`.
3. **Tại vùng khai báo hồ sơ mẫu (`ROLE_PROFILES`, dòng 118–125)**:
   - Kiểm tra hồ sơ của `cashier` (dòng 121): Hiện tại `displayName` là `"Lê Quốc Tuấn Anh"` thuộc `branch: "CN01"`. Hãy giữ hoặc bổ sung thêm danh sách nhân sự theo từng chi nhánh (`BRANCH_STAFF_DIRECTORY` xuất ra từ `auth.ts` hoặc `business-demo.ts`) gồm đầy đủ nhân viên Thu ngân, Pha chế, Quản lý của từng chi nhánh `CN01`, `CN02`, `CN03`, `CN05`, `CN08` để cả trang Ca làm việc (`ShiftsPage.tsx`) của Người 1 và trang Đối soát ca (`ShiftReconciliationPage.tsx`) của Người 2 dùng chung.

### Bước 0.2 — Sửa file định tuyến [AppRoutes.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/routes/AppRoutes.tsx)
1. **Mở file** [AppRoutes.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/routes/AppRoutes.tsx):
   - Tại vùng khai báo `PUBLIC_PATHS` hoặc kiểm tra `!session` (dòng 87–102):
     - Cho phép đường dẫn `/customer` (Cổng Khách hàng) truy cập trực tiếp mà **không bị chuyển hướng về `/login`** khi chưa đăng nhập (để khách hàng vãng lai vào chọn chi nhánh gần nhất, đặt món hoặc tra cứu đơn hàng không cần OTP ngay lập tức).
   - Tại vùng `<Routes>` bên trong `MainLayout` (khoảng dòng 121):
     - Hiện tại chỉ có `<Route path="/distribution/planning" element={<DistributionPlanningPage />} />`. Hãy **thêm một dòng `<Route path="/production/planning" element={<DistributionPlanningPage />} />`** ngay bên dưới để cả 2 URL `/production/planning` và `/distribution/planning` đều hoạt động.

---

## PHẦN A: HƯỚNG DẪN SIÊU CHI TIẾT CHO NGƯỜI 1 (TASK A1 -> TASK A6)

---

### TASK A1: Điểm bán hàng POS (`/sales/pos`), Chế độ Ẩn Sidebar & Bộ Tổ hợp Phím tắt Nhanh (Không dùng F1..F12)

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên & Yêu cầu Phím tắt
- Thêm `"hot sale"` tag ở thẳng cái menu.
- Các tùy chỉnh và chốt đơn sản phẩm, các nút chức năng người bán cần cố định. Trong gộp chung recycle view.
- Có thêm chế độ ẩn sidebar để bộc bớt (ẩn) các chức năng không cần thiết cho người bán hàng.
- Tạo các phím tắt nhấn nhanh các chức năng (**Chỉ dùng đúng 5 phím tắt cốt lõi tiết kiệm nhiều thao tác nhất: `/`, `` ` `` / `~`, `Alt + D`, `Alt + H`, `Ctrl + Enter`; tuyệt đối KHÔNG lạm dụng tràn lan và KHÔNG dùng `F1..F12`**).

#### 🔍 Phân tích hiện trạng các dòng code đang bị lỗi trong Project
1. **Tại [products.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/sales/products.ts#L1-L162)**:
   - Interface `PosProduct` (dòng 1–12) chỉ có `id`, `name`, `sku`, `category`, `price`, `stock`, `status`, `image`, `desc`. Chưa có trường đánh dấu món bán chạy (`isHotSale`), chưa có danh sách chi nhánh khóa bán (`lockedBranches`), và chưa có định mức công thức pha chế (`recipeLines`, `prepSteps`).
2. **Tại [PosTerminalPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PosTerminalPage.tsx#L338-L553)**:
   - Dòng 397–441: Thẻ sản phẩm trên lưới menu chỉ hiển thị tồn kho góc phải (`Còn 42`) và số lượng trong giỏ góc trái, thiếu hẳn tag **`🔥 HOT SALE`** trực tiếp trên thẻ món.
   - Dòng 444–552: Khối **"Tùy chọn món (Size / Đá / Đường / Topping)"** đang đặt ở cột bên trái (`lg:col-span-7`) **nằm tuốt bên dưới lưới 12 sản phẩm**! Thu ngân bấm chọn 1 món ở hàng đầu phải cuộn chuột xuống đáy cột trái mới chỉnh được đá/đường/topping.
3. **Tại [PosCart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/sales/PosCart.tsx#L140-L433)**:
   - Cột bên phải (`lg:col-span-5`) đang dựng **3 thẻ `.card` rời nhau xếp chồng dọc**:
     - Thẻ 1 (dòng 142–228): Giỏ hàng (`max-h-[380px] overflow-y-auto`).
     - Thẻ 2 (dòng 231–333): Thông tin đơn hàng, SĐT hội viên, Hạng thẻ, Voucher, Ghi chú.
     - Thẻ 3 (dòng 336–431): Phương thức thanh toán, Tiền khách đưa, Tạm tính/Giảm giá/Tổng cộng và nút **`Hoàn tất bán hàng`** (`#pos-complete-btn`).
   - Do 3 thẻ này cộng lại cao hơn `1.150px` (vượt xa màn hình laptop `768px–900px`) và không nằm trong một khung giới hạn chiều cao `h-full`, nút **`Hoàn tất bán hàng`** luôn bị tràn xuống dưới đáy trang web, buộc người bán phải cuộn cả trang web mới bấm chốt đơn được!
4. **Tại [sales-orders-store.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/sales-orders-store.ts#L574-L589)**:
   - Hàm `createPosOrder()` ở dòng 575 chỉ tính `discount = Math.round(subtotal * (params.discountRate / 100))` mà **quên cộng `flatDiscount`** (`2.000 ₫` cho Thành viên mới và `5.000 ₫` cho Hạng Bạc đã tính ở `PosCart.tsx` dòng 66). Đồng thời ở dòng 579–588 khi map `items` sang `SalesOrderItem`, hàm này **làm rơi mất `productId` và `sku`**.
5. **Tại [MainLayout.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/layouts/MainLayout.tsx#L12-L42), [Header.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/shared/Header.tsx#L104-L112) và [pos-template.css](file:///d:/OOAD/HaiLyDa-FrontEnd/src/assets/css/pos-template.css#L94-L110)**:
   - Trên màn hình máy tính (`>= 1024px`), CSS ở dòng 94–110 của `pos-template.css` ép cứng `.sidebar { transform: translateX(0) }` và `.main-wrapper { margin-left: 16rem }`, còn nút đóng/mở menu trên `Header.tsx` (dòng 105) lại để class `lg:hidden`. Người bán hàng trên máy tính hoàn toàn không thể ẩn Sidebar đi được.

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 1

##### Bước A1.1 — Mở rộng dữ liệu sản phẩm POS tại [products.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/sales/products.ts)
1. Mở [products.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/sales/products.ts) tại dòng 1–20 (`export interface PosProduct`):
   - Thêm các trường mới vào `PosProduct`:
     - `isHotSale?: boolean`: Đánh dấu món bán chạy hiển thị tag Hot Sale trên menu.
     - `hotRank?: number`: Thứ tự ưu tiên bán chạy (1, 2, 3...).
     - `soldToday?: number`: Số ly đã bán hôm nay (ví dụ `145`, `128`, `96`...) để hiển thị kèm trên thẻ món hoặc khi rà chuột.
     - `lockedBranches?: string[]`: Danh sách các chi nhánh đang tạm khóa món này (ví dụ `["CN08"]`), để POS tự động lọc theo chi nhánh của thu ngân (`scopedBranch()`).
     - `recipeItems?: { name: string; baseAmount: number; unit: string; tier: "F0" | "F1"; scaleWithSugar?: boolean; scaleWithIce?: boolean }[]`: Định mức nguyên liệu chuẩn cho 1 ly Size M của món đó.
     - `prepSteps?: string[]`: Mảng 3–4 bước hướng dẫn pha chế chuẩn của món đó.
2. Tại mảng `POS_PRODUCTS` (dòng 32–162):
   - Gán `isHotSale: true` và `hotRank: 1..5` cho 5 món bán chạy nhất:
     - Món `id: 1` (*Trà sữa truyền thống* - `TS01`): `isHotSale: true, hotRank: 1, soldToday: 168`.
     - Món `id: 2` (*Trà sữa trân châu đường đen* - `TS02`): `isHotSale: true, hotRank: 2, soldToday: 142`.
     - Món `id: 5` (*Trà đào cam sả* - `TC01`): `isHotSale: true, hotRank: 3, soldToday: 135`.
     - Món `id: 8` (*Hồng trà Macchiato* - `MC01`): `isHotSale: true, hotRank: 4, soldToday: 112`.
     - Món `id: 10` (*Sữa tươi trân châu đường đen* - `ST01`): `isHotSale: true, hotRank: 5, soldToday: 98`.
   - Điền đầy đủ `recipeItems` và `prepSteps` cho cả 12 món trong `POS_PRODUCTS` (ví dụ món *Trà sữa truyền thống* gồm: `Cốt hồng trà ủ nóng (F1): 150 ml`, `Bột sữa béo (F0): 35 g`, `Siro đường mía (F0): 25 ml (scaleWithSugar: true)`, `Đá viên tinh khiết (F0): 180 g (scaleWithIce: true)`, `Trân châu đen luộc sẵn (F1): 50 g`).

##### Bước A1.2 — Xây dựng chế độ "Ẩn Sidebar / POS Focus Mode" tại [MainLayout.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/layouts/MainLayout.tsx), [Header.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/shared/Header.tsx) và [pos-template.css](file:///d:/OOAD/HaiLyDa-FrontEnd/src/assets/css/pos-template.css)
1. Mở [pos-template.css](file:///d:/OOAD/HaiLyDa-FrontEnd/src/assets/css/pos-template.css) tại dòng 94–110 (trong khối `@media (min-width: 1024px)`):
   - Thêm quy tắc CSS cho trạng thái ẩn Sidebar trên máy tính:
     - Khi thẻ `.sidebar` có thêm class `.sidebar-desktop-hidden`: đặt `transform: translateX(-100%) !important;` để trượt ẩn hoàn toàn sang trái.
     - Khi thẻ `.main-wrapper` có thêm class `.main-wrapper-expanded`: đặt `margin-left: 0 !important;` để vùng nội dung chính giãnเต็ม 100% chiều ngang màn hình.
2. Mở [MainLayout.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/layouts/MainLayout.tsx) (dòng 12–42):
   - Tạo state `sidebarHidden` khởi tạo từ `localStorage.getItem("milktyway_pos_sidebar_hidden_v1") === "1"`.
   - Viết hàm `toggleDesktopSidebar()` để đảo giá trị `sidebarHidden`, lưu vào `localStorage["milktyway_pos_sidebar_hidden_v1"]` và phát sự kiện `window.dispatchEvent(new CustomEvent("milktyway:sidebar-toggled"))`.
   - Lắng nghe sự kiện `"milktyway:toggle-sidebar"` trên `window` để từ bên trong trang `PosTerminalPage.tsx` (khi người bán bấm phím `` ` `` / `~` hoặc `Ctrl + B` hoặc nút `"Chế độ Bán hàng Toàn màn hình"`) cũng gọi đóng/mở Sidebar được ngay.
   - Truyền `sidebarHidden` và `onToggleDesktopSidebar={toggleDesktopSidebar}` xuống `Sidebar` và `Header`, đồng thời gắn class `main-wrapper-expanded` vào `<div className="main-wrapper ...">` khi `sidebarHidden === true`.
3. Mở [Header.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/shared/Header.tsx) (dòng 104–115):
   - Sửa nút Hamburger ở dòng 105: Bỏ class `lg:hidden` để trên máy tính nút này vẫn hiển thị, khi click trên máy tính sẽ gọi `onToggleDesktopSidebar()` (kèm tooltip `"Ẩn/Hiện thanh menu trái [Phím ~ hoặc Ctrl+B]"`).
   - Ngay bên phải nút này, khi `sidebarHidden === true` (chế độ đã ẩn Sidebar để bộc bớt chức năng thừa cho người bán hàng), hiển thị một thanh **Lối tắt Tác nghiệp Thu ngân (`Seller Quick Nav Bar`)** chỉ gồm đúng 4 nút gọn:
     1. **`🛒 Bán hàng POS`** (`/sales/pos`)
     2. **`🍹 Pha chế KDS`** (`/sales/preparation`)
     3. **`↩️ Đổi trả / Hoàn tiền`** (`/sales/returns`)
     4. **`🔐 Ca & Kiểm kê`** (`/sales/shifts`)

##### Bước A1.3 — Gắn tag "Hot Sale" trực tiếp trên Menu & Tách bố cục 2 cột cố định chiều cao tại [PosTerminalPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PosTerminalPage.tsx)
1. Mở [PosTerminalPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PosTerminalPage.tsx):
   - **Tại vùng lọc danh mục sản phẩm (`categories` và `filteredProducts`, khoảng dòng 100–135 và 381–394)**:
     - Thêm danh mục đặc biệt **`"🔥 Hot Sale"`** nằm ngay vị trí thứ 2 sau `"Tất cả"` trên thanh Category Pills.
     - Khi người bán chọn tab `"🔥 Hot Sale"`, lọc các món có `p.isHotSale === true` và sắp xếp theo `hotRank` tăng dần.
     - Đồng thời lọc bỏ các món nằm trong `p.lockedBranches?.includes(currentBranch)` để thu ngân chi nhánh nào chỉ nhìn thấy món mở bán tại chi nhánh đó.
   - **Tại vùng hiển thị từng Card món ăn trên Menu (dòng 397–441)**:
     - Ngay trên khung ảnh của mỗi món có `product.isHotSale === true`, gắn một nhãn (Badge) nổi bật ở góc dưới bên trái ảnh (hoặc góc trên):
       - Nội dung nhãn: **`🔥 HOT SALE`** (nền gradient cam-đỏ `bg-gradient-to-r from-orange-500 to-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm`).
     - *(Không gắn nhãn phím tắt lên từng thẻ món ăn hay từng nút nhỏ để tránh làm rối mắt giao diện; chỉ gắn phím tắt cho 5 thao tác cốt lõi tốn nhiều bước nhất).*
   - **Tại vùng bố cục tổng thể của trang POS (dòng 338–553)**:
     - Đặt khung lưới 2 cột chính (`grid grid-cols-1 lg:grid-cols-12 gap-4`) có chiều cao cố định khớp khung nhìn màn hình: `lg:h-[calc(100vh-5.25rem)] lg:overflow-hidden`.
     - **Cột bên trái (`lg:col-span-7 flex flex-col h-full overflow-hidden`)**:
       - Phần trên cùng (`shrink-0`): Thanh tiêu đề gọn + Nút **`🖥️ Ẩn Sidebar [~]`** + Nút **`⌨️ Phím tắt [?]`** + Ô tìm kiếm sản phẩm (`id="pos-product-search"`, placeholder `Tìm tên món, mã SKU... [Nhấn /]`) + Dải nút lọc Category (có `🔥 Hot Sale`).
       - Phần danh sách thẻ món (`flex-1 overflow-y-auto pr-1 pb-2`): Chỉ riêng vùng lưới thẻ món này cuộn lên xuống.
     - **Xóa khối "Tùy chọn món" đang nằm ở cuối cột trái (dòng 444–552)** và truyền toàn bộ các state/hàm tùy chỉnh món (`selectedProduct`, `customSize`, `customIce`, `customSugar`, `customToppings`, `customQty`, `customNote`, `onAddConfiguredItem`) sang component `PosCart` ở cột bên phải!

##### Bước A1.4 — Gom chung Recycle View (Tùy chỉnh món + Giỏ hàng + Hội viên) & Ghim cố định Đế Chốt Đơn tại [PosCart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/sales/PosCart.tsx)
1. Mở [PosCart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/sales/PosCart.tsx) (dòng 140–433):
   - Thay vì trả về 3 thẻ `<div className="card">` rời nhau như hiện tại, hãy bọc toàn bộ `PosCart` trong **1 thẻ `<div className="card flex flex-col h-full overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">` duy nhất**, chia làm **3 phần (Pinned Header + Unified Recycle View + Pinned Action Footer)**:
   - **PHẦN 1 — Thanh Header Giỏ hàng Cố định ở Đỉnh (`shrink-0 px-4 py-2.5 border-b bg-gray-50/80 dark:bg-gray-800/60 flex items-center justify-between gap-2`)**:
     - Bên trái: Tiêu đề `Đơn hàng hiện tại` + Badge tổng số ly (`{totalCups} ly`) + Nút chuyển nhanh loại đơn **`Tại quầy / Mang đi`**.
     - Bên phải: Nút **`Đơn giữ ({heldOrders.length})`**, nút **`Tạm giữ [Alt+H]`** và nút **`Xóa giỏ`**.
   - **PHẦN 2 — Khung Cuộn Gộp Chung Duy Nhất (`Unified Recycle View` — `flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 px-4 py-2 space-y-3`)**:
     - **Khối 2.1 (Nằm ngay đầu Recycle View): `Tùy chỉnh nhanh món đang chọn (Inline Item Customizer)`**:
       - Hiển thị tên và đơn giá của `selectedProduct` (món thu ngân vừa click trên menu bên trái).
       - Có nút thu gọn/mở rộng nhanh và hiển thị trên các hàng pill gọn:
         - Chọn `Size`: `M (Chuẩn)` | `L (+6.000 ₫)`.
         - Chọn `% Đá`: `100%` | `70%` | `50%` | `0%`.
         - Chọn `% Đường`: `100%` | `70%` | `50%` | `30%` | `0%`.
         - Chọn `Topping` (các pill bấm bật/tắt nhanh: *Trân châu đen +6k*, *Kem cheese +10k*, *Thạch đào +7k*, *Pudding trứng +8k*...).
         - Cụm tăng giảm số lượng `- / +` + Ô ghi chú nhanh cho ly + Nút **`➕ Cập nhật / Thêm vào giỏ`**.
     - **Khối 2.2 (Nằm giữa Recycle View): `Danh sách các món trong giỏ (Cart Items)`**:
       - Liệt kê từng dòng món đã có trong giỏ hàng (`cart`).
       - Mỗi dòng hiển thị gọn: Tên món + Badge `Size M/L`, dòng chữ nhỏ `Đá X% · Đường Y% · Topping...`, nút `[-]` `qty` `[+]`, thành tiền dòng, và nút xóa dòng `×`.
     - **Khối 2.3 (Nằm cuối Recycle View): `Khách hàng Hội viên & Mã Khuyến mãi`**:
       - Ô nhập SĐT hội viên (`id="pos-customer-phone"`) -> tự động nhận diện hạng thẻ và áp dụng đúng mức giảm đã quy định (`Thành viên mới: -2.000 ₫`, `Bạc: -5.000 ₫`, `Vàng: -5%`, `VIP: -10%`).
       - Dropdown chọn Mã Voucher khuyến mãi (`id="pos-voucher-select"`) + Ô ghi chú chung toàn đơn.
   - **PHẦN 3 — Đế Chốt Đơn & Các Nút Chức Năng Người Bán CỐ ĐỊNH ở Đáy (`shrink-0 border-t-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 space-y-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]`)**:
     - **Dòng 1 (Phương thức thanh toán & Tiền mặt)**:
       - 3 nút chọn phương thức (`Tiền mặt` | `Chuyển khoản QR` | `Thẻ`).
       - Nếu đang chọn `Tiền mặt`: Hiển thị ô nhập tiền khách đưa (`id="pos-cash-received"`) cùng hàng với các nút mệnh giá bấm nhanh: **`Đưa đủ [Alt+D]`**, **`50k`**, **`100k`**, **`200k`**, **`500k`** và hiển thị rõ **`Tiền thừa trả khách: X ₫`**.
     - **Dòng 2 (Tổng kết tiền đơn hàng trên 1 dải gọn)**:
       - Hiển thị: `Tạm tính: X ₫` · `Giảm giá (Voucher + Hạng thẻ): -Y ₫` · **`KHÁCH CẦN TRẢ: Z ₫` (chữ lớn `text-lg font-extrabold text-emerald-600`)**.
     - **Dòng 3 (Các nút chức năng chốt đơn cố định của người bán)**:
       - Nút phụ bên trái: **`⏸️ Giữ đơn [Alt+H]`** (chiếm 30% chiều ngang).
       - Nút chính bên phải (`id="pos-complete-btn"`, chiếm 70% chiều ngang): **`✅ HOÀN TẤT BÁN HÀNG & IN PHIẾU [Ctrl+Enter]`**.

##### Bước A1.5 — Cài đặt Đúng 5 Phím Tắt Thiết Yếu Nhất (Không lạm dụng tràn lan, không dùng F1..F12) & Đồng bộ hàm `createPosOrder`
1. Trong [PosTerminalPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PosTerminalPage.tsx):
   - **Nguyên tắc**: Không gắn phím tắt tràn lan gây rối giao diện; chỉ trang bị **đúng 5 phím tắt cốt lõi giúp rút gọn các thao tác lặp lại nhiều bước nhất của thu ngân**:
     1. **Phím `/` (hoặc `Ctrl + K`)**: Đưa con trỏ chuột thẳng vào ô tìm kiếm món `#pos-product-search` và bôi đen từ khóa cũ (đỡ phải rê chuột lên đầu trang tìm kiếm rồi xóa chữ cũ).
     2. **Phím `` ` `` hoặc `~` (hoặc `Ctrl + B`)**: Bật / tắt nhanh chế độ **Ẩn Sidebar toàn màn hình (POS Focus Mode)**.
     3. **Tổ hợp `Alt + D`**: Tự động điền số tiền mặt khách đưa bằng đúng tổng tiền đơn hàng (**`Đưa đủ`** — giúp thu ngân không phải gõ tay 6–7 chữ số tiền mặt).
     4. **Tổ hợp `Alt + H`**: **Tạm giữ đơn hàng hiện tại (`Hold Order`)** để phục vụ khách kế tiếp ngay lập tức.
     5. **Tổ hợp `Ctrl + Enter`**: Kích hoạt nút **`Hoàn tất bán hàng & Xuất hóa đơn`** từ bất kỳ vị trí nào (kèm phím `?` mở bảng ghi chú gọn 5 phím tắt này và `Esc` để đóng hộp thoại).
2. Mở [sales-orders-store.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/sales-orders-store.ts) tại dòng 553–595 (`createPosOrder`):
   - Thêm tham số `flatDiscount?: number` và `totalDiscountAmount?: number` vào `params` của `createPosOrder` để lưu đúng tổng tiền giảm giá (bao gồm cả mức giảm cố định `2.000 ₫` / `5.000 ₫` của hạng thẻ và giảm giá `%`) do đơn hàng truyền sang.
   - Tại dòng 579–588, khi tạo mảng `items` của `SalesOrder`, bổ sung lưu thêm `productId: String(i.product.id)` và `sku: i.product.sku` vào từng `SalesOrderItem`.
   - Trong [PosCart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/sales/PosCart.tsx#L121-L135), truyền `flatDiscount` vào lời gọi `createPosOrder(...)`.

---

### TASK A2: Hàng đợi Pha chế (`/sales/preparation`) — Thu gọn thông tin & Hiển thị Công thức Chế biến

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên
- Gọn các thông tin lại.
- Pha chế cần hiển thị công thức chế biến.

#### 🔍 Phân tích hiện trạng các dòng code đang bị lỗi trong Project
1. **Tại [PreparationQueuePage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PreparationQueuePage.tsx#L194-L403)**:
   - Dòng 210–252: 4 thẻ `StatCard` lớn chiếm hết một hàng cao, cộng thêm khung Card bộ lọc 3 cột ở dòng 254–286 chiếm thêm một hàng nữa, làm phần danh sách đơn chờ pha chế bị đẩy xuống thấp.
   - Dòng 61–80 (`expandToCupLabels`) và dòng 305–338: Một đơn hàng có 6 ly giống hệt nhau bị tách ra thành 6 khối thẻ xếp dọc bên trong ô `<td>`, làm mỗi dòng đơn hàng cao hàng trăm pixel, thông tin lặp lại rối mắt.
   - Hoàn toàn chưa có khu vực hiển thị **Công thức chế biến (`Định mức nguyên liệu + Các bước pha`)** cho nhân viên pha chế.

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 1

##### Bước A2.1 — Thu gọn bố cục màn hình Pha chế (Compact KDS Layout) tại [PreparationQueuePage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PreparationQueuePage.tsx)
1. Mở [PreparationQueuePage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PreparationQueuePage.tsx):
   - **Gộp hàng KPI Cards và Thanh lọc (dòng 210–286) thành 1 Thanh Công Cụ Pha Chế Gọn (`Compact KDS Control Bar`)**:
     - Đặt trên cùng 1 hàng ngang:
       - 4 nút lọc trạng thái kiêm bộ đếm số lượng (`Tất cả (N)` · `⏳ Chờ pha (X)` · `🧋 Đang pha (Y)` · `✅ Sẵn sàng (Z)` · `🔥 Quá 10 phút (W)`).
       - Ô tìm kiếm nhanh mã đơn / tên món.
       - Bộ lọc Chi nhánh (tự động khóa theo `scopedBranch()` nếu là nhân viên chi nhánh).
   - **Thu gọn cách hiển thị món trong mỗi đơn hàng (dòng 61–80 và 305–338)**:
     - Thay vì nhân bản nhiều dòng thẻ giống hệt nhau khi một dòng `SalesOrderItem` có `qty > 1`:
       - Hiển thị **1 dòng gộp gọn gàng cho mỗi `SalesOrderItem`**:
         - Ví dụ: **`x3 Trà sữa truyền thống [Size L]`** · Badge `Đá 50%` · Badge `Đường 70%` · Badge `+Trân châu đen` · Nhãn tem `[Ly 1–3 / 4]`.
       - Có nút nhỏ `[Tách từng ly]` nếu pha chế muốn đánh dấu hoàn thành lẻ từng ly, mặc định hiển thị gộp gọn giúp chiều cao mỗi đơn giảm đi 60–70%!
     - Ở cột thông tin đơn hàng: Gom gọn `Mã đơn (DH-00125)` + `Loại đơn (Tại quầy / Mang đi)` + `Chi nhánh (CN01)` + `Thời gian chờ (4 phút)` vào 1 cụm nhỏ gọn, bỏ các dòng chữ mô tả thừa.

##### Bước A2.2 — Tích hợp "Bảng Công Thức Chế Biến (`Barista Recipe Panel`)" ngay trên màn hình Pha chế
1. Trong [PreparationQueuePage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PreparationQueuePage.tsx):
   - Chia vùng làm việc bên dưới thành lưới 12 cột:
     - **Bên trái (`lg:col-span-8`)**: Bảng / Thẻ danh sách các đơn đang chờ và đang pha chế (đã thu gọn). Trên mỗi dòng món trong đơn có nút bấm **`📖 Công thức pha`**.
     - **Bên phải (`lg:col-span-4`) — Khung Cố định `Công thức Chế biến Chi tiết (Barista Recipe Guide)`** (tự động hiển thị công thức của món mà pha chế vừa bấm vào, hoặc món đầu tiên của đơn đang ở trạng thái `"Đang pha chế"`):
       - **Phần 1 — Header Món đang pha**:
         - Tên món, Mã SKU, Số lượng cần pha (`xN ly`), Size (`M` hoặc `L`), Mức Đá (`100% / 70% / 50% / 0%`), Mức Đường (`100% / 70% / 50% / 30% / 0%`), danh sách Topping cần cho vào ly.
       - **Phần 2 — Bảng Định lượng Nguyên liệu Cần Đong**:
         - Tra cứu dữ liệu công thức của món từ `POS_PRODUCTS` (theo `sku`, `productId` hoặc tên món) kết hợp với `useDemoState().state.recipes`.
         - Hiển thị bảng 3 cột rõ ràng từ dữ liệu định mức của món:
           1. `Tên nguyên liệu (Cấp F0/F1)`
           2. `Định mức chuẩn 1 ly`
           3. **`Định lượng cần đong (Theo Size / Đá / Đường & Số lượng ly của đơn)`** (in đậm màu xanh lá để pha chế nhìn 1 giây là đong được ngay; nếu món có giảm đường/đá như `Đường 70%`, `Đá 50%`, hiển thị rõ nhãn ghi chú mức điều chỉnh bên cạnh nguyên liệu đường và đá).
         - Hiển thị thêm dòng định lượng cho từng **Topping** khách chọn trong đơn hàng.
       - **Phần 3 — Các bước Chế biến tiêu chuẩn (`Step-by-Step Instructions`)**:
         - Hiển thị danh sách đánh số `Bước 1`, `Bước 2`, `Bước 3`, `Bước 4` từ `prepSteps` của món đó, kèm thời gian lắc bình shaker và quy cách dập nắp/dán tem.

---

### TASK A3: Mở/Đóng Ca, Rule Kiểm Kê & Chốt Ca Xác Thực 2 Bên (`/sales/shifts`)

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên
- Tùy chỉnh thêm đóng ca, kiểm kê.
- Có thêm rule kiểm kê.
- Tại sao hiện tại người mở ca khác với người đóng ca.
- Chốt ca = xác thực 2 bên.
- *(Kết hợp chỉ đạo ở phần Quản lý)*: Mở đóng ca chỉ nên quy định trong phạm vi chi nhánh để mở ca, do Quản lý tổng không có mặt trực tiếp không thể quản lý được.

#### 🔍 Phân tích hiện trạng các dòng code đang bị lỗi trong Project
1. **Tại [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx#L82-L108)**:
   - Ca đang mở `CA-001` tại `CN01` (dòng 84–90) có `cashier: "Nguyễn An"`, nhưng tài khoản thu ngân đang đăng nhập lại có tên `"Lê Quốc Tuấn Anh"` ([auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts#L121)). Khi bấm đóng ca (dòng 254), hệ thống gán `closedBy: currentActorName()` (`"Lê Quốc Tuấn Anh"`) làm cho **Người mở ca (`Nguyễn An`) khác với Người đóng ca (`Lê Quốc Tuấn Anh`)** mà không có bất kỳ cảnh báo hay lý do bàn giao nào!
2. **Tại [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx#L495)**:
   - Form **"Mở ca mới"** đang bị bọc trong `{!isCashier() && (...)}`, tức là cấm Thu ngân mở ca nhưng lại cho Quản trị tổng (`owner`) mở ca!
3. **Tại [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx#L249-L262) (`requestClose`)**:
   - Đang viết: `const autoClose = isCashier(); ... status: autoClose ? "closed" : "closing-requested"`. Nghĩa là **Thu ngân tự bấm đóng ca một mình là ca đóng luôn (`"closed"`)**, không hề có xác thực 2 bên!
4. **Tại [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx#L160-L170) (`cashFromSales`)**:
   - Đang cộng tổng tất cả các đơn tiền mặt của chi nhánh trong toàn bộ lịch sử mà không lọc theo ca hoặc ngày của ca.

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 1

##### Bước A3.1 — Mở rộng cấu trúc dữ liệu Ca làm việc (`ShiftRecord`) và Kiểm kê (`InventoryCheckItem`) tại [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx)
1. Mở [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx) tại dòng 11–79:
   - Trong `InventoryCheckItem` (dòng 28–36), bổ sung thêm:
     - `group`: `"A - Bắt buộc đếm"` | `"B - Phụ trợ"` (để áp dụng Rule kiểm kê bắt buộc).
     - `tolerancePct`: Ngưỡng dung sai hao hụt cho phép (mặc định `2%` cho mức xanh, `5%` cho mức vàng).
     - `varianceReason`: Lý do giải trình khi chênh lệch vượt ngưỡng `2%` (`"Hao hụt tự nhiên trong định mức"`, `"Pha hỏng / Làm lại món cho khách"`, `"Đổ vỡ tại quầy"`, `"Sai lệch muỗng đong"`, `"Chưa rõ - Chờ kiểm đếm lại"`).
   - Trong `ShiftRecord` (dòng 38–51), bổ sung thêm các trường phục vụ **Xử lý khác người mở/đóng** và **Xác thực 2 bên**:
     - `openingCashier`: Tên nhân viên mở ca nhận két đầu ca.
     - `closingCashier`: Tên nhân viên thực hiện đếm tiền & kiểm kê cuối ca (Bên bàn giao - Bên 1).
     - `differentCloserReason?: string`: Lý do bắt buộc nếu `closingCashier !== openingCashier`.
     - `handoverNote?: string`: Ghi chú bàn giao giữa ca.
     - `party1SignedBy?: string` & `party1SignedAt?: string`: Chữ ký xác nhận của Bên 1 (Thu ngân bàn giao).
     - `party2VerifierName?: string`, `party2VerifierRole?: string`, `party2SignedAt?: string`: Chữ ký xác thực của Bên 2 (Quản lý chi nhánh hoặc Ca trưởng ca tiếp theo nhận bàn giao).
     - `recountRequired?: boolean`: Cờ đánh dấu ca có chênh lệch vượt ngưỡng đỏ (`> 5%` nguyên liệu hoặc `> 20.000 ₫` tiền mặt) bắt buộc Bên 2 phải tích xác nhận đã kiểm đếm lại trực tiếp.
   - Tại mảng `INITIAL_SHIFTS` (dòng 82–108):
     - Sửa ca `CA-001` (`CN01`) có `cashier` / `openingCashier` là `"Lê Quốc Tuấn Anh"` (khớp với tài khoản Thu ngân demo), đồng thời thêm 1 ca mẫu ở `CN05` có tình huống bàn giao giữa ca (Người mở ca: `"Phạm Hương"`, Người đóng ca: `"Đỗ Quang"`, Lý do: `"Bàn giao giữa ca lúc 11:30 do Nguyễn/Phạm Hương có lịch họp chi nhánh, đã đồng kiểm quỹ tiền mặt tại quầy"`) để giảng viên nhìn thấy ngay cả trường hợp chuẩn lẫn trường hợp bàn giao hợp lệ!

##### Bước A3.2 — Sửa phân quyền Mở/Đóng Ca theo đúng phạm vi Chi nhánh (Dòng 495)
1. Tại dòng 495 của [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx):
   - Thay điều kiện `{!isCashier() && (...)}` bằng điều kiện kiểm tra:
     - **Nếu là Thu ngân (`cashier`) hoặc Quản lý chi nhánh (`manager`)**: Hiển thị form **"Mở ca mới tại Chi nhánh của bạn"** (khóa cứng ô Chi nhánh về đúng `scopedBranch()`, tức `CN01` cho Thu ngân và `CN05` cho Quản lý chi nhánh; ô chọn Nhân viên mở ca chỉ liệt kê nhân viên thuộc đúng chi nhánh đó).
     - **Nếu là Quản trị tổng (`owner`)**: **Ẩn form mở ca trực tiếp** và hiển thị một thẻ thông báo rõ ràng:
       > **"Quy tắc quản trị chuỗi: Việc Mở ca, Kiểm đếm tiền mặt và Chốt ca xác thực 2 bên chỉ được thực hiện trực tiếp trong phạm vi Chi nhánh bởi Nhân viên và Quản lý chi nhánh có mặt tại quầy. Quản trị tổng theo dõi toàn bộ biên bản và hậu kiểm tại trang Đối soát ca (`/stores/shift-reconciliation`)."**

##### Bước A3.3 — Xây dựng cơ chế kiểm tra "Tại sao Người mở ca khác Người đóng ca"
1. Trong khung **Thao tác Đóng ca & Kiểm kê** (khoảng dòng 330–490 của [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx)):
   - Thêm ô chọn **`Nhân viên thực hiện đóng ca (Bên 1 - Bàn giao)`** (chỉ liệt kê nhân viên thuộc chi nhánh của ca đó, mặc định lấy tên người đang đăng nhập nếu thuộc chi nhánh đó).
   - Đặt biểu thức kiểm tra `const isDifferentCloser = closingCashierName.trim() !== activeShift.cashier.trim();`.
   - **Nếu `isDifferentCloser === true`**:
     - Hiển thị ngay một khung cảnh báo viền cam rõ ràng:
       - Tiêu đề: **`⚠️ Phát hiện Người đóng ca (${closingCashierName}) KHÁC với Người mở ca (${activeShift.cashier})`**
       - Giải thích quy tắc: *"Theo quy định kiểm soát nội bộ, người nhận két mở ca phải là người bàn giao đóng ca. Nếu có sự thay đổi người đóng ca, bắt buộc phải khai báo Lý do bàn giao giữa ca và có xác nhận của Quản lý chi nhánh."*
       - Dropdown bắt buộc chọn **Lý do người đóng ca khác người mở ca**:
         1. `Bàn giao giữa ca do nhân viên mở ca có việc đột xuất / ốm đau (Đã kiểm quỹ lúc giao ca)`
         2. `Điều chuyển ca / Tăng ca theo phân công của Quản lý chi nhánh`
         3. `Quản lý chi nhánh thực hiện đóng ca cưỡng bức do nhân viên quên đóng ca`
       - Ô nhập `Biên bản / Thời điểm bàn giao giữa ca`.
     - Trong hàm `requestClose`: Nếu `isDifferentCloser && !differentCloserReason`, chặn không cho gửi chốt ca và báo lỗi yêu cầu chọn lý do.

##### Bước A3.4 — Thiết lập "Bộ Rule Kiểm Kê Cuối Ca (`Stock Count Rules`)" trực quan
1. Ngay đầu phần **Kiểm kê nguyên liệu cuối ca** trong [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx) (khoảng dòng 395):
   - Hiển thị hộp **"📋 Bộ Quy Tắc Kiểm Kê Cuối Ca (Inventory Count Rules)"** gồm 4 quy tắc:
     1. **Rule 1 (Bắt buộc đếm thực tế 100% nguyên liệu nhóm A)**: Mọi nguyên liệu chính tại quầy phải được nhập số lượng thực đếm, không được bỏ trống.
     2. **Rule 2 (Mức Xanh — Trong ngưỡng hao hụt cho phép `<= 2%`)**: Đánh giá là **Đạt chuẩn (Mức Xanh)**, không bắt buộc giải trình.
     3. **Rule 3 (Mức Vàng — Lệch cảnh báo `2% - 5%`)**: Đánh giá **Cần giải trình (Mức Vàng)** -> Bắt buộc chọn Lý do hao hụt và ghi chú trên từng dòng nguyên liệu bị lệch.
     4. **Rule 4 (Mức Đỏ — Lệch nghiêm trọng `> 5%` hoặc Lệch tiền mặt `> 20.000 ₫`)**: Đánh giá **Vượt ngưỡng an toàn (Mức Đỏ)** -> Hệ thống bật cờ `Yêu cầu đồng kiểm đếm lại trực tiếp (Recount Required)` buộc Bên thứ 2 (Quản lý chi nhánh) phải tích xác nhận đã đếm lại tại quầy mới chốt ca được.
2. Trên bảng kiểm kê nguyên liệu (dòng 405–465):
   - Thêm cột **`Mức chênh lệch`** (hiển thị giá trị lệch và mức đánh giá từ hệ thống).
   - Thêm cột **`Đánh giá theo Rule`** hiển thị badge màu Xanh (`≤ 2% Đạt chuẩn`), Vàng (`2–5% Cần giải trình`), hoặc Đỏ (`> 5% Vượt ngưỡng - Cần đếm lại`).
   - Thêm cột **`Nguyên nhân lệch (Dropdown)`** bên cạnh ô ghi chú khi dòng đó có cảnh báo lệch.

##### Bước A3.5 — Thực thi quy trình "Chốt Ca = Xác Thực 2 Bên (`Two-Party Verification`)"
1. Sửa hoàn toàn hàm `requestClose` và `approveClose` trong [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx) (dòng 245–290):
   - **Bước 1 — Ký bàn giao Bên thứ 1 (Người đóng ca / Thu ngân đứng quầy)**:
     - Khi thu ngân đã nhập tiền mặt thực đếm, hoàn thành bảng kiểm kê theo đúng Rule kiểm kê, và (nếu khác người mở ca) đã chọn lý do bàn giao -> bấm nút **`✍️ [Bên 1] Ký xác nhận Bàn giao & Gửi chờ Bên 2 đối chứng`**.
     - Cập nhật trạng thái ca thành `"closing-requested"` (tuyệt đối không chuyển thẳng sang `"closed"`!), lưu `party1SignedBy` và `party1SignedAt`.
   - **Bước 2 — Ký xác thực Bên thứ 2 (Quản lý chi nhánh hoặc Ca trưởng nhận bàn giao)**:
     - Khi ca đang ở trạng thái `"closing-requested"`, hiển thị khung **`🔐 Xác Thực Đóng Ca Bên Thứ 2 (Bắt buộc 2 bên độc lập xác nhận)`**:
       - Ô chọn **`Người xác thực Bên 2`** (chỉ liệt kê Quản lý chi nhánh và Ca trưởng của chi nhánh đó, và **tự động loại trừ tên của Người ký Bên 1** để đảm bảo 1 người không thể vừa ký Bên 1 vừa ký Bên 2!).
       - 2 ô checkbox bắt buộc tích:
         - `[✓] Tôi (Bên 2) xác nhận đã trực tiếp đếm đối chiếu Tiền mặt thực tế trong két khớp với biên bản.`
         - `[✓] Tôi (Bên 2) xác nhận đã kiểm tra số liệu Kiểm kê nguyên liệu quầy (và đã đếm lại các mục vượt ngưỡng >5% nếu có).`
       - Ô nhập **`Mã PIN xác thực tại quầy của Bên 2`** (Mặc định mã PIN demo là `1234`, ghi chú rõ `(Mã PIN demo: 1234)` ngay cạnh label để giảng viên dễ dàng bấm thử nghiệm).
       - Nút **`✅ [Bên 2] Xác thực Đồng Kiểm & Chốt Ca Chính Thức`**.
     - Khi bấm nút này, kiểm tra đủ chữ ký Bên 1, tên Bên 2 khác Bên 1, đã tích đủ 2 checkbox và đúng mã PIN -> Chuyển trạng thái ca sang `"closed"`, lưu `party2VerifierName`, `party2SignedAt`, đồng thời hiển thị con dấu **`ĐÃ CHỐT CA — XÁC THỰC 2 BÊN`** có đủ tên và giờ ký của cả Bên 1 và Bên 2 trên thẻ lịch sử ca!


---

### TASK A4: Đổi trả & Hoàn tiền (`/sales/returns`) — Thanh Search Đơn hàng, Đổi 1 Món vs Toàn bộ Đơn, Hiển thị Tiền hoàn Tự động (`Read-Only`) & Ghi vào Đơn gốc vs Tạo đơn mới

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên
- Thêm thanh search cho đơn cần xử lý, có thể search bằng mã đơn hàng.
- Đổi một món trong hóa đơn hoặc đổi toàn bộ đơn.
- Sau khi hoàn thành khiếu nại hoàn tiền thì có thêm:
  - Ghi lại thay đổi vào đơn hàng (ưu tiên). Chi phí hoàn thì tự động tính toán chứ không để gõ tay.
  - Ghi lại mới hoàn toàn.

#### 🔍 Phân tích hiện trạng các dòng code đang bị lỗi trong Project
1. **Tại [SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx#L397-L413)**:
   - Trong Modal `"Tạo phiếu đổi trả / hoàn tiền"`, ô chọn `"Đơn hàng gốc"` đang dùng một thẻ `<select>` HTML đơn giản đổ toàn bộ danh sách `orders` mà **không có ô tìm kiếm (search bar)** theo mã đơn hàng `DH-...`.
   - Ở đầu trang chính (dòng 254–286) chỉ có ô lọc các phiếu đổi trả đã tạo, chưa có thanh search để tra cứu một đơn hàng bán ra cần lập phiếu xử lý.
2. **Tại [SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx#L140-L149) (`handleSelectOrder`) và dòng 430–472**:
   - Khi chọn đơn gốc, hệ thống chỉ gộp tất cả tên món thành 1 chuỗi text (`formItemSummary`) và lấy nguyên `order.total` gán vào ô `<input type="number">` (`formAmount` ở dòng 462–471).
   - Hệ thống **chưa cho phép chọn đổi/hoàn 1 món lẻ trong hóa đơn** (kèm số lượng ly lỗi và món thay thế) hay **chọn đổi/hoàn toàn bộ đơn**.
   - Ô `Số tiền hoàn (VND)` ở dòng 462 đang cho phép thu ngân **tự gõ tay số tiền bất kỳ**, vi phạm yêu cầu *"Chi phí hoàn thì tự động tính toán chứ không để tay"*.
3. **Tại [SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx#L182-L201) (`updateStatus`)**:
   - Khi hoàn tất phiếu đổi trả, hệ thống chỉ gọi `updateOrderPayment(target.orderId, "refunded")` nếu là hoàn tiền (biến cả đơn 500k thành đã hoàn sạch dù chỉ hoàn 1 ly 35k!), còn nếu là đổi món (`exchange`) thì không cập nhật gì vào đơn hàng gốc và cũng không có tùy chọn ghi lại vào đơn gốc hay tạo đơn mới hoàn toàn.

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 1

##### Bước A4.1 — Mở rộng cấu trúc dữ liệu Đơn hàng & Hàm xử lý tại [sales-orders-store.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/sales-orders-store.ts)
1. Mở [sales-orders-store.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/sales-orders-store.ts) tại dòng 10–45:
   - Mở rộng kiểu `PaymentStatus` (dòng 4): Thêm giá trị `"partially-refunded"` (hiển thị nhãn `"Hoàn tiền 1 phần / Đã điều chỉnh"`).
   - Mở rộng interface `SalesOrderItem` (dòng 10–18):
     - Thêm `returnedQty?: number` (số lượng ly của dòng này đã bị hoàn/đổi).
     - Thêm `returnAction?: "none" | "refunded" | "exchanged"` (trạng thái xử lý khiếu nại của dòng món này).
     - Thêm `replacementName?: string` và `replacementUnitPrice?: number` (tên và đơn giá món mới nếu đổi sang món khác).
   - Tạo mới interface `OrderReturnAmendment` (Lịch sử ghi nhận thay đổi trực tiếp trên đơn hàng):
     - Gồm các trường: `id`, `returnCode` (mã phiếu đổi trả `RT-0001`), `createdAt`, `actor`, `scope` (`"single-item" | "full-order"`), `resolutionType` (`"refund" | "exchange"`), `recordMode` (`"amend-original" | "new-order"`), `affectedLines` (danh sách các món đã đổi/hoàn kèm số lượng và món thay thế), `autoRefundCustomerAmount` (số tiền hoàn trả khách tự động do Backend/Store cung cấp), `internalRemakeCost` (chi phí nguyên liệu làm lại nội bộ), `previousOrderTotal`, `newOrderNetTotal`, `newCreatedOrderId` (nếu chọn ghi mới hoàn toàn).
   - Trong interface `SalesOrder` (dòng 20–43), thêm:
     - `amendments?: OrderReturnAmendment[]`: Mảng lịch sử các lần điều chỉnh trực tiếp trên đơn hàng gốc.
     - `refundedAmount?: number`: Tổng tiền đã hoàn trả cho khách trên đơn này.
     - `netTotal?: number`: Tổng tiền thực thu sau khi điều chỉnh.
     - `parentOrderId?: string`: Nếu đơn này được tạo mới từ một phiếu đổi trả, lưu mã đơn gốc (ví dụ `"DH-00125"`).
     - `replacedByOrderId?: string`: Nếu đơn gốc đã được thay thế bằng đơn mới hoàn toàn, lưu mã đơn mới (ví dụ `"DH-00125-R1"`).
2. Viết 2 hàm nghiệp vụ mới xuất ra từ [sales-orders-store.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/sales-orders-store.ts):
   - **Hàm 1: `applyReturnToOriginalOrder(orderId, amendment)` (Chế độ 1 — Ưu tiên: Ghi lại thay đổi trực tiếp vào đơn hàng gốc)**:
     - Tìm đơn hàng có `id === orderId` trong `milktyway_sales_orders_v1`.
     - Cập nhật từng dòng `items[idx]` theo `amendment.affectedLines` (ghi nhận `returnedQty`, `returnAction`, `replacementName`).
     - Cập nhật `refundedAmount` và `netTotal` của đơn hàng gốc.
     - Nếu `amendment.scope === "full-order"` và `resolutionType === "refund"`, đặt `paymentStatus = "refunded"`; nếu hoàn 1 phần hoặc đổi món có điều chỉnh, đặt `paymentStatus = "partially-refunded"`.
     - Đẩy `amendment` vào mảng `order.amendments` và đồng bộ sang cả `milktyway_invoices_v1` để khi mở trang Đơn hàng (`/sales/orders`) hoặc Chi tiết Hóa đơn (`/invoices/details`) đều thấy rõ lịch sử điều chỉnh trên đơn gốc!
   - **Hàm 2: `createNewOrderFromReturn(orderId, amendment)` (Chế độ 2 — Tùy chọn: Ghi lại mới hoàn toàn)**:
     - Đánh dấu đơn gốc `orderId` có `paymentStatus = "refunded"`, `replacedByOrderId = "${orderId}-R${nextIndex}"`, và ghi `amendment` vào `order.amendments`.
     - Khởi tạo một bản ghi `SalesOrder` mới hoàn toàn có `id = "${orderId}-R${nextIndex}"`, `parentOrderId = orderId`, chứa danh sách các món còn giữ nguyên cộng với các món mới đổi thay thế và lưu vào đầu danh sách `milktyway_sales_orders_v1`.

##### Bước A4.2 — Hiển thị Chi phí Hoàn / Đổi Tự động trên UI (Khóa gõ tay 100% — Việc tính toán thuộc về Backend/Store)
1. Trong [SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx):
   - Thay vì cho thu ngân tự gõ tay số tiền hoàn vào ô `<input type="number">`, khi thu ngân tích chọn món cần đổi/hoàn (`scope === "single-item"` hoặc `scope === "full-order"`) và hình thức xử lý (`refund` hoặc `exchange`), Frontend lấy kết quả chi phí hoàn đã tính sẵn từ hàm store/Backend (`getReturnCostPreview(selectedOrder, scope, selectedLines, resolutionType)`) gồm các trường hiển thị:
     1. `returnedOriginalValue`: Giá niêm yết của các món được tích chọn trả lại.
     2. `allocatedDiscountAmount`: Khấu trừ khuyến mãi/hạng thành viên phân bổ trên món đó.
     3. `replacementValue`: Giá trị món mới thay thế (nếu khách chọn `Đổi sang món khác`).
     4. `autoRefundAmount`: **Số tiền hoàn trả khách tự động (`readOnly`, khóa không cho sửa tay)**.
     5. `internalRemakeCost`: Chi phí làm lại nội bộ của cửa hàng (chỉ hiển thị để quản lý theo dõi).

##### Bước A4.3 — Xây dựng Giao diện Thanh Search Đơn hàng & Modal Đổi trả Tự động tại [SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx)
1. Mở [SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx):
   - **Khu vực 1 — Thêm "Thanh Search Đơn Hàng Cần Xử Lý" ngay đầu trang (trước dòng 254)**:
     - Đặt một khung nổi bật có tiêu đề: **`🔎 Tìm nhanh Đơn hàng cần xử lý Đổi trả / Khiếu nại (Search bằng Mã đơn hàng)`**:
       - Ô input lớn có placeholder: `Nhập mã đơn hàng (VD: DH-00125, DH-00124), mã hóa đơn hoặc SĐT khách hàng...`.
       - Khi thu ngân gõ mã đơn (hoặc chọn từ danh sách gợi ý bên dưới ô search): Hiển thị ngay thông tin tóm tắt của đơn hàng đó (Mã đơn, Chi nhánh, Khách hàng, Thời gian, Danh sách từng món trong đơn, Tổng tiền) và 2 nút bấm nhanh:
         - **`🔄 Đổi 1 món trong đơn này`** (Mở Modal ở chế độ `scope = "single-item"`).
         - **`💯 Đổi / Hoàn toàn bộ đơn này`** (Mở Modal ở chế độ `scope = "full-order"`).
   - **Khu vực 2 — Bên trong Modal Tạo Phiếu Đổi Trả (dòng 390–495)**:
     - **Thay thế `<select>` chọn đơn gốc (dòng 397–413)**: Bằng một ô **Searchable Order Input** (có ô gõ tìm mã đơn `DH-...` kết hợp danh sách chọn bên dưới, lọc theo chi nhánh của thu ngân).
     - **Thêm bộ chọn Phạm vi xử lý (`Scope Selector`)**:
       - Nút 1: **`🥤 Đổi / Hoàn một (hoặc vài) món trong hóa đơn`**.
       - Nút 2: **`🧾 Đổi / Hoàn toàn bộ đơn hàng`**.
     - **Hiển thị Bảng chọn món chi tiết từ đơn hàng gốc**:
       - Mỗi dòng món của đơn gốc có: Checkbox chọn · Tên món & Tùy chỉnh (Size/Đá/Đường) · Đơn giá gốc · Bộ chọn `Số lượng ly lỗi (1 .. qty)` · Dropdown `Chọn món đổi thay thế` (lấy từ `POS_PRODUCTS`, chỉ hiện khi chọn hình thức `Đổi món mới`).
     - **Thay thế ô `<input type="number">` nhập tiền hoàn (dòng 462–471) bằng Bảng Tự Động Tính Toán Chi Phí Hoàn (`Read-Only Auto Calculation Box`)**:
       - Hiển thị 4 dòng minh bạch:
         1. `Giá niêm yết món lỗi đã chọn`: `X ₫`
         2. `Khấu trừ khuyến mãi phân bổ theo đơn gốc`: `-Y ₫`
         3. `Giá trị món đổi mới / Chi phí làm lại`: `Z ₫`
         4. **`SỐ TIỀN HOÀN TRẢ KHÁCH (Tự động tính - Không nhập tay)`**: **`W ₫`** (ô hiển thị khóa cứng `readOnly`, có nhãn `Đã tính tự động theo hóa đơn gốc`).
     - **Thêm bộ chọn Chế độ Ghi nhận sau khi hoàn thành (`Record Mode Selector`)**:
       - **Tùy chọn 1 (Mặc định chọn sẵn — Có badge `Ưu tiên`)**: **`Ghi lại thay đổi trực tiếp vào đơn hàng gốc (Cập nhật hóa đơn gốc & lưu lịch sử điều chỉnh)`**.
       - **Tùy chọn 2**: **`Ghi lại thành đơn hàng mới hoàn toàn (Đóng đơn cũ & tạo mã đơn mới DH-...-R1)`**.

---

### TASK A5: Khuyến mãi & Khuyến mãi Chi nhánh (`/marketing/promotions` & `/marketing/branch-promotions`)

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên
- **Nhân viên — khuyến mãi**: Điều chỉnh `%` nội dung sao cho danh sách khuyến mãi bự ra.
- **Quản lý — `/marketing/promotions`**:
  - Xem các ràng buộc có liên quan tới nhau hay không?
  - Hết khuyến mãi như thế nào? Hết thời gian hay giới hạn sử dụng hay ngân sách tối đa.
  - MỖI KHUYẾN MÃI: `TỔNG / SỐ LƯỢNG / TIỀN` — Chủ yếu xem số nào sẽ có trước, số nào có sau để suy ra giới hạn.
  - Thay vì ghi tiền, số, có thể ghi quy định: `"100 người đến trước"`.
- **Quản lý — `/marketing/branch-promotions`**:
  - Quyền điều chỉnh các chương trình khuyến mãi chỉ có Admin (`owner`).

#### 🔍 Phân tích hiện trạng các dòng code đang bị lỗi trong Project
1. **Tại [PromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PromotionsPage.tsx#L283-L450)**:
   - Phần Header + 4 thẻ `StatCard` + Khung lọc đang chiếm quá nhiều diện tích dọc ở nửa trên màn hình, còn bảng danh sách khuyến mãi bên dưới bị chia nhỏ thành 9 cột hẹp khiến tên khuyến mãi, mức giảm `%` và thanh tiến độ bị bó hẹp.
   - Cấu trúc `PromotionRecord` (dòng 13–35) mới chỉ có `usageCount`, `usageLimit`, `budgetUsed`, `budgetLimit` rời rạc; chưa có phân tích **cái nào chạm trần trước (`Binding Limit`)**, chưa có trường **Ràng buộc tương tác (`stacking / exclusivity`)**, và chưa có trường **Quy định tự nhiên (`"100 người đến trước"`)**.
2. **Tại [BranchPromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/BranchPromotionsPage.tsx#L77-L145)**:
   - Không kiểm tra quyền `can("promotion.manage")` hay `getCurrentRole() === "owner"`, nên Quản lý chi nhánh vào vẫn bấm bật/tắt được khuyến mãi của mọi chi nhánh.
   - Lỗi đảo ngược logic ở dòng 77–90 và 111–145 khi `promo.branchMode === "exclude"`.

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 1

##### Bước A5.1 — Điều chỉnh tỷ lệ `%` bố cục để Danh sách Khuyến mãi to, rộng và nổi bật tại [PromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PromotionsPage.tsx)
1. Mở [PromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PromotionsPage.tsx) (dòng 283–455):
   - **Thu gọn phần trên**: Gom 4 chỉ số thống kê (`Tổng chương trình`, `Đang chạy`, `Ngân sách đã dùng`, `Tổng lượt áp dụng`) và thanh tìm kiếm/lọc vào **1 thanh ngang gọn gàng duy nhất** ở đầu trang, nhường **80% diện tích màn hình** cho bảng danh sách khuyến mãi.
   - **Quy hoạch lại độ rộng `%` của các cột trong bảng (`w-[...%]`) và tăng kích thước chữ/badge**:
     - Cột 1 (`w-[26%]`): **Mã, Tên chương trình & Quy định tự nhiên** (Tên chương trình chữ lớn `text-base font-bold`, mã code dạng pill lớn, kèm dòng quy định nổi bật như `🏃 Quy định: 100 người đến trước mỗi ngày`).
     - Cột 2 (`w-[14%]`): **Mức ưu đãi (`% / Tiền`)** — Hiển thị thẻ badge cỡ lớn (`text-lg font-extrabold px-3 py-1.5 rounded-xl`), ví dụ **`-20%`**, **`-30.000 ₫`**, **`MUA 2 TẶNG 1`**.
     - Cột 3 (`w-[28%]`): **Bộ 3 chỉ số `TỔNG / SỐ LƯỢNG / TIỀN` & Dự báo giới hạn chạm trước** (hiển thị 2 thanh progress bar lớn cho `Số lượng lượt` và `Ngân sách tiền` + nhãn kết luận giới hạn nào đến trước).
     - Cột 4 (`w-[16%]`): **Ràng buộc liên quan & Điều kiện kết thúc** (Cộng dồn hay độc quyền, trùng mã nào, điều kiện dừng).
     - Cột 5 (`w-[10%]`): **Thời gian & Phạm vi Chi nhánh**.
     - Cột 6 (`w-[6%]`): **Thao tác** (chỉ hiển thị cho Admin có quyền `can("promotion.manage")`; nếu là Thu ngân hoặc Quản lý chi nhánh vào xem thì ẩn cột Thao tác để bảng càng rộng hơn!).

##### Bước A5.2 — Bổ sung Ràng buộc tương tác, Quy tắc Kết thúc, Bộ `TỔNG / SỐ LƯỢNG / TIỀN` & Quy định `"100 người đến trước"`
1. Mở [PromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PromotionsPage.tsx) tại dòng 13–125 (`PromotionRecord` và `SEED_PROMOTIONS`):
   - Thêm các trường mới vào `PromotionRecord`:
     - `naturalRuleText`: Chuỗi quy định tự nhiên dễ hiểu thay cho việc chỉ nhìn con số khô khan (ví dụ: `"Áp dụng cho 100 người đến trước mỗi ngày"`, `"Dành cho 50 khách hàng đầu tiên tại mỗi chi nhánh"`, `"Tối đa 1 lượt / 1 SĐT hội viên"`).
     - `stackWithMemberTier`: `boolean` (Có được cộng dồn với giảm giá hạng thẻ Thành viên 2k/5k/5%/10% hay không).
     - `stackWithOtherPromo`: `"exclusive" | "stackable"` (Độc quyền chỉ 1 mã trên 1 hóa đơn hay cho phép gộp mã).
     - `priority`: Số nguyên `1..5` (Nếu khách thỏa mãn nhiều khuyến mãi không cộng dồn, hệ thống ưu tiên mã có `priority` cao hơn).
     - `terminationRule`: `"whichever_first"` (Mặc định: **Tự động kết thúc ngay khi chạm 1 trong 3 trần: Hết thời gian HOẶC Đủ số lượng lượt HOẶC Cạn ngân sách tối đa**).
     - `predictedBindingLimit`: `"budget" | "usage" | "time"` (Trường dự báo do Backend/Store trả về cho biết giới hạn nào sẽ chạm trần trước).
     - `bindingLimitNote`: Chuỗi thuyết minh dự báo do Backend/Store trả về.
2. **Hiển thị trực quan Bộ 3 chỉ số `TỔNG / SỐ LƯỢNG / TIỀN` & Nhãn dự báo "Số nào chạm giới hạn trước" trên UI**:
   - Với mỗi khuyến mãi trên bảng danh sách:
     - Hiển thị thanh tiến độ 1: **SỐ LƯỢNG LƯỢT (`usageCount / usageLimit lượt`)**.
     - Hiển thị thanh tiến độ 2: **TỔNG NGÂN SÁCH TIỀN (`budgetUsed / budgetLimit ₫`)**.
     - Hiển thị nhãn kết luận dựa trên `promo.predictedBindingLimit` và `promo.bindingLimitNote` từ dữ liệu trả về:
       - **Khi `predictedBindingLimit === "budget"`**: Hiển thị hộp kết luận **`🔥 Chạm trần TIỀN / NGÂN SÁCH trước:`** Ngân sách còn lại sẽ hết trước khi đạt trần số lượng lượt (`usageLimit`).
       - **Khi `predictedBindingLimit === "usage"`**: Hiển thị hộp kết luận **`⚡ Chạm trần SỐ LƯỢNG LƯỢT trước:`** Sẽ đạt đủ số lượng lượt (`naturalRuleText`) trước khi dùng hết tổng ngân sách tiền.
       - **Khi `predictedBindingLimit === "time"`**: Hiển thị hộp kết luận **`🕒 Chạm trần THỜI GIAN trước (Hết hạn ngày endDate)`**.
3. Trong Modal Tạo/Sửa Khuyến mãi:
   - Thêm các nút **Chọn nhanh mẫu quy định (`"100 người đến trước"`, `"50 khách đầu tiên mỗi chi nhánh"`, `"Giới hạn 200 suất khung giờ vàng"`)** để người quản lý bấm chọn thay vì chỉ nhập số.
   - Thêm khu vực thiết lập **Ràng buộc liên quan giữa các khuyến mãi** (Cộng dồn hạng thẻ, Độc quyền vs Gộp mã, Thứ tự ưu tiên) và hiển thị cảnh báo nếu chương trình đang tạo trùng khung giờ/nhóm món với một chương trình đang chạy khác.

##### Bước A5.3 — Khóa quyền điều chỉnh tại [BranchPromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/BranchPromotionsPage.tsx) chỉ dành riêng cho Admin (`owner`)
1. Mở [BranchPromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/BranchPromotionsPage.tsx):
   - Tại đầu component, lấy thông tin quyền:
     - `const currentRole = getCurrentRole();`
     - `const isChainAdmin = currentRole === "owner" && can("promotion.manage");`
     - `const userBranch = scopedBranch();`
   - **Sửa lỗi logic `branchMode === "exclude"` tại dòng 77–90 và 111–145**:
     - Khi kiểm tra một khuyến mãi `p` có đang bật tại chi nhánh `bCode` hay không:
       - Nếu `p.branchMode === "all"` -> `true`.
       - Nếu `p.branchMode === "include"` -> `p.branches.includes(bCode)`.
       - Nếu `p.branchMode === "exclude"` -> `!p.branches.includes(bCode)` *(đảo dấu `!` để không bị ngược như code cũ)*.
     - Khi Admin bấm bật/tắt một ô trong bảng ma trận, cập nhật lại mảng `p.branches` đúng theo `branchMode` (hoặc chuẩn hóa sang `"include"` với danh sách các mã chi nhánh đang bật).
   - **Thực thi phân quyền `"Quyền điều chỉnh các chương trình khuyến mãi chỉ có Admin"`**:
     - Trong các hàm `toggleCell`, `enableAllForBranch`, `disableAllForBranch`: Thêm câu lệnh chặn ngay dòng đầu tiên `if (!isChainAdmin) return;`.
     - Trên giao diện:
       - Nếu `!isChainAdmin` (ví dụ đang đăng nhập là Quản lý chi nhánh `manager` hoặc Nhân viên):
         - Hiển thị một banner thông báo rõ ràng ở đầu trang:
           > **`🔒 Chế độ Chỉ Xem (Read-only): Quyền điều chỉnh và phân bổ chương trình khuyến mãi chỉ thuộc về Admin (Quản trị chuỗi). Quản lý chi nhánh chỉ theo dõi các chương trình đang áp dụng tại chi nhánh của mình.`**
         - Tự động lọc hoặc ghim nổi bật dòng chi nhánh của người đó (`CN05 - Hàng Xanh`).
         - Khóa `disabled` toàn bộ các nút `"Bật tất cả"`, `"Tắt tất cả"` và các nút gạt trong ma trận (`opacity-60 cursor-not-allowed`).

---

### TASK A6: Phân hệ Khách hàng (`/customer` — Chọn Chi nhánh Gần tôi, Tùy chọn Đăng nhập & Lưu thông tin, Tra cứu Không cần OTP)

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên
- **# Khách hàng**:
  - Chọn chi nhánh gần tôi.
  - CÓ MUỐN đăng nhập và lưu thông tin hay ko.
  - Tra cứu không cần otp làm gì.

#### 🔍 Phân tích hiện trạng trong Project
- Hiện tại toàn bộ ứng dụng đều chặn ở `/login` ([AppRoutes.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/routes/AppRoutes.tsx#L99)), hoàn toàn chưa có màn hình dành cho Khách hàng để chọn chi nhánh gần nhất, đặt món kèm tùy chọn lưu thông tin hay tra cứu đơn hàng không cần OTP.
- Ngoài ra trong [ForgotPasswordPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/auth/ForgotPasswordPage.tsx#L19-L26) đang có đoạn thông báo giả lập gửi mã OTP.

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 1

##### Bước A6.1 — Bổ sung dữ liệu khoảng cách cho các Chi nhánh & Tạo trang Cổng Khách Hàng `src/pages/customer/CustomerPortalPage.tsx`
1. Mở [BranchesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/branches/BranchesPage.tsx) (dòng 10–169):
   - Export mảng `BRANCH_DIRECTORY` ra ngoài và bổ sung thêm `district` (quận/huyện) cùng dữ liệu khoảng cách mẫu `distanceKmByArea` / `estimatedMinutes` (do Backend/Store trả về theo khu vực khách chọn):
     - `CN01 - Nguyễn Huệ (Quận 1, TP.HCM)`
     - `CN02 - Thảo Điền (TP. Thủ Đức, TP.HCM)`
     - `CN03 - Phú Mỹ Hưng (Quận 7, TP.HCM)`
     - `CN05 - Hàng Xanh (Bình Thạnh, TP.HCM)`
     - `CN08 - Cầu Giấy (Cầu Giấy, Hà Nội)`
     - `CN10 - Hải Châu (Hải Châu, Đà Nẵng)`
2. Tạo mới file `src/pages/customer/CustomerPortalPage.tsx` gồm **3 chức năng trọng tâm đúng theo 3 gạch đầu dòng của giảng viên**:

   - **Chức năng 1 — Khối `"📍 Chọn Chi Nhánh Gần Tôi"`**:
     - Thiết kế nút bấm nổi bật **`📍 Định vị — Tìm chi nhánh gần tôi nhất`** kết hợp **dải nút chọn nhanh khu vực hiện tại của khách**:
       - `Đang ở Quận 1 (Phố đi bộ Nguyễn Huệ)`
       - `Đang ở Bình Thạnh (Ngã tư Hàng Xanh)`
       - `Đang ở TP. Thủ Đức (Thảo Điền)`
       - `Đang ở Quận 7 (Crescent Mall)`
       - `Đang ở Hà Nội (Cầu Giấy)`
       - `Đang ở Đà Nẵng (Cầu Rồng)`
     - Dựa trên khu vực khách chọn (hoặc vị trí gửi lên Backend), Frontend nhận danh sách chi nhánh kèm trường `distanceKm` và `estimatedMinutes`, thực hiện sắp xếp danh sách chi nhánh theo trường **`distanceKm` tăng dần (Gần nhất -> Xa nhất)**:
       - Tự động chọn chi nhánh gần nhất làm chi nhánh phục vụ đơn hàng, gắn badge màu xanh lá **`🎯 Gần bạn nhất — Cách {distanceKm} km (~{estimatedMinutes} phút)`**.

   - **Chức năng 2 — Khối `"👤 Bạn CÓ MUỐN đăng nhập Hội viên và Lưu thông tin cho lần sau không?"`**:
     - Thiết kế một khung lựa chọn rõ ràng, lịch sự, không ép buộc khách hàng:
       - **Lựa chọn 1: `Mua nhanh (Khách vãng lai — Không cần đăng nhập)`**:
         - Khách chỉ nhập `Họ tên` và `Số điện thoại nhận nước`.
         - Ngay bên dưới có 2 nút Radio / Checkbox hỏi rõ ý nguyện của khách:
           - **`( ) Có, lưu thông tin nhận hàng & chi nhánh gần tôi trên thiết bị này cho lần đặt sau`** (Lưu vào `localStorage["milktyway_customer_saved_info_v1"]`).
           - **`(•) Không lưu thông tin của tôi sau khi hoàn tất đơn hàng này`** (Mặc định tôn trọng quyền riêng tư; nếu khách chọn mục này hoặc bấm nút `"Xóa thông tin đã lưu"`, hệ thống xóa sạch khỏi `localStorage`).
       - **Lựa chọn 2: `Đăng nhập / Nhận diện Hội viên (Để hưởng ưu đãi Hạng thẻ & Tích điểm)`**:
         - Khách chỉ cần nhập Số điện thoại hội viên (ví dụ `0903123456` - Nguyễn An - Hạng VIP giảm `10%`, hoặc `0912345678` - Trần Bình - Hạng Vàng giảm `5%`, kèm các nút bấm điền nhanh SĐT mẫu để giảng viên test 1 chạm).
         - Ngay dưới cũng có checkbox: **`[✓] Lưu trạng thái đăng nhập Hội viên và thông tin giao hàng cho lần sau`**.
     - Cho phép khách chọn nhanh vài món đồ uống (có tag `🔥 Hot Sale`) tại chi nhánh gần nhất vừa chọn và bấm **`Đặt đơn ngay`** -> Gọi `createPosOrder()` đẩy đơn trực tiếp vào hệ thống để đơn hàng xuất hiện tức thì bên màn hình `/sales/preparation`!

   - **Chức năng 3 — Khối `"🔍 Tra cứu Đơn hàng & Tích điểm Tức thì (KHÔNG CẦN OTP)"`**:
     - Thiết kế khung tra cứu lớn có nhãn rõ ràng: **`⚡ Tra cứu trực tiếp bằng Mã đơn hàng hoặc SĐT — Tuyệt đối KHÔNG yêu cầu mã OTP`**:
       - Ô tìm kiếm cho phép nhập **Mã đơn hàng (`DH-00125`, `DH-00124`...)**, **Mã hóa đơn (`HD-CN01-003814`)** hoặc **Số điện thoại (`0903123456`)** (kèm các nút gợi ý mã đơn có sẵn trong hệ thống để bấm test ngay).
       - Ngay khi bấm **`Tra cứu ngay`** (hoặc gõ phím Enter):
         - Hiển thị ngay **Tiến độ xử lý đơn hàng thời gian thực** (`1. Đã nhận đơn` -> `2. Đang pha chế tại quầy` -> `3. Đã sẵn sàng giao khách`).
         - Hiển thị chi tiết các món trong đơn, chi nhánh thực hiện, tổng tiền, mức giảm giá đã áp dụng và điểm thưởng hội viên (ẩn bớt 3 số giữa của SĐT như `0903***456` nếu tra cứu công khai bằng mã đơn).
3. Mở [LoginPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/auth/LoginPage.tsx) và [Header.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/shared/Header.tsx):
   - Thêm một nút nổi bật **`🧋 Cổng Khách Hàng (Chọn CN gần tôi & Tra cứu không OTP)`** dẫn sang `/customer` ở cả trang Đăng nhập lẫn trên thanh Header để giảng viên mở kiểm tra từ bất kỳ đâu.
4. Mở [ForgotPasswordPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/auth/ForgotPasswordPage.tsx) (dòng 19–26):
   - Thay câu thông báo `"Đã gửi mã OTP..."` thành `"Đã gửi liên kết khôi phục mật khẩu qua email nội bộ"` để toàn hệ thống không còn bất kỳ quy trình OTP thừa thãi nào.

---

## PHẦN B: HƯỚNG DẪN SIÊU CHI TIẾT CHO NGƯỜI 2 (TASK B1 -> TASK B7)

---

### TASK B1: Nâng cấp Dữ liệu Gốc Kho - Sản xuất (`business-demo.ts`) & Danh sách Sản phẩm theo Chi nhánh + Kiểm tra Món chứa Nguyên liệu + Nút Sắp xếp nói rõ trường (`/inventory/products`)

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên
- **kho hang/ sản phẩm**: Danh sách sản phẩm thấy được sản phẩm theo chi nhánh (chi nhánh nào thì nhìn thấy được sản phẩm của nó). Thêm nút sắp xếp (**Cụ thể trường nào nói rõ: A->Z hoặc Mới nhất / Cũ nhất**).
- *(Chuẩn bị nền dữ liệu trong `business-demo.ts` cho toàn bộ các trang của Người 2)*: Phân cấp nguyên liệu `F0 -> F1 -> Món` vs `F0 -> Món`, thuyết minh ngưỡng ROP & khóa nguyên liệu ngưng dùng, độ ưu tiên `priority` & `effectiveDate` của công thức, truy vết lô mẻ & phân phối, kế hoạch cố định Kho Tổng vs lượng thêm tạm thời có thời lượng hiệu lực.

#### 🔍 Phân tích hiện trạng các dòng code đang bị lỗi trong Project
1. **Tại [ProductsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/inventory/ProductsPage.tsx#L73-L82)**:
   - Biến `filtered` chỉ lọc theo `q`, `categoryFilter`, `statusFilter`. Trang **không gọi `scopedBranch()`**, không có dropdown lọc theo Chi nhánh, chưa có kiểm tra tất cả các món chứa 1 nguyên liệu được tìm kiếm, và cũng **không có bất kỳ nút Sắp xếp (`Sort`) nào** trên thanh công cụ hay trên tiêu đề bảng (`<thead>` dòng 282–292).
2. **Tại [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L540-L602)**:
   - Các lô nguyên liệu trong `INITIAL_LOTS` và `INITIAL_BATCHES` đang để ngày hết hạn cứng là `2026-11-05` đến `2026-11-12` (đã quá hạn so với ngày hiện tại `2026-11-16`), làm cho hàm `isExpired()` đánh dấu hết hạn toàn bộ lô kho tổng!
   - `ProductItem` trong `business-demo.ts` chưa có trường ngày tạo/cập nhật (`createdAt` / `updatedAt`) để phục vụ sắp xếp `Mới nhất / Cũ nhất`.

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 2

##### Bước B1.1 — Nâng cấp toàn diện cấu trúc dữ liệu trong [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts)
1. Mở [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts):
   - **Thao tác 1 — Sửa ngày hết hạn động cho `INITIAL_LOTS` và `INITIAL_BATCHES` (dòng 540–602 và 762–800)**:
     - Viết một hàm nhỏ `relativeDate(offsetDays: number): string` trả về chuỗi `YYYY-MM-DD` cộng/trừ `offsetDays` so với ngày hiện tại.
     - Cập nhật các lô hàng khả dụng trong `INITIAL_LOTS` và `INITIAL_BATCHES` có `expiryDate = relativeDate(+12)` hoặc `relativeDate(+20)` (còn hạn sử dụng dài), giữ đúng 2 lô cận hạn mẫu (`relativeDate(+2)`) và 1 lô hết hạn mẫu (`relativeDate(-2)`).
   - **Thao tác 2 — Mở rộng interface `ProductItem` (dòng 48–60) và `INITIAL_PRODUCTS` (dòng 604–660)**:
     - Bổ sung trường **`createdAt: string`** (định dạng `YYYY-MM-DD`, ví dụ `"2026-11-12"`, `"2026-10-25"`, `"2026-08-15"`...) và **`updatedAt?: string`** vào `ProductItem` để dùng làm trường chuẩn khi sắp xếp **`Mới nhất` / `Cũ nhất`**.
   - **Thao tác 3 — Mở rộng interface `Ingredient` (dòng 10–18) và `INITIAL_INGREDIENTS` (dòng 502–538)**:
     - Thêm các trường sau vào `Ingredient`:
       - `tier: "F0" | "F1"`: Trong đó `"F0"` là nguyên liệu gốc nhập từ nhà cung cấp (Trà đen, Bột sữa, Trà xanh nhài, Siro đường, Kem béo, Thạch đào/Trân châu ăn liền); `"F1"` là nguyên liệu bán thành phẩm trung gian đã qua nấu/ủ từ `F0` (Cốt trà sữa truyền thống, Cốt trà xanh ủ lạnh, Sốt kem cheese đánh sẵn).
       - `flowType: "F0_TO_F1_TO_DISH" | "F0_DIRECT_TO_DISH"`: Phân biệt nguyên liệu đi qua `F1` rồi mới thành Món hay đi trực tiếp từ `F0` lên Món.
       - `parentF0Items?: { ingredientId: string; quantityPerBatch: number; unit: string }[]`: Nếu là nguyên liệu `F1`, khai báo rõ danh sách các nguyên liệu `F0` cấu thành nên nó.
       - `avgDailyUsage: number` (Mức tiêu thụ bình quân ngày), `leadTimeDays: number` (Số ngày chờ cung ứng), `safetyStock: number` (Tồn kho an toàn), `branchMinimums?: Record<string, number>` (Ngưỡng tối thiểu ROP riêng cho từng chi nhánh `CN01`, `CN05`, `CN08` do Backend tính sẵn), và `thresholdRuleText?: string` (Chuỗi thuyết minh cách tính ngưỡng).
       - `isIgnoredInAlert?: boolean`, `ignoredReason?: string`, `ignoredBy?: string`, `ignoredAt?: string`: Phục vụ tính năng **Khóa / Bỏ qua nguyên liệu không còn xài nữa** trên Dashboard.
     - Thêm 3 nguyên liệu cấp `F1` vào `INITIAL_INGREDIENTS`:
       1. `id: "nl-f1-001", code: "F1-001", name: "Cốt trà sữa truyền thống (F1)", unit: "ml", tier: "F1", flowType: "F0_TO_F1_TO_DISH"` (cấu thành từ `nl-001 Trà đen`, `nl-002 Bột sữa béo`, `nl-004 Siro đường`).
       2. `id: "nl-f1-002", code: "F1-002", name: "Cốt lục trà nhài ủ lạnh (F1)", unit: "ml", tier: "F1", flowType: "F0_TO_F1_TO_DISH"` (cấu thành từ `nl-003 Trà xanh nhài`, `nl-004 Siro đường`).
       3. `id: "nl-f1-003", code: "F1-003", name: "Kem Macchiato đánh sẵn (F1)", unit: "g", tier: "F1", flowType: "F0_TO_F1_TO_DISH"` (cấu thành từ `nl-006 Kem béo thực vật`).
   - **Thao tác 4 — Mở rộng interface `RecipeVersion` (dòng 66–81) và `INITIAL_RECIPES` (dòng 662–760)**:
     - Thêm trường **`priority: 1 | 2 | 3`** (`1` = Ưu tiên cao / Món chủ lực, `2` = Trung bình, `3` = Thấp / Món theo mùa) và đảm bảo mọi bản ghi có **`effectiveDate: string`** (`YYYY-MM-DD`) để sắp xếp `Mới nhất / Cũ nhất`.
     - Thêm trường `hierarchyPath: "F0 -> F1 -> Món" | "F0 -> Món"` để hiển thị rõ luồng phân cấp nguyên liệu của công thức đó.
     - Thêm mảng `replacementHistory?: { id: string; date: string; actor: string; fromIngredientId: string; toIngredientId: string; disposition: "sell-through" | "discard-remake"; note: string }[]`.
   - **Thao tác 5 — Mở rộng interface `ProductionBatch` (dòng 83–101) và `INITIAL_BATCHES`**:
     - Thêm mảng `inputLotsUsed?: { ingredientId: string; lotId: string; lotCode: string; supplierName: string; quantityUsed: number; unit: string }[]` (Truy vết ngược: Mẻ này lấy nguyên liệu từ lô `F0` nào, của nhà cung cấp nào).
     - Thêm mảng `branchDistributions?: { id: string; storeId: string; allocatedQty: number; receivedQty: number; remainingCounterQty: number; transferCode: string; distributedAt: string; status: "Đã xuất kho" | "Đã nhập quầy CN" }[]` (Truy vết xuôi: Mẻ này đã phân phối đi những chi nhánh nào).
   - **Thao tác 6 — Bổ sung cấu trúc Kế hoạch Cố định & Lượng thêm Tạm thời vào `DemoState` (dòng 140–160)**:
     - Thêm `masterFixedPlans`: Danh sách định mức cố định mỗi ngày tại Kho Tổng cho từng chi nhánh (`storeId`, `fixedCupsPerDay`, `ingredientQuotas: { ingredientId: string; fixedQty: number }[]`, `lastUpdatedBy`, `lastUpdatedAt`).
     - Thêm `temporaryPlanOverrides`: Danh sách các khoản **"Lượng thêm tạm thời"** (`id`, `storeId`, `ingredientId`, `extraCups`, `extraIngredientQty`, `startDate`, `endDate`, `durationDays`, `reason`, `createdBy`, `createdAt`, `status: "active" | "expired" | "promoted_to_fixed"`, `promotedAt`).
     - Thêm `distributionHistory`: Danh sách lịch sử các đợt phân phối từ Kho Tổng về các chi nhánh theo ngày (đáp ứng yêu cầu của Thanh Hương).

##### Bước B1.2 — Lọc sản phẩm theo Chi nhánh, Kiểm tra tất cả món chứa 1 nguyên liệu & Thêm Nút Sắp xếp nói rõ trường tại [ProductsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/inventory/ProductsPage.tsx)
1. Mở [ProductsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/inventory/ProductsPage.tsx):
   - **Tại vùng khai báo State (dòng 28–45)**:
     - Gọi `const lockedBranch = scopedBranch();` (`"CN01"` nếu đăng nhập là Thu ngân, `"CN05"` nếu đăng nhập là Quản lý chi nhánh, `null` nếu là Admin chuỗi hoặc Thủ kho).
     - Tạo state `branchFilter` khởi tạo bằng `lockedBranch || "ALL"`.
     - Tạo state `showLockedAtBranch` kiểu `boolean` (mặc định `false`: nghĩa là khi đang xem một chi nhánh cụ thể, **chỉ hiển thị những sản phẩm đang được phép bán tại chi nhánh đó**, đúng yêu cầu *"chi nhánh nào thì nhìn thấy được sản phẩm của nó"*).
     - Tạo state `ingredientFilterId` (mặc định `"ALL"`) để kiểm tra tất cả các món có chứa 1 nguyên liệu được chọn/tìm kiếm.
     - Tạo state sắp xếp `sortBy` nói rõ từng trường dữ liệu của `ProductItem`:
       - `"name-asc"` (**`Tên sản phẩm: A → Z`** — Sort trực tiếp trên trường **`product.name`** bằng `a.name.localeCompare(b.name, "vi")`).
       - `"name-desc"` (**`Tên sản phẩm: Z → A`** — Sort ngược trên trường **`product.name`** bằng `b.name.localeCompare(a.name, "vi")`).
       - `"code-asc"` (**`Mã sản phẩm: A → Z`** — Sort trực tiếp trên trường **`product.code`** bằng `a.code.localeCompare(b.code, "vi")`).
       - `"code-desc"` (**`Mã sản phẩm: Z → A`** — Sort ngược trên trường **`product.code`**).
       - `"newest"` (**`Mới nhất trước`** — Sort giảm dần trên trường **`product.createdAt`** định dạng `YYYY-MM-DD`, tức `b.createdAt.localeCompare(a.createdAt)`).
       - `"oldest"` (**`Cũ nhất trước`** — Sort tăng dần trên trường **`product.createdAt`**, tức `a.createdAt.localeCompare(b.createdAt)`).
   - **Tại vùng lọc và sắp xếp danh sách `filtered` (dòng 73–85)**:
     - **Lọc theo Chi nhánh**: Khi `branchFilter !== "ALL"` và `!showLockedAtBranch`: Loại bỏ các sản phẩm có `product.lockedStoreIds.includes(branchFilter)` để danh sách chỉ hiển thị sản phẩm thuộc chi nhánh đó.
     - **Kiểm tra tất cả các món có chứa 1 nguyên liệu được tìm kiếm (`ingredientFilterId` hoặc gõ tên nguyên liệu vào ô search `q`)**:
       - Với mỗi `product`, tìm công thức `recipe` tương ứng của món đó (`r.productId === product.id`).
       - Kiểm tra xem `recipe.lines` có chứa nguyên liệu đang chọn/tìm kiếm hay không (bao gồm cả kiểm tra trực tiếp `line.ingredientId` LẪN kiểm tra bắc cầu nếu `line.ingredientId` là nguyên liệu `F1` có `parentF0Items` chứa nguyên liệu `F0` đang tìm).
       - Nhờ vậy, khi người dùng chọn hoặc gõ tìm `"trà xanh"`, hệ thống liệt kê đầy đủ 100% các món đồ uống có chứa Trà xanh!
     - **Thực hiện Sort**: Sau khi lọc xong, gọi `.sort(...)` theo đúng trường dữ liệu của `sortBy` (`product.name`, `product.code`, hoặc `product.createdAt`).
   - **Tại thanh công cụ Filter Bar (dòng 241–279)**:
     - Thêm **Bộ chọn Chi nhánh**:
       - Nếu `lockedBranch` khác `null` (Nhân viên / Quản lý chi nhánh): Khóa cứng ở chi nhánh của họ, hiển thị rõ nhãn **`📍 Sản phẩm của chi nhánh: ${storeLabel(lockedBranch)}`** kèm nút gạt nhỏ `"Hiện cả món đang tạm khóa tại CN"`.
       - Nếu là Admin / Thủ kho: Cho phép chọn `"Tất cả chi nhánh"` hoặc chọn từng chi nhánh `CN01`, `CN05`, `CN08` để kiểm tra thực đơn của từng chi nhánh.
     - Thêm **Dropdown `"Lọc món theo nguyên liệu cấu thành"`** (`Tất cả nguyên liệu` | `NL-001 · Trà đen` | `NL-002 · Bột sữa béo` | `NL-003 · Trà xanh nhài`...).
     - Thêm **Dropdown + Nút Sắp xếp (`↕ Sắp xếp theo trường`)**:
       - `Tên sản phẩm: A → Z (trường product.name)`
       - `Tên sản phẩm: Z → A (trường product.name)`
       - `Mã SP: A → Z (trường product.code)`
       - `Mã SP: Z → A (trường product.code)`
       - `Mới nhất trước (trường product.createdAt)`
       - `Cũ nhất trước (trường product.createdAt)`
   - **Tại bảng danh sách sản phẩm (`<thead>` dòng 282–292 và `<tbody>` dòng 293–343)**:
     - Cho phép bấm trực tiếp vào tiêu đề cột `Mã SP (code)`, `Tên sản phẩm (name)`, `Ngày tạo (createdAt)` để đảo chiều sắp xếp `↑ / ↓`.
     - Hiển thị rõ cột **`Trạng thái mở bán tại Chi nhánh`** (ví dụ: Badge xanh `Đang mở bán tại CN01` hoặc Badge xám `Tạm khóa tại CN08`).

---

### TASK B2: Bảng Điều Khiển Tổng Quan (`/dashboard`) — Đơn vị thời gian, Lượng khách theo Chi nhánh, Tooltip/Pop-up, Thuyết minh Ngưỡng ROP & Khóa Nguyên liệu Ngưng xài

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên
- **Đơn vị thời gian**.
- **Cần xem lượng khách theo từng chi nhánh, thời gian**.
- **Thêm pop up, hay hiển thị rà chuột để hiển thị tên thông tin**.
- **Ngưỡng nguyên liệu dưới ngưỡng**:
  - Cho xem cách thức tính toán ra ngưỡng.
  - Khóa, bỏ qua các nguyên liệu mà mình cho là không còn xài nữa -> lọc bỏ cảnh báo thừa.
- **Coi được thuyết minh cách tính, các thông tin cho từng chi nhánh**.

#### 🔍 Phân tích hiện trạng các dòng code đang bị lỗi trong Project
1. **Tại [DashboardPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/DashboardPage.tsx#L462-L466)**:
   - Trên góc phải của biểu đồ `Tổng quan doanh thu` hiện chỉ có duy nhất 1 nút tĩnh `<button>Tháng</button>`, không thể đổi đơn vị thời gian sang Giờ / Ngày / Tuần / Quý.
2. **Tại [TemplateChart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/shared/TemplateChart.tsx#L118-L136) và [charts.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/dashboard/charts.ts#L22-L25)**:
   - Dữ liệu `salesData.monthly.data = [67347, 70234, ...]` đang tính theo **Nghìn đồng**, nhưng `TemplateChart.tsx` dòng 118 lại đặt tên chuỗi dữ liệu là `"Đơn hàng"` và dòng 136 nối chuỗi `" VND"` thành `67.347 VND` (sai đơn vị gấp 1.000 lần và sai tên nhãn!).
3. **Tại [DashboardPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/DashboardPage.tsx#L408-L458)**:
   - 6 thẻ KPI đầu trang đang hiển thị các con số cứng từ `dashboard-demo.ts` (`786` sản lượng, `2` chi nhánh, `1,377` khách hàng, `04` đơn hủy, `07` hoàn trả) — khi chọn lọc Chi nhánh `CN01` hay `CN05`, các con số này hoàn toàn đứng im không thay đổi!
   - Chưa có biểu đồ/bảng **Lượng khách theo từng chi nhánh và thời gian**.
4. **Tại [DashboardPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/DashboardPage.tsx#L308-L353) (`BelowThresholdSection`) và [stock-summary.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/stock-summary.ts#L66-L98)**:
   - Chỉ hiển thị con số `Tối thiểu: 5000 g` mà không hiển thị thông tin thuyết minh ngưỡng `5000 g` được cấu thành từ những thông số nào, và không có nút **Khóa / Bỏ qua** để ẩn các nguyên liệu không còn sử dụng nữa.

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 2

##### Bước B2.1 — Thiết lập Bộ chọn "Đơn vị thời gian (`Time Unit`)" & Sửa nhãn Đơn vị trên Biểu đồ
1. Mở [charts.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/dashboard/charts.ts) và [TemplateChart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/shared/TemplateChart.tsx):
   - Bổ sung đầy đủ 5 bộ khung thời gian trong `charts.ts` cho cả **Doanh thu** và **Lượng khách theo chi nhánh**:
     - `hour` (**Theo Giờ trong ngày**: `07:00`, `09:00`, `11:00`, `13:00`, `15:00`, `17:00`, `19:00`, `21:00` — Đơn vị: `Nghìn ₫ / Giờ` và `Khách / Giờ`).
     - `day` (**Theo Ngày trong tuần**: `Thứ 2` -> `Chủ nhật` — Đơn vị: `Triệu ₫ / Ngày` và `Khách / Ngày`).
     - `week` (**Theo Tuần trong tháng**: `Tuần 1` -> `Tuần 4` — Đơn vị: `Triệu ₫ / Tuần` và `Khách / Tuần`).
     - `month` (**Theo Tháng trong năm**: `Thg 1` -> `Thg 12` — Đơn vị: `Triệu ₫ / Tháng` và `Khách / Tháng`).
     - `quarter` (**Theo Quý**: `Quý 1` -> `Quý 4` — Đơn vị: `Triệu ₫ / Quý` và `Khách / Quý`).
   - Trong [TemplateChart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/shared/TemplateChart.tsx) (dòng 117–163):
     - Sửa `label: "Đơn hàng"` (dòng 118) thành `label: "Doanh thu (Nghìn ₫)"` (hoặc nhận động từ prop) và hiển thị rõ tiêu đề đơn vị trên trục tung `Y` (`Đơn vị: Nghìn VNĐ`) và trục hoành `X` (`Đơn vị thời gian: Giờ / Ngày / Tuần / Tháng / Quý`).
2. Mở [DashboardPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/DashboardPage.tsx):
   - Tạo state `timeUnit: "hour" | "day" | "week" | "month" | "quarter"` (mặc định `"month"` hoặc đồng bộ với bộ lọc trên đầu trang).
   - Tại góc phải biểu đồ Doanh thu (dòng 462) và trên thanh Filter đầu trang: Hiển thị cụm 5 nút chuyển đổi **Đơn vị thời gian (`Giờ | Ngày | Tuần | Tháng | Quý`)** kèm nhãn hiển thị rõ: `Đơn vị thời gian đang xem: Theo Tháng (Đơn vị tiền: VNĐ · Đơn vị sản lượng: Ly · Đơn vị khách: Lượt khách)`.

##### Bước B2.2 — Xây dựng Khu vực "Xem Lượng Khách Theo Từng Chi Nhánh & Thời Gian"
1. Trong [DashboardPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/DashboardPage.tsx):
   - Ngay bên dưới (hoặc cạnh) biểu đồ Doanh thu, thêm một Card lớn: **`👥 Biểu đồ & Thống kê Lượng Khách Theo Chi Nhánh và Thời Gian`**:
     - Cho phép xem đồng thời:
       1. **Biểu đồ cột/đường so sánh Lượng khách giữa các chi nhánh** (`CN01 - Nguyễn Huệ`, `CN05 - Hàng Xanh`, `CN08 - Cầu Giấy`) biến thiên theo đúng **Đơn vị thời gian (`Giờ / Ngày / Tuần / Tháng / Quý`)** đang chọn!
       2. **Bảng chi tiết Lượng khách theo từng Chi nhánh**:
          - Cột `Chi nhánh` · `Tổng lượt khách (theo kỳ đang chọn)` · `Lượng khách trung bình / đơn vị thời gian` · `Tỷ lệ khách Hội viên vs Vãng lai` · `Khung giờ cao điểm (Peak Hour)` · `Tốc độ tăng trưởng khách (%)`.
     - Khi người dùng chọn lọc 1 chi nhánh cụ thể (hoặc khi Quản lý chi nhánh `CN05` đăng nhập), biểu đồ tự động phóng chi tiết lượng khách của riêng chi nhánh đó.

##### Bước B2.3 — Bổ sung Pop-up & Rà chuột (Hover Tooltip) + Xem Thuyết minh & Thông tin từng Chi nhánh
1. Trong [DashboardPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/DashboardPage.tsx):
   - **Biến toàn bộ 6 thẻ KPI ở dòng 408–458 thành dữ liệu động theo Chi nhánh & Đơn vị thời gian**:
     - Khi chọn `"Tất cả chi nhánh"`, hiển thị tổng toàn chuỗi; khi chọn `"CN01"`, `"CN05"` hoặc `"CN08"`, hiển thị đúng Sản lượng ly, Doanh thu, Lượng khách, Đơn hủy, Đơn hoàn trả của riêng chi nhánh đó!
   - **Thêm hiệu ứng Rà chuột (`Hover Tooltip`) trên toàn trang Dashboard**:
     - Trên mỗi thẻ KPI, mỗi dòng nguyên liệu, mỗi dòng sản phẩm bán chạy, mỗi nhãn viết tắt: Khi người dùng **đưa chuột (hover)** vào, hiển thị một hộp nổi (Tooltip) ghi rõ:
       - **Tên đầy đủ của thông tin / nguyên liệu / chi nhánh**.
       - **Mô tả ý nghĩa và quy tắc tính của chỉ số đó (nhận từ dữ liệu thuyết minh)**.
       - **Số liệu phân tách nhanh theo từng chi nhánh (`CN01`, `CN05`, `CN08`)**.
   - **Thêm Nút & Pop-up `"📋 Xem Thuyết Minh Chỉ Số & Chi Tiết Từng Chi Nhánh"`**:
     - Đặt nút này ngay trên thanh tiêu đề của Dashboard (và cho phép click trực tiếp vào bất kỳ thẻ KPI nào để mở Pop-up).
     - Bên trong Pop-up trình bày:
       - **Tab 1 — Bảng Thuyết minh Chỉ số Hệ thống**: Hiển thị mô tả quy tắc nghiệp vụ của: *Doanh thu thuần*, *Lượng khách & Tỷ lệ quay lại*, *Sản lượng ly tiêu chuẩn*, *Tỷ lệ hao hụt kho*, *Ngưỡng cảnh báo đặt hàng lại (ROP)*, *Điểm hòa vốn chi nhánh*.
       - **Tab 2 — Bảng So sánh Toàn diện từng Chi nhánh**: Đặt các chi nhánh `CN01`, `CN05`, `CN08` cạnh nhau trên từng chỉ tiêu.

##### Bước B2.4 — Nâng cấp "Nguyên liệu dưới ngưỡng": Cho xem Thuyết minh cách tính ngưỡng (`ROP`) & Khóa/Bỏ qua Nguyên liệu không còn xài nữa
1. Mở [stock-summary.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/stock-summary.ts) (dòng 66–98):
   - Trong hàm `buildStockSummary`:
     - Lọc bỏ các nguyên liệu có `ingredient.isIgnoredInAlert === true` (hoặc nằm trong danh sách nguyên liệu đã khóa cảnh báo của chi nhánh đó) khỏi mảng cảnh báo `belowThreshold`!
     - Nếu đang lọc theo một chi nhánh cụ thể (`locationId`), đọc ngưỡng tối thiểu của riêng chi nhánh đó `ingredient.branchMinimums?.[locationId] ?? ingredient.minimum` (do Backend/Store thiết lập sẵn cho từng điểm kho).
2. Mở component `BelowThresholdSection` trong [DashboardPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/DashboardPage.tsx) (dòng 308–353):
   - Trên mỗi dòng nguyên liệu đang dưới ngưỡng:
     - Hiển thị rõ: `Tồn khả dụng: X` / `Ngưỡng tối thiểu (ROP): Y` · `Cần bổ sung: Z`.
     - **Thêm nút 1: `📐 Cách tính ngưỡng`** (hoặc rà chuột vào con số ngưỡng):
       - Mở Pop-up nhỏ hiển thị rõ các thông số cấu thành ngưỡng `Y` của nguyên liệu đó (từ các trường `avgDailyUsage`, `leadTimeDays`, `safetyStock`, `thresholdRuleText` do Backend/Store cung cấp):
         - `Mức tiêu thụ bình quân ngày (avgDailyUsage)`: VD `1.200 g/ngày`.
         - `Thời gian chờ cung ứng (leadTimeDays)`: VD `3 ngày`.
         - `Mức tồn kho an toàn dự phòng (safetyStock)`: VD `1.400 g`.
         - `Kết quả ngưỡng cảnh báo tối thiểu (ROP)`: VD `5.000 g` (kèm dòng thuyết minh `thresholdRuleText`).
     - **Thêm nút 2: `🔒 Khóa / Bỏ qua (Ngưng xài)`**:
       - Khi bấm vào, hiển thị hộp xác nhận nhanh cho phép chọn lý do:
         - `Nguyên liệu này không còn sử dụng nữa (Ngưng kinh doanh món)`
         - `Đã thay thế bằng mã nguyên liệu mới`
         - `Nguyên liệu thời vụ đã kết thúc đợt bán`
       - Khi xác nhận, cập nhật `isIgnoredInAlert = true` cho nguyên liệu đó trong `useDemoState` -> Nguyên liệu đó **lập tức được lọc bỏ khỏi bảng cảnh báo dưới ngưỡng**, giúp bảng cảnh báo không còn các cảnh báo thừa!
   - Trên thanh tiêu đề của khung `Nguyên liệu dưới ngưỡng`, thêm nút **`👁️ Đã khóa/bỏ qua (N nguyên liệu)`**: Khi bấm vào sẽ liệt kê các nguyên liệu đã bị khóa/bỏ qua kèm lý do và nút **`Khôi phục cảnh báo`** để giảng viên thấy luồng đóng/mở hoàn chỉnh.

---

### TASK B3: Công thức Sản xuất (`/production/recipes`) — Sắp xếp nói rõ trường (`priority`, `effectiveDate`, `product.name`), Kiểm tra Tất cả Món chứa 1 Nguyên liệu & Thay thế Nhanh Nguyên liệu (Bài toán Trà A trong Món X, Y, Z)

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên
- Sắp xếp theo `priority` (**và nói rõ từng trường khi sort `A -> Z`, `Mới nhất / Cũ nhất`**).
- Lọc nguyên liệu trong công thức. Tôi muốn xem tất cả món có trà xanh chẳng hạn (**Kiểm tra tất cả các món có chứa 1 nguyên liệu được tìm kiếm**).
- Thay thế nguyên liệu bằng cách nào, làm sao thay thế nhanh được.
- Ví dụ là có trà loại A xài cho món X, Y, Z. Muốn thay đổi A trong X thì có ảnh hưởng Y, Z không? Món X cần bỏ đi làm lại hay sao?

#### 🔍 Phân tích hiện trạng các dòng code đang bị lỗi trong Project
1. **Tại [RecipesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/RecipesPage.tsx#L1-L360)**:
   - Chưa có trường `priority` và chưa có bộ sắp xếp nói rõ trường (`recipe.priority`, `recipe.effectiveDate`, `product.name`).
   - Bộ lọc hiện tại chỉ lọc theo tên sản phẩm (`productId`) và trạng thái (`status`), **không hề kiểm tra mảng `recipe.lines` để tìm tất cả các món có chứa một nguyên liệu được tìm kiếm** (ví dụ gõ hoặc chọn *"Trà xanh nhài"* để liệt kê toàn bộ các món có chứa Trà xanh nhài).
   - Hoàn toàn chưa có công cụ **Thay thế nhanh nguyên liệu** và phân tích ảnh hưởng giữa các món `X, Y, Z`.

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 2

##### Bước B3.1 — Bổ sung Bộ Sắp xếp nói rõ trường (`priority`, `effectiveDate`, `product.name`) & Cơ chế Kiểm tra Tất cả các món có chứa 1 nguyên liệu được tìm kiếm tại [RecipesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/RecipesPage.tsx)
1. Mở [RecipesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/RecipesPage.tsx):
   - **Thao tác 1 — Thêm hiển thị & chỉnh sửa `Priority` (Độ ưu tiên)**:
     - Trên mỗi công thức, hiển thị badge Độ ưu tiên dựa trên trường **`recipe.priority`**:
       - `Priority 1 — Cao (Món chủ lực / Signature)` (màu đỏ/cam nổi bật).
       - `Priority 2 — Trung bình (Món tiêu chuẩn)` (màu xanh lam).
       - `Priority 3 — Thấp (Món phụ / Theo mùa)` (màu xám).
     - Cho phép đổi mức `recipe.priority` trong form tạo/sửa công thức hoặc đổi nhanh trên dòng công thức.
   - **Thao tác 2 — Thêm Dropdown `Sắp xếp (Sort)` chỉ rõ chính xác từng trường dữ liệu**:
     - Tạo state `sortBy` trên thanh công cụ với 6 lựa chọn tường minh về trường dữ liệu:
       1. `priority-asc` — **`Độ ưu tiên: Cao → Thấp (1 → 3)`**: Sort tăng dần trên trường **`recipe.priority`** (`a.priority - b.priority`).
       2. `priority-desc` — **`Độ ưu tiên: Thấp → Cao (3 → 1)`**: Sort giảm dần trên trường **`recipe.priority`** (`b.priority - a.priority`).
       3. `name-asc` — **`Tên món: A → Z`**: Sort theo bảng chữ cái trên trường **`product.name`** (tra từ `recipe.productId` sang `ProductItem.name` bằng `localeCompare("vi")`).
       4. `name-desc` — **`Tên món: Z → A`**: Sort ngược bảng chữ cái trên trường **`product.name`**.
       5. `newest` — **`Mới nhất trước`**: Sort giảm dần trên trường **`recipe.effectiveDate`** (`YYYY-MM-DD`, tức `b.effectiveDate.localeCompare(a.effectiveDate)`).
       6. `oldest` — **`Cũ nhất trước`**: Sort tăng dần trên trường **`recipe.effectiveDate`** (`a.effectiveDate.localeCompare(b.effectiveDate)`).
   - **Thao tác 3 — Xây dựng cơ chế "Kiểm tra & Xem tất cả các món có chứa 1 nguyên liệu được tìm kiếm" (`ingredientFilterId` + `ingredientSearchText`)**:
     - Trên thanh Filter của `RecipesPage.tsx`, đặt cụm **"🔎 Kiểm tra món theo nguyên liệu cấu thành"**:
       - Gồm 1 Dropdown chọn nguyên liệu (`"Tất cả nguyên liệu"`, `"NL-001 · Trà đen"`, `"NL-002 · Bột sữa béo"`, `"NL-003 · Trà xanh nhài"`, `"F1-001 · Cốt trà sữa truyền thống"`...) **KẾT HỢP** khả năng gõ từ khóa tên nguyên liệu (ví dụ gõ `"trà xanh"` vào ô tìm kiếm).
     - **Thuật toán kiểm tra 2 tầng (`checkRecipeContainsIngredient`)**:
       - Với mỗi bản ghi `recipe` trong `state.recipes`:
         1. **Tầng 1 — Kiểm tra trực tiếp trong `recipe.lines`**: Duyệt qua từng phần tử `line` thuộc `recipe.lines`. Lấy thông tin `ing = ingredientMap.get(line.ingredientId)`. Nếu `line.ingredientId === ingredientFilterId` HOẶC `ing.name.toLowerCase().includes(keyword)` -> Đánh dấu **Khớp trực tiếp (`Direct Match`)**.
         2. **Tầng 2 — Kiểm tra bắc cầu qua nguyên liệu trung gian `F1`**: Nếu `ing.tier === "F1"` và mảng `ing.parentF0Items` có chứa phần tử `f0` mà `f0.ingredientId === ingredientFilterId` (hoặc tên của `f0` chứa `keyword`) -> Đánh dấu **Khớp gián tiếp qua Cốt F1 (`Transitive F1 Match`)**.
     - **Hiển thị kết quả kiểm tra trực quan**:
       - Ngay bên dưới thanh lọc, khi đang chọn hoặc tìm một nguyên liệu (ví dụ `"Trà xanh nhài"`), hiển thị một **Hộp Kết Quả Kiểm Tra Tất Cả Các Món Chứa Nguyên Liệu**:
         - Ghi rõ: **`✅ Đã kiểm tra toàn bộ công thức: Có N món chứa nguyên liệu [Trà xanh nhài]:`** kèm danh sách các thẻ tên món (`Món 1`, `Món 2`, `Món 3`...) và định lượng nguyên liệu đó trong từng món.
       - Bên trong từng thẻ công thức bên dưới, dòng nguyên liệu khớp tìm kiếm được **tô sáng nền xanh lá (`bg-emerald-50 border-l-4 border-emerald-500 font-bold`)** để giảng viên nhìn thấy ngay lập tức!

##### Bước B3.2 — Xây dựng Công cụ "Thay Thế Nhanh Nguyên Liệu & Phân Tích Tác Động X, Y, Z" tại [RecipesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/RecipesPage.tsx)
1. Đặt một nút lớn nổi bật trên thanh tiêu đề của [RecipesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/RecipesPage.tsx): **`🔄 Thay thế nhanh nguyên liệu & Phân tích ảnh hưởng (X, Y, Z)`**.
2. Khi bấm vào nút này (hoặc mở ngay trên khu vực chuyên trách của trang), hiển thị giao diện **Trình Thay Thế Nhanh & Giải Đáp Nghiệp Vụ 4 Bước**:
   - **Bước 1 — Chọn Nguyên liệu cần thay thế (Ví dụ: Trà loại A)**:
     - Dropdown chọn nguyên liệu đang dùng trong các công thức (ví dụ chọn `NL-001 · Trà đen` hoặc `NL-003 · Trà xanh nhài`).
     - Hệ thống tự động kiểm tra và liệt kê ngay bên dưới **Danh sách tất cả các món (`X, Y, Z`) đang có chứa nguyên liệu A này** kèm định lượng hiện tại trong từng món.
   - **Bước 2 — Chọn Nguyên liệu mới thay thế (Trà loại B) & Định lượng mới**:
     - Dropdown chọn nguyên liệu thay thế (ví dụ đổi sang `NL-003 · Trà xanh nhài` hoặc `F1-002 · Cốt lục trà nhài`) và ô nhập định lượng thay thế.
   - **Bước 3 — Chọn Món cần thay đổi (Chỉ đổi trong Món X hay đổi cả Y, Z?) & Hộp Phân tích Ảnh hưởng Tự động**:
     - Hiển thị danh sách checkbox cho từng món đang dùng Nguyên liệu A:
       - `[✓] Món X (VD: Trà sữa truyền thống)`
       - `[ ] Món Y (VD: Trà sữa Hoàng Kim)`
       - `[ ] Món Z (VD: Hồng trà kem cheese)`
       - Có nút `"Chọn riêng 1 món"` và nút `"Chọn thay thế nhanh toàn bộ các món (Bulk Swap)"`.
     - **Hiển thị Hộp Giải Thích Tự Động trả lời câu hỏi thứ nhất của Giảng viên (*"Muốn thay đổi A trong X thì có ảnh hưởng Y, Z không?"*)**:
       - **Khi người dùng chỉ tích chọn Món X (không tích Y, Z)**:
         > **✅ Kết luận ảnh hưởng: KHÔNG ảnh hưởng tới Món Y và Món Z.**
         > - Lý do kỹ thuật & nghiệp vụ: Mỗi món sở hữu bản ghi phiên bản công thức (`RecipeVersion`) độc lập. Khi thay Nguyên liệu A -> B cho riêng **Món X**, hệ thống chỉ nâng phiên bản công thức mới (ví dụ `v1.2 → v1.3`) cho **Món X**. Công thức của **Món Y** và **Món Z** vẫn giữ nguyên Nguyên liệu A.
         > - **Lưu ý mở rộng (Cấp bán thành phẩm `F1`)**: Nếu A là nguyên liệu thô `F0` nằm trong công thức nấu **Cốt nền `F1` dùng chung** cho cả `X, Y, Z`, việc sửa công thức nấu Cốt `F1` sẽ ảnh hưởng dây chuyền tới cả `X, Y, Z`. Khi chỉ muốn đổi vị cho riêng Món X, hệ thống tự động tách định mức trực tiếp trên công thức của Món X để bảo toàn hương vị gốc của Y và Z!
   - **Bước 4 — Quyết định xử lý đối với Món X / Các mẻ đã chuẩn bị sẵn (*"Món X cần bỏ đi làm lại hay sao?"*)**:
     - Hiển thị 2 tùy chọn Radio rõ ràng kèm giải thích nghiệp vụ để người quản lý chọn trước khi bấm thực thi:
       - **Tùy chọn 1 (`Không bỏ đi — Bán hết các lô/mẻ cũ còn hạn (Sell-through)`)**:
         - *Khi nào dùng*: Khi thay đổi nguyên liệu để cải tiến hương vị, tối ưu chi phí hoặc đổi nhà cung cấp khi nguyên liệu A cũ vẫn đảm bảo chất lượng.
         - *Hệ quả hệ thống*: Các mẻ sản xuất (`ProductionBatch`) và tồn quầy của Món X đã pha theo công thức cũ vẫn tiếp tục bán cho đến khi hết lô; công thức mới áp dụng cho các mẻ/ly pha mới từ thời điểm hiệu lực.
       - **Tùy chọn 2 (`Bỏ đi & Làm lại ngay — Thu hồi lô cũ và tạo mẻ làm lại (Discard & Remake)`)**:
         - *Khi nào dùng*: Khi Nguyên liệu A phát hiện bị hỏng, biến chất, dị vật hoặc pha sai định lượng nghiêm trọng không thể bán cho khách.
         - *Hệ quả hệ thống*: Khi chọn tùy chọn này và bấm **`Thực hiện thay thế nguyên liệu`**, hệ thống đồng thời thực hiện 3 việc:
           1. Tự động tạo phiên bản công thức mới (`vNext`) với Nguyên liệu B cho Món X (và lưu vết vào lịch sử thay thế).
           2. Tự động tạo phiếu điều chỉnh hủy (`StockAdjustment` - lý do: *Hủy lô cũ do thay đổi công thức khẩn cấp / lỗi nguyên liệu A*) đối với các mẻ/lô liên quan của Món X.
           3. Tự động khởi tạo một lệnh **Mẻ sản xuất làm lại (`Remake Batch`)** theo công thức mới trong `state.batches`!


---

### TASK B4: Lô / Mẻ Sản Xuất (`/production/batches`) — Phân phối Nguyên liệu & Truy vết Nguồn gốc 2 Chiều

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên
- **/production/batches**: Chưa thấy cách phân phối nguyên liệu, không truy vết được.

#### 🔍 Phân tích hiện trạng các dòng code đang bị lỗi trong Project
1. **Tại [BatchesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/BatchesPage.tsx#L285-L388)**:
   - Bảng danh sách mẻ sản xuất hiện chỉ có các cột: `Mã mẻ`, `Công thức / Sản phẩm`, `Kế hoạch / Thực tế`, `Mã lô thành phẩm`, `Hạn dùng`, `Trạng thái`, `Thao tác (Bắt đầu nấu / Hoàn thành / Hủy)`.
   - Khi một mẻ đã `"Hoàn thành"` (ví dụ `ME-20261109-01` tạo ra `196 ly` mang mã lô `LOT-ME-01`), người quản lý nhìn vào trang này hoàn toàn **không thấy 196 đơn vị nguyên liệu thành phẩm đó được phân phối đi những chi nhánh nào**, mỗi chi nhánh nhận bao nhiêu, còn tồn ở Kho Tổng bao nhiêu, và cũng **không thể truy vết ngược xem mẻ này đã lấy những lô nguyên liệu thô `F0` nào để nấu ra**!

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 2

##### Bước B4.1 — Bổ sung cột "Nguồn lô nguyên liệu đầu vào" & "Tiến độ phân phối về Chi nhánh" tại [BatchesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/BatchesPage.tsx)
1. Mở [BatchesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/BatchesPage.tsx):
   - **Trong Form Tạo Mẻ Sản Xuất Mới (khoảng dòng 175–280)**:
     - Khi người dùng chọn một công thức `recipeId` để tạo mẻ sản xuất:
       - Tự động liệt kê danh sách các nguyên liệu `F0` cần dùng theo `recipe.lines` và chọn lô khả dụng theo nguyên tắc FEFO (Lô nào hết hạn trước xuất trước) tại Kho Tổng (`locationType === "warehouse"`), hiển thị rõ `Mã lô xuất nấu (VD: LOT-TD-01 · NCC Trà Việt)`.
       - Lưu danh sách lô đầu vào này vào `batch.inputLotsUsed` khi bấm tạo mẻ.
   - **Trên Bảng Danh sách Mẻ sản xuất (dòng 310–388)**:
     - Bổ sung cột **`Truy vết Lô đầu vào (F0)`**: Hiển thị các pill mã lô nguyên liệu gốc đã xuất nấu mẻ đó (ví dụ: `LOT-TD-01 (Trà đen)` · `LOT-BS-01 (Bột sữa)`).
     - Bổ sung cột **`Phân phối về Chi nhánh`**:
       - Hiển thị thanh tiến độ (Progress Bar) kèm chi tiết từng chi nhánh từ `batch.branchDistributions`:
         - Ví dụ: **`Đã phân phối: 160 / 196 (Còn tại Kho Tổng: 36)`**
         - Dòng pill bên dưới: `CN01: 70` · `CN05: 50` · `CN08: 40`.
     - Tại cột **`Thao tác`**:
       - Thêm nút **`🚚 Phân phối về CN`** (hiển thị cho các mẻ đã `"Hoàn thành"` và còn số dư tại Kho Tổng).
       - Thêm nút **`🔍 Sơ đồ Truy vết (Traceability)`** cho mọi mẻ sản xuất.

##### Bước B4.2 — Xây dựng Modal "Phân phối Nguyên liệu từ Mẻ về Chi nhánh" & Modal "Sơ đồ Truy vết 2 Chiều"
1. **Modal 1 — `🚚 Phân phối Nguyên liệu Thành phẩm từ Mẻ về các Chi nhánh`**:
   - Khi bấm nút `🚚 Phân phối về CN` trên một mẻ:
     - Hiển thị thông tin mẻ: Mã mẻ, Mã lô thành phẩm (`lotCode`), Tổng sản lượng thực thu, Số lượng đã phân phối, **Số lượng còn lại tại Kho Tổng có thể phân phối**.
     - Hiển thị bảng nhập số lượng phân bổ cho từng chi nhánh (`CN01 - Nguyễn Huệ`, `CN05 - Hàng Xanh`, `CN08 - Cầu Giấy`) kèm gợi ý định mức nhu cầu của từng chi nhánh.
     - Khi bấm **`Xác nhận xuất phân phối`**:
       1. Ghi bản ghi phân phối mới vào `batch.branchDistributions` và `state.allocations`.
       2. Cập nhật số lượng tồn của lô thành phẩm tại Kho Tổng và tạo phiếu nhập (`ReceiptRecord` / `IngredientLot` tại quầy chi nhánh) để dữ liệu liên thông sang trang Kho và Kế hoạch phân phối!
2. **Modal / Drawer 2 — `🔍 Truy vết Nguồn gốc & Hành trình Phân phối Lô Mẻ (2-Way Traceability)`**:
   - Hiển thị sơ đồ truy vết khép kín gồm **4 mắt xích nối tiếp nhau**:
     - **Mắt xích 1 — Nguồn gốc Nguyên liệu Đầu vào `F0` & Nhà cung cấp (`Backward Trace`)**:
       - Bảng liệt kê: Tên nguyên liệu `F0` · Mã lô nhập kho (`LOT-...`) · Tên Nhà cung cấp · Ngày nhập kho · Hạn sử dụng · Khối lượng đã lấy vào mẻ.
     - **Mắt xích 2 — Hồ sơ Mẻ Sản Xuất (`Production Batch`)**:
       - Mã mẻ · Công thức & Phiên bản áp dụng · Thời điểm nấu · Người vận hành · Sản lượng kế hoạch vs Thực thu · Mã lô bán thành phẩm đầu ra (`LOT-ME-...`).
     - **Mắt xích 3 — Hành trình Phân phối về các Chi nhánh (`Forward Distribution`)**:
       - Bảng liệt kê từng phiếu xuất phân phối về `CN01`, `CN05`, `CN08`: Mã phiếu chuyển kho (`PXK-...`) · Chi nhánh nhận · Số lượng giao · Thời gian nhận · Số lượng đã dùng tại quầy · Số lượng còn tồn tại quầy hiện tại.
     - **Mắt xích 4 — Các Món ăn trên Menu sử dụng lô thành phẩm này (`Downstream Menu Impact`)**:
       - Hiển thị danh sách các món đồ uống sử dụng thành phẩm của mẻ này (ví dụ: *Trà sữa truyền thống*, *Trà sữa Hoàng Kim*) kèm trạng thái an toàn chất lượng.

---

### TASK B5: Kế hoạch Sản xuất & Phân phối (`/production/planning` & `/distribution/planning`) — Kế hoạch Cố định Kho Tổng, Lượng thêm Tạm thời, Góp ý Thanh Hương & Phân cấp `F0 -> F1 -> Món`

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên
- **/production/planning**:
  - Cần có **kế hoạch cố định ở kho tổng** số cần chuẩn bị. Hôm báo thiếu thì thay đổi tăng cho ngày mai, hay cho nhiều ngày khác:
    - **Dự kiến thay đổi nhưng không thay đổi kế hoạch tổng**.
    - **Bổ sung thời lượng hiệu lực "lượng thêm"**.
  - **Conclusion**: Thay đổi tạm thời có ảnh hưởng tới thay đổi cố định, và thay đổi trong tương lai hay không? Và cái thay đổi tạm thời này kéo dài bao lâu?
  - **Thanh Hương bình luận**: Có cách **biến tạm thời thành cố định**, với **xem được lịch sử phân phối**.
  - **Tỷ lệ rõ ràng, thuyết minh cách tính**.
  - **Có thêm phân cấp nguyên liệu**:
    - `Nguyên liệu F0 -> Nguyên liệu F1 -> Món`. Ví dụ: `F0: {trà, sữa} -> F1: {cốt trà sữa} -> Món: {trà sữa vị gì đó}`.
    - `Nguyên liệu F0 -> Món`. Ví dụ: `F0: {thạch} -> Món: {thạch trân châu siêu cấp hoả hạn}`.

#### 🔍 Phân tích hiện trạng các dòng code đang bị lỗi trong Project
1. **Tại [DistributionPlanningPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/distribution/DistributionPlanningPage.tsx#L39-L205)**:
   - Dòng 39–45: Chỉ khai báo một mảng cứng `DIRECT_COUNTER_INGREDIENT_IDS = ["nl-003", "nl-005", "nl-006"]`, hoàn toàn chưa thể hiện cây phân cấp 2 luồng `F0 -> F1 -> Món` và `F0 -> Món`.
   - Dòng 118–205: Bảng lập kế hoạch hiện chỉ là các ô nhập tay một lần cho 1 ngày duy nhất (`expectedCups` và `needQuantity` rời nhau, không hiển thị tỷ lệ định mức chuẩn trên từng đơn vị món).
   - Hoàn toàn **chưa có Kế hoạch cố định ở Kho Tổng (`Master Fixed Plan`)**, chưa có cơ chế **Lượng thêm tạm thời (`Temporary Extra`) có Thời lượng hiệu lực**, chưa có nút **Biến tạm thời thành cố định**, và chưa có bảng **Lịch sử phân phối** như Thanh Hương góp ý.

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 2

##### Bước B5.1 — Xây dựng Khu vực 1: "Sơ đồ Phân cấp Nguyên liệu (`F0 -> F1 -> Món` vs `F0 -> Món`) & Bảng Tỷ lệ Định mức"
1. Mở [DistributionPlanningPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/distribution/DistributionPlanningPage.tsx):
   - Đặt ở phần đầu trang một khu vực trực quan chia làm 2 cột rõ ràng thể hiện đúng 2 luồng phân cấp nguyên liệu mà giảng viên đã vẽ trong note:
     - **Khung 1A — Luồng phân cấp 2 cấp (`Nguyên liệu F0 -> Nguyên liệu F1 (Bán thành phẩm) -> Món`)**:
       - Hiển thị sơ đồ chuỗi 3 bậc với ví dụ định lượng cụ thể:
         - **Bậc 1 — Nguyên liệu gốc `F0` (Kho Tổng)**: `{Trà đen (NL-001): 30g, Bột sữa béo (NL-002): 50g, Siro đường (NL-004): 40ml}`
         - -> *(Nấu mẻ chuẩn tại Bếp Trung Tâm)* -> **Bậc 2 — Nguyên liệu sơ chế `F1`**: `{Cốt trà sữa truyền thống (F1-001): 1.000 ml}`
         - -> *(Định mức pha chế: 180 ml Cốt F1 / 1 ly)* -> **Bậc 3 — Món hoàn chỉnh tại Quầy**: `{Trà sữa truyền thống, Trà sữa Hoàng Kim, Trà sữa Ô Long}`
       - Hiển thị thêm ví dụ thứ 2 của luồng `F0 -> F1 -> Món`: `F0: {Kem béo thực vật + Sữa tươi}` -> `F1: {Kem Macchiato đánh sẵn}` -> `Món: {Hồng trà kem cheese}`.
     - **Khung 1B — Luồng phân cấp 1 cấp trực tiếp (`Nguyên liệu F0 -> Món`)**:
       - Hiển thị sơ đồ chuỗi 2 bậc không qua nấu trung gian `F1`:
         - **Bậc 1 — Nguyên liệu gốc `F0` ăn liền**: `{Thạch đào / Thạch củ năng / Trân châu trắng ăn liền (NL-005): 50g / ly}`
         - -> *(Xuất thẳng từ Kho Tổng về Quầy CN, không qua F1)* -> **Bậc 2 — Món hoàn chỉnh**: `{Thạch trân châu siêu cấp hoả hạn, Trà đào cam sả nhiệt đới}`
   - **Khung 1C — Hộp Tỷ lệ Định mức & Thuyết minh Quy đổi (`Explicit Ratio & Rule Box`)**:
     - Hiển thị rõ các thông tin định mức do Backend/Store trả về cho từng nguyên liệu:
       1. `ratioPerCupLabel`: Định mức chuẩn trên 1 ly (ví dụ: `180 ml Cốt trà sữa F1 / 1 ly`, `50 g Thạch F0 / 1 ly`).
       2. `f1ToF0RatioLabel`: Định mức nguyên liệu gốc `F0` cần để nấu 1 đơn vị mẻ `F1`.
       3. `allocationRuleText`: Mô tả quy tắc điều phối (Tổng dự kiến chuẩn bị gồm Kế hoạch cố định cộng Lượng thêm tạm thời đang trong thời hạn hiệu lực, đối chiếu với tồn khả dụng tại quầy chi nhánh).

##### Bước B5.2 — Xây dựng Khu vực 2: "Bảng Kế hoạch Cố định ở Kho Tổng vs Dự kiến Thay đổi Tạm thời (Lượng thêm + Thời lượng hiệu lực)"
1. Trong [DistributionPlanningPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/distribution/DistributionPlanningPage.tsx):
   - Thêm bộ chọn **Ngày xem kế hoạch (`planViewDate`)** ở đầu bảng (có các nút chọn nhanh: `Hôm nay`, `Ngày mai (+1 ngày)`, `Ngày kia (+2 ngày)`, `Sau 5 ngày (+5 ngày)`, `Sau 10 ngày (+10 ngày)`) để giảng viên bấm chuyển ngày là thấy ngay hiệu ứng **Lượng thêm tạm thời tự động có hiệu lực trong khung ngày và tự động hết hiệu lực khi qua ngày kết thúc**!
   - Thiết kế **Bảng Điều Phối Kế Hoạch Kho Tổng** gồm các cột rõ ràng cho từng Chi nhánh (`CN01`, `CN05`, `CN08`) và hàng **Tổng Chuẩn Bị Tại Kho Tổng**:
     1. **Cột `Chi nhánh & Nguyên liệu (Cấp F0 / F1)`**.
     2. **Cột `Kế hoạch Cố định ở Kho Tổng (Fixed Master Plan)`**:
        - Hiển thị số ly cố định và lượng nguyên liệu cố định chuẩn mỗi ngày (ví dụ: `CN01: 220 ly/ngày → 39.600 ml Cốt trà sữa F1`, `CN05: 180 ly/ngày → 32.400 ml`, `CN08: 150 ly/ngày → 27.000 ml`; **Tổng Kế hoạch Cố định Kho Tổng = `550 ly/ngày (99.000 ml)`**).
        - Có nhãn khóa bảo vệ: `🔒 Cố định gốc (Không tự biến đổi khi báo thiếu tạm thời)`.
     3. **Cột `Lượng thêm Tạm thời (Temp Extra)` & `Thời lượng hiệu lực`**:
        - Nếu tại ngày `planViewDate` đang có bản ghi Lượng thêm tạm thời còn hiệu lực (`startDate <= planViewDate <= endDate` và `status === "active"`):
          - Hiển thị badge nổi bật: **`+40 ly/ngày (+7.200 ml)`**.
          - Hiển thị rõ **Thời lượng hiệu lực**: **`⏱️ Hiệu lực: 3 ngày (16/11 → 18/11) · Còn 2 ngày`** kèm lý do (`"Hôm qua CN01 báo thiếu cốt trà sữa giờ cao điểm"`).
        - Nếu `planViewDate > endDate`: Hiển thị nhãn xám `Đã hết thời lượng hiệu lực — Tự động quay về mức cố định (+0)`.
     4. **Cột `Dự kiến Cần Chuẩn bị Ngày [planViewDate] (Effective Total)`**:
        - Hiển thị rõ số liệu tổng hợp: **`Dự kiến chuẩn bị hôm nay: 590 ly (+40 ly tạm thời) · Kế hoạch cố định gốc vẫn giữ nguyên: 550 ly`**.
     5. **Cột `Tồn hiện tại ở Quầy CN & Lượng Thực Xuất Phân Phối`**.
     6. **Cột `Thao tác Điều chỉnh & Chuyển đổi`**:
        - **Nút 1: `➕ Báo thiếu / Thêm lượng tạm thời`**:
          - Mở Modal cho phép chọn: Chi nhánh báo thiếu · Nguyên liệu / Số ly cần tăng thêm · **Chế độ áp dụng**: `Tăng cho Ngày mai (1 ngày)` | `Tăng cho 3 ngày tới` | `Tăng cho 7 ngày tới` | `Tùy chỉnh Từ ngày ... Đến ngày ...` · Lý do báo thiếu.
          - Khi bấm Lưu: Tạo bản ghi vào `state.temporaryPlanOverrides` mà **tuyệt đối không sửa vào `state.masterFixedPlans`**.
        - **Nút 2: `📌 Biến tạm thời thành cố định` (Thực hiện đúng bình luận của Thanh Hương)**:
          - Hiển thị ngay trên dòng có Lượng thêm tạm thời.
          - Khi bấm nút **`📌 Biến tạm thời thành cố định`**, hệ thống thực hiện:
            1. Cập nhật lượng tăng thêm (`+40 ly/ngày`) vào định mức cố định gốc của chi nhánh đó trong `state.masterFixedPlans` (`220 ly → 260 ly/ngày`, Tổng Kho Tổng nâng từ `550 → 590 ly/ngày`).
            2. Đổi trạng thái bản ghi tạm thời sang `"promoted_to_fixed"` (`Đã chuyển thành định mức cố định`).
            3. Ghi một dòng vào **Lịch sử phân phối & điều chỉnh kế hoạch**!

##### Bước B5.3 — Xây dựng Khu vực 3: "Hộp Giải đáp Conclusion của Giảng viên" & "Bảng Lịch sử Phân phối (Thanh Hương)"
1. Ngay bên dưới bảng kế hoạch trong [DistributionPlanningPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/distribution/DistributionPlanningPage.tsx), đặt **Khung Giải Đáp Trực Tiếp Câu Hỏi Conclusion**:
   - **Câu hỏi 1**: *Thay đổi tạm thời có ảnh hưởng tới thay đổi cố định không?*
     -> **Trả lời**: **Không**. Kế hoạch cố định ở Kho Tổng (`Master Fixed Plan`) được lưu tách biệt hoàn toàn với danh sách Lượng thêm tạm thời (`Temporary Overrides`). Khi báo thiếu hôm nay để tăng cho ngày mai, chỉ có `Tổng dự kiến chuẩn bị ngày mai` tăng lên, còn `Kế hoạch cố định gốc` giữ nguyên 100%.
   - **Câu hỏi 2**: *Thay đổi tạm thời có ảnh hưởng tới tương lai hay không và kéo dài bao lâu?*
     -> **Trả lời**: Mỗi khoản lượng thêm tạm thời đều gắn **Thời lượng hiệu lực (`startDate` -> `endDate`, tính bằng số ngày hiệu lực)**. Nó chỉ cộng thêm vào sản lượng chuẩn bị của các ngày tương lai nằm trong khoảng `[startDate, endDate]`. Ngay khi bước sang ngày sau `endDate`, lượng thêm tự động hết hiệu lực và kế hoạch tương lai quay trở về đúng mức Kế hoạch cố định ban đầu (trừ khi người quản lý chủ động bấm nút **`📌 Biến tạm thời thành cố định`**).
2. Ngay bên cạnh hoặc bên dưới, thiết kế bảng **`📜 Lịch sử Phân phối & Biến động Kế hoạch (Theo góp ý của Thanh Hương)`**:
   - Hiển thị đầy đủ các cột: `Thời gian / Ngày phân phối` · `Chi nhánh nhận` · `Nguyên liệu (Cấp F0/F1)` · `Định mức cố định` · `Lượng thêm tạm thời (kèm thời lượng hiệu lực)` · `Tổng lượng đã phân phối` · `Loại thao tác (Phân phối định kỳ / Báo thiếu tạm thời / Chuyển tạm thời thành cố định)` · `Người thực hiện & Mã phiếu kho`.
   - Có bộ lọc theo Chi nhánh và theo Loại biến động để tra cứu lịch sử phân phối cực nhanh.

---

### TASK B6: Tồn kho Cửa hàng & Đối soát Ca (`/stores/ingredients` & `/stores/shift-reconciliation`)

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên
- **/stores/ingredients** & **/stores/shift-reconciliation**:
  - Đang thêm xóa sửa bớt thông tin?
  - Nếu chọn chi nhánh thì sẽ giới hạn input field là nhân viên thuộc chi nhánh nào.
  - Quản lý chi nhánh chỉ thấy được những đối soát ở chỗ họ.
  - Có nghĩa là mở đóng ca, thì chỉ nên quy định trong phạm vi CN để mở ca, do QN tổng không có mặt trực tiếp không thể quản lý được.
  - QN tổng chỉ là đối soát báo cáo, phân công nhân viên thuộc CN nào.

#### 🔍 Phân tích hiện trạng các dòng code đang bị lỗi trong Project
1. **Tại [ShiftReconciliationPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/ShiftReconciliationPage.tsx#L232-L280) và [StoreIngredientsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/StoreIngredientsPage.tsx#L41-L70)**:
   - Cả hai trang đều **chưa gọi `scopedBranch()`** từ `auth.ts`! Do đó khi Quản lý chi nhánh (`manager` thuộc `CN05`) đăng nhập, họ vẫn nhìn thấy và chỉnh sửa được đối soát ca của `CN01`, `CN02`, `CN03`.
2. **Tại [ShiftReconciliationPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/ShiftReconciliationPage.tsx#L619-L653)**:
   - Trong Modal `"Tạo đối soát ca mới"`, 3 ô **`Thu ngân mở ca` (`formOpener`, dòng 622)**, **`Nhân viên kiểm đếm` (`formCounter`, dòng 634)** và **`Quản lý phụ trách` (`formApprover`, dòng 646)** đang là **3 thẻ `<input type="text">` nhập chữ tự do**, không hề giới hạn theo danh sách nhân viên thuộc chi nhánh đang chọn!
3. **Tại [ShiftReconciliationPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/ShiftReconciliationPage.tsx#L285-L420)**:
   - Chưa có chức năng xóa bản nháp đối soát tạo nhầm, chưa khóa chặt các bản ghi đã duyệt, và chưa có giao diện để **Quản lý tổng (`owner`) phân công nhân viên thuộc chi nhánh nào**.

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 2

##### Bước B6.1 — Khóa phạm vi Chi nhánh cho Quản lý chi nhánh (`manager`) tại cả [StoreIngredientsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/StoreIngredientsPage.tsx) và [ShiftReconciliationPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/ShiftReconciliationPage.tsx)
1. Mở [StoreIngredientsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/StoreIngredientsPage.tsx) (dòng 41–75):
   - Import `scopedBranch, getCurrentRole` từ `../../utils/auth`.
   - Khai báo `const lockedBranch = scopedBranch();`.
   - Nếu `lockedBranch` khác `null` (ví dụ Quản lý chi nhánh `CN05`):
     - Khởi tạo `storeId = lockedBranch` (`"CN05"`).
     - Trên dropdown chọn cửa hàng, chỉ hiển thị duy nhất `CN05 - Hàng Xanh` (khóa `disabled`), để Quản lý chi nhánh chỉ xem và quản lý tồn kho của đúng chi nhánh mình.
2. Mở [ShiftReconciliationPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/ShiftReconciliationPage.tsx) (dòng 230–285):
   - Import `scopedBranch, getCurrentRole, can` từ `../../utils/auth`.
   - Khai báo `const lockedBranch = scopedBranch();` và `const role = getCurrentRole();`.
   - Nếu `lockedBranch` khác `null` (Quản lý chi nhánh `CN05` hoặc nhân viên `CN01`):
     - Khóa cứng `branchFilter = lockedBranch`.
     - Trong mảng `filteredRecords`: Bắt buộc lọc `r.branchCode === lockedBranch` để **Quản lý chi nhánh chỉ nhìn thấy những đối soát ở đúng chi nhánh của họ (`CN05`)**, tuyệt đối không nhìn thấy đối soát của chi nhánh khác!

##### Bước B6.2 — Giới hạn các ô Input Nhân viên theo đúng Chi nhánh đang chọn (`Branch-Scoped Employee Selectors`)
1. Trong [ShiftReconciliationPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/ShiftReconciliationPage.tsx):
   - Tạo danh mục nhân sự theo từng chi nhánh (lưu vào state có đồng bộ `localStorage["milktyway_branch_staff_v1"]` để Quản lý tổng có thể phân công/điều chuyển ở Bước B6.3):
     - **`CN01 - Nguyễn Huệ`**:
       - Thu ngân / Pha chế: `Lê Quốc Tuấn Anh`, `Nguyễn An`, `Trần Bình`.
       - Quản lý chi nhánh / Ca trưởng: `Võ Minh Hoàng (Quản lý CN01)`, `Nguyễn An (Ca trưởng)`.
     - **`CN02 - Thảo Điền`**:
       - Thu ngân / Pha chế: `Lê Châu`, `Hoàng Nam`, `Phan Thảo`.
       - Quản lý chi nhánh / Ca trưởng: `Trần Quốc Bảo (Quản lý CN02)`.
     - **`CN03 - Phú Mỹ Hưng`**:
       - Thu ngân / Pha chế: `Võ Minh`, `Đặng Khoa`, `Bùi Vy`.
       - Quản lý chi nhánh / Ca trưởng: `Lê Thị Mai (Quản lý CN03)`.
     - **`CN05 - Hàng Xanh`**:
       - Thu ngân / Pha chế: `Phạm Hương`, `Đỗ Quang`, `Ngô Linh`.
       - Quản lý chi nhánh / Ca trưởng: `Trần Thị Quản Lý (Quản lý CN05)`, `Phạm Hương (Ca trưởng)`.
   - **Tại Modal Tạo/Chỉnh sửa Đối soát (dòng 590–660)**:
     - Khi người dùng chọn `formBranch` (ví dụ `"CN05"`), lọc ngay danh sách nhân viên thuộc `formBranch` đó.
     - **Thay thế hoàn toàn 3 ô `<input type="text">` ở dòng 622, 634, 646 bằng 3 thẻ `<select>`**:
       1. Dropdown **`Nhân viên mở ca (`formOpener`)`**: Chỉ hiển thị các Thu ngân / Ca trưởng thuộc đúng `formBranch`.
       2. Dropdown **`Nhân viên kiểm đếm / đóng ca (`formCounter`)`**: Chỉ hiển thị các Thu ngân / Pha chế thuộc đúng `formBranch`.
       3. Dropdown **`Quản lý chi nhánh đối soát (`formApprover`)`**: Chỉ hiển thị Quản lý chi nhánh / Ca trưởng thuộc đúng `formBranch`.
     - Khi đổi `formBranch`, tự động reset và gán mặc định nhân viên đầu tiên của chi nhánh mới cho cả 3 dropdown!

##### Bước B6.3 — Làm rõ quy tắc Thêm/Xóa/Sửa & Xây dựng tính năng "Phân công Nhân viên thuộc Chi nhánh" cho Quản lý Tổng (`owner`)
1. **Làm rõ quy tắc Thêm / Xóa / Sửa thông tin đối soát (Trả lời câu hỏi *"đang thêm xóa sửa bớt thông tin?"* của giảng viên)**:
   - Hiển thị rõ quy tắc vòng đời biên bản đối soát trên giao diện:
     - **Thêm mới / Sửa / Xóa bản nháp (`status === "pending"` hoặc `"flagged"`)**: Chỉ thực hiện trong phạm vi Chi nhánh bởi Quản lý chi nhánh (có nút **`✏️ Sửa số liệu kiểm chứng / Giải trình`** và nút **`🗑️ Xóa biên bản nháp tạo nhầm`** đối với các biên bản chưa chốt sổ).
     - **Đã phê duyệt chốt sổ (`status === "approved"`)**: Khóa cứng hoàn toàn (`readOnly`), không cho sửa hoặc xóa để bảo toàn dữ liệu kế toán.
2. **Phân định vai trò Quản lý Tổng (`owner`) vs Quản lý Chi nhánh (`manager`)**:
   - **Nếu người đăng nhập là Quản lý Tổng (`role === "owner"`)**:
     - Không hiển thị nút `"Mở/Đóng ca tại quầy"`, mà hiển thị rõ vai trò: **`📊 Chế độ Quản trị Tổng: Đối soát Báo cáo Toàn chuỗi & Phân công Nhân sự Chi nhánh`**.
     - Thêm nút nổi bật **`👥 Phân công Nhân viên theo Chi nhánh`** trên thanh công cụ của trang `/stores/shift-reconciliation`:
       - Khi bấm vào, mở **Modal Quản lý & Phân công Nhân sự Chi nhánh**:
         - Hiển thị danh sách toàn bộ nhân viên kèm vai trò (`Thu ngân`, `Pha chế`, `Ca trưởng`, `Quản lý chi nhánh`) và **Chi nhánh hiện tại (`CN01`, `CN02`, `CN03`, `CN05`, `CN08`)**.
         - Cho phép Quản lý tổng **chuyển nhân viên từ chi nhánh này sang chi nhánh khác** hoặc **thêm nhân viên mới vào một chi nhánh**.
         - Ngay sau khi Quản lý tổng phân công xong, danh sách dropdown nhân viên của chi nhánh đó trong form Đối soát ca sẽ cập nhật ngay lập tức!

---

### TASK B7: Nhà Cung Cấp (`/suppliers`), Báo Cáo Tồn Kho (`/reports/inventory-report`) & Báo Cáo Lãi Lỗ (`/reports/profit-loss`)

#### 📌 Nguyên văn yêu cầu từ Note Giảng viên
- **/suppliers**:
  - Nhà cung cấp từ bao lâu.
  - Biểu đồ của phần suppliers, và reports:
    - Đối với admin: phải có filter chọn chi nhánh.
    - Đối với quản lý: chỉ xem được của chính chi nhánh đó.
- **/reports/inventory-report**:
  - Cái bảng màu vàng quá GỚM!
- **/reports/profit-loss**:
  - Đỏ lòm gớm.
  - Cân bằng thu chi: `(doanh thu - chi phí) * (1 - thuế)`. Xem lại công thức tính toán.
  - Coi được kết quả của đợt khuyến mãi.

#### 🔍 Phân tích hiện trạng các dòng code đang bị lỗi trong Project
1. **Tại [SuppliersPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/suppliers/SuppliersPage.tsx#L12-L95)**:
   - Thiếu trường ngày bắt đầu hợp tác (`partnerSince`) để biết nhà cung cấp đã gắn bó từ bao lâu.
   - Chưa có biểu đồ phân tích nhà cung cấp và chưa có filter chi nhánh theo quy tắc Admin (chọn được các chi nhánh) vs Quản lý chi nhánh (chỉ xem được chi nhánh mình).
2. **Tại [InventoryReportPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/InventoryReportPage.tsx#L137-L186)**:
   - Dòng 137: `border-2 border-amber-300 dark:border-amber-700/60`.
   - Dòng 138: `bg-amber-500/10 ... border-b border-amber-200` + chấm tròn `animate-pulse` màu đỏ + chữ `text-amber-900`.
   - Dòng 163: Các dòng `<tr>` tô nền `bg-red-50/50` và `bg-amber-50/30`.
   - Tất cả kết hợp lại tạo ra một **"bảng màu vàng quá GỚM!"** đúng như giảng viên phê bình.
3. **Tại [ProfitLossPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/ProfitLossPage.tsx#L219-L410)**:
   - Dòng 219–225: Thẻ KPI `GIÁ VỐN HÀNG BÁN (COGS)` để `tone="danger"` (màu đỏ).
   - Dòng 263–296: Khung cảnh báo chi nhánh lỗ `CN11, CN12` dùng `border-2 border-red-300 bg-red-50/40`, header `bg-red-500/10`, chữ `text-red-700 / text-red-600` dày đặc.
   - Dòng 356, 377, 383: Dòng `<tr>` tô nền `bg-red-50/60`, cả 12 dòng ở cột `Giá vốn` (dòng 377) và cột `Chi phí vận hành` (dòng 383) đều tô chữ đỏ `text-red-600` làm cả màn hình **"đỏ lòm gớm"**!
   - Dòng 43–195: Chưa tính thuế trong công thức `(Doanh thu - Chi phí) * (1 - Thuế)`, `breakEven` đang ghi số cứng, chưa gọi `scopedBranch()` để khóa Quản lý chi nhánh về `CN05`, và chưa có phần xem **Kết quả của đợt khuyến mãi**.

#### 🛠️ Hướng dẫn thực hiện từng bước cho Người 2

##### Bước B7.1 — Thêm "Nhà cung cấp từ bao lâu (`partnerSince`)", Bộ Sắp xếp nói rõ trường (`name`, `partnerSince`) & Biểu đồ/Filter theo Chi nhánh tại [SuppliersPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/suppliers/SuppliersPage.tsx)
1. Mở [SuppliersPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/suppliers/SuppliersPage.tsx) (dòng 12–95):
   - Trong `SupplierRecord` (dòng 12–26), thêm:
     - `partnerSince: string`: Ngày bắt đầu hợp tác định dạng `YYYY-MM-DD` (ví dụ `NCC-001`: `"2021-03-15"`, `NCC-002`: `"2022-07-01"`, `NCC-003`: `"2023-01-10"`, `NCC-004`: `"2024-05-20"`, `NCC-005`: `"2025-09-01"`, `NCC-006`: `"2026-02-15"`).
     - `partnerDurationLabel?: string`: Chuỗi thời gian hợp tác hiển thị trên giao diện (ví dụ `"4 năm 8 tháng"`, `"3 năm 4 tháng"`, `"9 tháng"`).
     - `branchBreakdown: Record<string, { purchaseAmount: number; debtAmount: number; onTimeRate: number; poCount: number }>`: Số liệu mua hàng, công nợ và tỷ lệ giao đúng hạn tách theo từng chi nhánh (`CN01`, `CN02`, `CN03`, `CN05`, `CN08`).
   - Hiển thị rõ trên bảng và trong Modal chi tiết NCC:
     - Hiển thị **`{years} năm {months} tháng`** (kèm dòng phụ `Từ {DD/MM/YYYY}` và phân hạng: `Đối tác chiến lược lâu năm`, `Đối tác thân thiết`, `NCC mới`).
   - **Bổ sung Bộ Sắp xếp (`sortBy`) nói rõ chính xác từng trường dữ liệu**:
     - `name-asc` (**`Tên NCC: A → Z`**): Sort trực tiếp trên trường **`supplier.name`** bằng `a.name.localeCompare(b.name, "vi")`.
     - `name-desc` (**`Tên NCC: Z → A`**): Sort ngược trên trường **`supplier.name`**.
     - `oldest` (**`Hợp tác lâu năm nhất / Cũ nhất`**): Sort tăng dần trên trường **`supplier.partnerSince`** (`a.partnerSince.localeCompare(b.partnerSince)` — ngày `"2021-03-15"` đứng đầu).
     - `newest` (**`Mới hợp tác nhất / Mới nhất`**): Sort giảm dần trên trường **`supplier.partnerSince`** (`b.partnerSince.localeCompare(a.partnerSince)` — ngày `"2026-02-15"` đứng đầu).
   - **Thực thi quy tắc Filter Chi nhánh cho Admin vs Quản lý chi nhánh**:
     - Gọi `const lockedBranch = scopedBranch();`.
     - Nếu là **Admin (`lockedBranch === null`)**: Hiển thị Dropdown **`Chọn Chi nhánh xem báo cáo NCC`** (`Toàn chuỗi` | `CN01 - Nguyễn Huệ` | `CN02 - Thảo Điền` | `CN03 - Phú Mỹ Hưng` | `CN05 - Hàng Xanh` | `CN08 - Cầu Giấy`).
     - Nếu là **Quản lý chi nhánh (`lockedBranch === "CN05"`)**: Khóa cứng `branchFilter = "CN05"`, ẩn các chi nhánh khác, chỉ hiển thị số liệu cung ứng và biểu đồ của riêng **`CN05 - Hàng Xanh`**.
   - **Thêm Biểu đồ Phân tích Nhà cung cấp theo Chi nhánh**:
     - Đặt một khung biểu đồ (gồm Biểu đồ cột ngang `Top Giá trị nhập hàng & Công nợ theo NCC` và Biểu đồ `Tỷ lệ giao hàng đúng hạn (%)`) tự động thay đổi số liệu khi Admin đổi chi nhánh trên filter!
   - Trên bảng danh sách NCC và trong Modal Thêm/Sửa NCC:
     - Thêm cột **`Hợp tác từ bao lâu (partnerSince)`** (hiển thị nổi bật số năm/tháng gắn bó và ngày bắt đầu hợp tác) + cho phép chọn ngày bắt đầu hợp tác khi tạo/sửa NCC.

##### Bước B7.2 — Xóa sạch "Bảng màu vàng quá GỚM!" & Đồng bộ Filter Chi nhánh tại [InventoryReportPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/InventoryReportPage.tsx)
1. Mở [InventoryReportPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/InventoryReportPage.tsx):
   - **Tại dòng 137–186 (Khung bảng `"Danh sách nguyên liệu cần xử lý ngay"`)**:
     - **Dòng 137**: Xóa `border-2 border-amber-300 dark:border-amber-700/60`, thay bằng `border border-gray-200 dark:border-gray-800 shadow-sm`.
     - **Dòng 138**: Xóa `bg-amber-500/10` và `border-b border-amber-200 dark:border-amber-800/40`, thay bằng `bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800`.
     - **Dòng 140–145**: Xóa chấm tròn nhấp nháy `<span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />` và đổi màu chữ tiêu đề từ `text-amber-900 dark:text-amber-200` sang màu chữ chuẩn `text-gray-900 dark:text-white`.
     - **Dòng 146**: Đổi badge bên phải từ `bg-amber-500/20 text-amber-900` sang badge xám/xanh mảnh tinh tế `bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`.
     - **Dòng 163**: Trong vòng lặp `actionableRows.map(...)`, xóa bỏ hoàn toàn việc tô màu nền dòng `bg-red-50/50` và `bg-amber-50/30` trên thẻ `<tr>`. Giữ thẻ `<tr>` nền trắng sạch sẽ (`hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors`), chỉ giữ các pill badge nhỏ gọn trong cột `Tình trạng`!
   - **Tại khu vực Biểu đồ & Bộ lọc Chi nhánh (dòng 80–134 và 215–310)**:
     - Đảm bảo khi đăng nhập là **Admin (`owner`)**: Có dropdown chọn xem `Toàn chuỗi` hoặc chọn từng chi nhánh (`Kho Tổng`, `CN01`, `CN05`, `CN08`), và khi chọn chi nhánh nào thì **cả Biểu đồ tồn kho lẫn Bảng chi tiết đều vẽ lại theo đúng chi nhánh đó**.
     - Khi đăng nhập là **Quản lý chi nhánh (`manager`)**: Khóa cứng ở `CN05 - Hàng Xanh`, chỉ hiển thị biểu đồ và số liệu tồn kho của riêng `CN05`.

##### Bước B7.3 — Sửa lỗi "Đỏ lòm gớm", Hiển thị Cân bằng Thu Chi & Lợi nhuận sau thuế (`(Doanh thu - Chi phí) * (1 - Thuế)`) từ dữ liệu Backend & Thêm "Kết quả Đợt Khuyến mãi" tại [ProfitLossPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/ProfitLossPage.tsx)
1. Mở [ProfitLossPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/ProfitLossPage.tsx):
   - **Thao tác 1 — Xóa bỏ toàn bộ giao diện "Đỏ lòm gớm"**:
     - **Tại dòng 219–225**: Đổi thuộc tính `tone="danger"` của thẻ `StatCard` `"GIÁ VỐN HÀNG BÁN (COGS)"` thành `tone="info"` (màu xanh lam dịu mắt).
     - **Tại dòng 263–296** (Khung phân tích chi nhánh chưa đạt điểm hòa vốn):
       - Xóa `border-2 border-red-300 dark:border-red-700/70 bg-red-50/40 dark:bg-red-950/20` ở dòng 264 -> Thay bằng `border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 border-l-4 border-l-slate-500`.
       - Xóa `bg-red-500/10 border-b border-red-200` ở dòng 265 -> Thay bằng `bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800`.
       - Xóa chấm `animate-pulse` và đổi toàn bộ chữ tiêu đề `text-red-900`, `text-red-700`, khung `border-red-200` bên trong (dòng 267–294) sang màu xám trung tính (`text-gray-900`, `text-gray-600`, `border-gray-200 bg-gray-50/50`).
     - **Tại dòng 356, 377, 383, 390, 405** (Trong bảng Báo cáo Lãi & Lỗ chi tiết):
       - Dòng 356: Xóa `bg-red-50/60 dark:bg-red-950/25` trên thẻ `<tr>` (giữ nền dòng trắng sạch sẽ).
       - Dòng 377 (Cột `Giá vốn COGS`) và Dòng 383 (Cột `Chi phí vận hành OPEX`): **Xóa bỏ class `text-red-600 dark:text-red-400`**! Thay bằng màu chữ tài chính trung tính `text-gray-700 dark:text-gray-300 font-medium`.
       - Dòng 405 (Hàng `Tổng cộng` ở đáy bảng): Đổi màu tổng COGS và tổng OPEX từ `text-red-600` sang `text-gray-900 dark:text-white`.

   - **Thao tác 2 — Áp dụng quy tắc Filter Chi nhánh (Admin có filter chọn chi nhánh, Quản lý CN chỉ xem được chính chi nhánh đó)**:
     - Import `scopedBranch` từ `../../utils/auth` và khai báo `const lockedBranch = scopedBranch();`.
     - Nếu `lockedBranch` khác `null` (Quản lý chi nhánh `CN05`):
       - Khóa cứng danh sách hiển thị chỉ gồm đúng chi nhánh `CN05 - Hàng Xanh` (`r.code === lockedBranch`).
       - Cả 4 thẻ KPI, Biểu đồ Doanh thu - Chi phí - Lợi nhuận, Bảng P&L và Bảng Kết quả Khuyến mãi đều chỉ hiển thị số liệu của **`CN05`**.
     - Nếu `lockedBranch === null` (Admin chuỗi `owner`):
       - Thêm một Dropdown **`Chọn Chi nhánh (`Tất cả 12 chi nhánh` | `CN01` | `CN02` | ... | `CN12`)`** bên cạnh bộ lọc Vùng miền để Admin có thể lọc xem biểu đồ và báo cáo của bất kỳ chi nhánh nào!

   - **Thao tác 3 — Hiển thị cấu trúc Cân bằng Thu Chi & Lợi nhuận sau thuế theo quy tắc `(Doanh thu - Chi phí) * (1 - Thuế)` (Số liệu do Backend tính toán và trả về)**:
     - Mở rộng dữ liệu `ProfitLossRow` (do Backend/Store trả về) để hiển thị đầy đủ các cột trên bảng báo cáo:
       1. `revenue`: Doanh thu thuần.
       2. `totalCost`: Tổng Chi phí (gồm `cogs` Giá vốn + `opex` Chi phí vận hành).
       3. `preTaxBalance`: Chênh lệch Thu - Chi trước thuế (`Doanh thu - Chi phí`).
       4. `taxRate` & `taxAmount`: Thuế suất và Tiền thuế TNDN.
       5. `afterTaxProfit`: Lợi nhuận ròng sau thuế.
       6. `breakEven`: Doanh thu điểm hòa vốn (kèm Tooltip thuyết minh khi rà chuột).
     - Đặt một **Thanh Thuyết Minh Quy Tắc Tài Chính** ngay phía trên bảng P&L ghi rõ nhãn quy tắc: **`Quy tắc cân bằng thu chi sau thuế (Backend xử lý): Lợi nhuận sau thuế = (Doanh thu - Chi phí) * (1 - Thuế)`** để giảng viên kiểm tra trực quan ngay trên UI.

   - **Thao tác 4 — Bổ sung Khu vực "Xem Kết Quả Của Đợt Khuyến Mãi (`Promotion Campaign Results`)"**:
     - Ngay bên dưới bảng P&L trong [ProfitLossPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/ProfitLossPage.tsx), xây dựng một Card báo cáo mới: **`🎯 Báo cáo Kết quả Tài chính các Đợt Khuyến mãi`**:
       - Kết nối với dữ liệu khuyến mãi (`milktyway_promotions_v1` / dữ liệu tổng hợp từ Backend) và lọc theo chi nhánh đang chọn (`selectedBranch`).
       - Hiển thị 4 thẻ tóm tắt nhanh: `Tổng doanh thu từ các đợt KM` · `Tổng chi phí giảm giá đã cấp` · `Lợi nhuận ròng sau thuế từ KM` · `Hiệu quả trung bình các đợt KM`.
       - Hiển thị bảng kết quả từng đợt khuyến mãi (`HAPPYHOUR20 - Giờ vàng giảm 20%`, `WELCOME10 - Chào bạn mới`, `BUY2GET1 - Mua 2 tặng 1`, `VIPFREEUP - Miễn phí nâng size`, `SINHNHAT50K`...):
         - Cột 1: **Mã & Tên đợt khuyến mãi** + Quy định (`"100 người đến trước"`...).
         - Cột 2: **Phạm vi Chi nhánh & Trạng thái**.
         - Cột 3: **Lượt áp dụng / Mục tiêu (`SỐ LƯỢNG`)**.
         - Cột 4: **Doanh thu thu về từ đơn có KM (`campaignRevenue`)**.
         - Cột 5: **Tổng chi phí chiết khấu + Giá vốn (`campaignCost`)**.
         - Cột 6: **Kết quả Lợi nhuận sau thuế của đợt KM (`afterTaxCampaignProfit` — nhận từ Backend)**.
         - Cột 7: **Đánh giá kết quả (`effectivenessBadge`)** (`Thành công vượt kỳ vọng` / `Đạt mục tiêu thu hút khách` / `Cần điều chỉnh ngân sách`).

2. Mở [SalesReportPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/SalesReportPage.tsx) (dòng 96–155):
   - Bổ sung gọi `const lockedBranch = scopedBranch();`. Nếu là Quản lý chi nhánh (`CN05`) thì khóa cứng bộ lọc chi nhánh về `CN05` để cả 3 trang báo cáo (`/reports/sales-report`, `/reports/inventory-report`, `/reports/profit-loss`) đều tuân thủ tuyệt đối nguyên tắc của giảng viên: **Admin có filter chọn chi nhánh, Quản lý chi nhánh chỉ xem được của chính chi nhánh đó**.

---

## PHẦN C: QUY TRÌNH KIỂM THỬ NGHIỆM THU 100% ĐIỂM TRƯỚC KHI BẢO VỆ

Sau khi Người 1 và Người 2 hoàn thành các bước trên và gộp nhánh (`git merge`), hai bạn cùng chạy qua **Bảng Kiểm Tra Nghiệm Thu 21 Điểm** dưới đây:

### Checklist nghiệm thu của Người 1
- [ ] **1. POS — Tag Hot Sale**: Trên menu `/sales/pos` có gắn nhãn `🔥 HOT SALE` trực tiếp lên thẻ món và có tab lọc `🔥 Hot Sale`.
- [ ] **2. POS — Gộp chung Recycle View & Cố định nút chức năng**: Khối Tùy chỉnh món + Danh sách giỏ hàng + Hội viên nằm chung trong 1 khung cuộn duy nhất ở cột phải; cụm nút `Hoàn tất bán hàng [Ctrl+Enter]`, `Giữ đơn [Alt+H]`, `Xóa giỏ` ghim cố định ở đáy khung phải, không bao giờ phải cuộn trang.
- [ ] **3. POS — Chế độ ẩn Sidebar**: Bấm phím `` ` `` / `~` hoặc `Ctrl+B` hoặc nút trên Header ẩn hoàn toàn Sidebar trái 256px trên Desktop và chỉ hiện 4 lối tắt tác nghiệp của người bán hàng.
- [ ] **4. POS — 5 Phím tắt cốt lõi (Gọn, không lạm dụng, không dùng F1..F12)**: Hoạt động mượt đúng 5 phím tắt tiết kiệm nhiều thao tác nhất: `/` hoặc `Ctrl+K` (tìm món), `` ` `` / `~` (ẩn Sidebar), `Alt+D` (đưa đủ tiền mặt), `Alt+H` (tạm giữ đơn), và `Ctrl+Enter` (hoàn tất bán hàng).
- [ ] **5. Ca làm việc — Giải trình Người mở ≠ Người đóng**: Thu ngân mở ca được tại chi nhánh mình; khi người đóng ca khác người mở ca thì bật cảnh báo cam và bắt buộc chọn lý do bàn giao giữa ca.
- [ ] **6. Ca làm việc — Rule Kiểm kê & Chốt ca xác thực 2 bên**: Có bảng Rule kiểm kê (`≤2%` Xanh, `2–5%` Vàng - bắt giải trình, `>5%` Đỏ - bắt đếm lại); chốt ca bắt buộc ký xác thực đủ 2 bên (Bên 1 Thu ngân bàn giao + Bên 2 Quản lý CN / Ca trưởng nhận ca).
- [ ] **7. Pha chế (`/sales/preparation`)**: Bố cục đã thu gọn (gom các ly trùng nhau trong đơn, thanh lọc 1 dòng) và có khung **Công thức chế biến chi tiết** cho từng món.
- [ ] **8. Đổi trả (`/sales/returns`)**: Có thanh search đơn cần xử lý bằng mã đơn hàng `DH-...`; chọn được đổi/hoàn 1 món hoặc toàn bộ đơn; tiền hoàn hiển thị tự động từ dữ liệu Backend (`readOnly`, khóa gõ tay); có tùy chọn **Ghi lại thay đổi vào đơn gốc (Ưu tiên)** và **Ghi lại mới hoàn toàn**.
- [ ] **9. Khuyến mãi (`/marketing/promotions` & `/marketing/branch-promotions`)**: Bảng danh sách khuyến mãi chiếm >75% diện tích; hiển thị ràng buộc giữa các khuyến mãi; hiển thị `TỔNG / SỐ LƯỢNG / TIỀN` kèm dự báo giới hạn nào chạm trước; có quy định tự nhiên `"100 người đến trước"`; trang khuyến mãi chi nhánh khóa quyền chỉnh sửa chỉ cho Admin (`owner`).
- [ ] **10. Khách hàng (`/customer`)**: Chọn được chi nhánh gần tôi, có lựa chọn rõ ràng *"Bạn có muốn đăng nhập & lưu thông tin hay không"*, và tra cứu đơn hàng/tích điểm tức thì **không cần OTP**.

### Checklist nghiệm thu của Người 2
- [ ] **11. Kho sản phẩm (`/inventory/products`)**: Chi nhánh nào nhìn thấy sản phẩm của chi nhánh đó + Kiểm tra tất cả các món chứa 1 nguyên liệu được tìm kiếm + Có nút Sắp xếp nói rõ trường (`product.name` A->Z/Z->A, `product.code` A->Z/Z->A, `product.createdAt` Mới nhất/Cũ nhất).
- [ ] **12. Dashboard — Đơn vị thời gian & Lượng khách**: Có bộ chọn Đơn vị thời gian (`Giờ / Ngày / Tuần / Tháng / Quý`) và biểu đồ/bảng **Lượng khách theo từng chi nhánh & thời gian**.
- [ ] **13. Dashboard — Tooltip/Pop-up & Thông tin từng chi nhánh**: Rà chuột hiện tên/thông tin đầy đủ, bấm mở Pop-up xem thuyết minh chỉ số và bảng chỉ số của từng chi nhánh.
- [ ] **14. Dashboard — Ngưỡng nguyên liệu dưới ngưỡng**: Cho xem thuyết minh cách tính ngưỡng (`ROP`) và có nút **Khóa / Bỏ qua nguyên liệu không còn xài nữa** để lọc bỏ cảnh báo thừa (kèm danh sách khôi phục).
- [ ] **15. Công thức (`/production/recipes`)**: Sắp xếp nói rõ trường (`recipe.priority` Cao->Thấp/Thấp->Cao, `product.name` A->Z/Z->A, `recipe.effectiveDate` Mới nhất/Cũ nhất); **kiểm tra & liệt kê tất cả các món có chứa 1 nguyên liệu được tìm kiếm** (ví dụ tìm tất cả món có Trà xanh); có công cụ **Thay thế nhanh nguyên liệu & Phân tích ảnh hưởng X, Y, Z**.
- [ ] **16. Lô / Mẻ sản xuất (`/production/batches`)**: Có chức năng phân phối nguyên liệu từ mẻ về các chi nhánh và có **Sơ đồ truy vết 2 chiều** (`NCC/Lô F0 -> Mẻ -> Lô F1 -> Chi nhánh -> Món`).
- [ ] **17. Kế hoạch sản xuất (`/production/planning` & `/distribution/planning`)**: Có **Kế hoạch cố định ở Kho Tổng**; báo thiếu thì thêm **Lượng thêm tạm thời có Thời lượng hiệu lực** mà không làm đổi kế hoạch tổng; có hộp trả lời Conclusion của giảng viên; có nút **Biến tạm thời thành cố định** và bảng **Lịch sử phân phối** (Thanh Hương); hiển thị tỷ lệ định mức và cây phân cấp `F0 -> F1 -> Món` vs `F0 -> Món`.
- [ ] **18. Đối soát ca (`/stores/shift-reconciliation`)**: Chọn chi nhánh nào thì giới hạn dropdown nhân viên thuộc đúng chi nhánh đó; Quản lý chi nhánh chỉ thấy đối soát ở chi nhánh mình (`CN05`); Quản lý tổng chỉ đối soát báo cáo & có chức năng phân công nhân viên thuộc chi nhánh nào.
- [ ] **19. Nhà cung cấp (`/suppliers`)**: Có cột **Nhà cung cấp từ bao lâu** (`partnerSince` + số năm/tháng); có Sort nói rõ trường (`supplier.name` A->Z/Z->A và `supplier.partnerSince` Mới nhất/Cũ nhất); biểu đồ và bảng có filter chi nhánh cho Admin và khóa theo chi nhánh cho Quản lý CN.
- [ ] **20. Báo cáo tồn kho (`/reports/inventory-report`)**: Đã xóa sạch *"cái bảng màu vàng quá GỚM!"*, thay bằng bảng trung tính hiện đại; filter chi nhánh chuẩn cho Admin vs Quản lý CN.
- [ ] **21. Báo cáo Lãi & Lỗ (`/reports/profit-loss`)**: Đã xóa sạch giao diện *"đỏ lòm gớm"*; hiển thị các cột cân bằng thu chi sau thuế theo quy tắc `(Doanh thu - Chi phí) * (1 - Thuế)` từ dữ liệu Backend; có bảng xem **Kết quả của từng đợt khuyến mãi**; filter chi nhánh chuẩn cho Admin vs Quản lý CN.
