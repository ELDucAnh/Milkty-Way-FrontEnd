# ĐẶC TẢ KỸ THUẬT & PHÂN TÍCH CHUYÊN SÂU FEEDBACK GIẢNG VIÊN (MILKTYWAY ERP / POS)

> **Tài liệu này được xây dựng sau khi rà soát toàn bộ mã nguồn dự án `HaiLyDa-FrontEnd` (`src/`).**
> Mục tiêu của tài liệu:
> 1. **Giải mã & suy luận sâu (Deep Reasoning)** từng gạch đầu dòng và từng câu hỏi phản biện của giảng viên dựa trên đúng hiện trạng code thực tế.
> 2. **Chỉ rõ cần sửa cái gì, ở đâu (Exact File & Line-level Changes)**: đường dẫn file, số dòng, interface TypeScript, state React, khóa `localStorage`, phân quyền `auth.ts` và CSS/Tailwind.
> 3. **Trả lời trọn vẹn các bài toán nghiệp vụ hóc búa** mà giảng viên đặt ra (Chốt ca xác thực 2 bên, Thay thế nguyên liệu A trong món X có ảnh hưởng Y/Z không, Kế hoạch cố định vs Lượng thêm tạm thời của Thanh Hương, Phân cấp nguyên liệu `F0 -> F1 -> Món`, Điểm hòa vốn & Lợi nhuận sau thuế, Giới hạn khuyến mãi nào chạm trước).
> 4. **Suy luận mở rộng (Extended Improvements)**: Chỉ ra các lỗi ngầm (bugs), đứt gãy dữ liệu liên trang và mâu thuẫn phân quyền hiện có trong project cần khắc phục đồng bộ để khi bảo vệ đồ án không bị bắt lỗi chéo.

---

## PHẦN 0: TỔNG QUAN KIẾN TRÚC HIỆN TẠI & 5 MÂU THUẪN CỐT LÕI TOÀN HỆ THỐNG

Trước khi đi vào từng mục feedback, cần nắm rõ **5 điểm đứt gãy kiến trúc (Architectural Gaps)** đang tồn tại trong mã nguồn hiện tại. Đây chính là nguyên nhân gốc rễ khiến giảng viên nhận thấy các trang "chưa ăn khớp nhau":

### 0.1. Tồn tại 2 danh mục sản phẩm (Split Product Catalogs) không liên thông
1. **Danh mục của POS**: [products.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/sales/products.ts#L1-L162)
   - Chứa `12` món tĩnh (`id: 1..12` kiểu `number`, `sku: "TS01".."MM02"`, 1 mức `price` duy nhất, `stock: number` tĩnh, không có thông tin chi nhánh, không gắn công thức `RecipeVersion`).
2. **Danh mục của Kho / Sản xuất / Công thức**: [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L604-L660) (`INITIAL_PRODUCTS`)
   - Lưu trong `localStorage["milktyway_demo_state_v1"].products` (`id: "hd-001".."hd-004", "tp-001"`, mã `"HD-001"`, có `variants` size `M/L`, có `lockedStoreIds: string[]` khóa theo chi nhánh, và liên kết trực tiếp với `INITIAL_RECIPES` qua `productId`).
3. **Hệ quả**:
   - Khi thu ngân bấm thanh toán ở POS ([PosCart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/sales/PosCart.tsx#L121-L135) gọi `createPosOrder()` trong [sales-orders-store.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/sales-orders-store.ts#L579-L589)), hệ thống chỉ lưu `name`, `size`, `qty`, `unitPrice`, `ice`, `sugar`, `toppings` vào `SalesOrderItem` mà **làm rơi mất `productId` và `sku`**.
   - Do đó, màn hình **Hàng đợi pha chế** ([PreparationQueuePage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PreparationQueuePage.tsx#L1-L407)) không thể tra cứu ngược sang `RecipeVersion` để hiển thị **công thức chế biến** cho pha chế như giảng viên yêu cầu.

### 0.2. Mâu thuẫn phân quyền (`RBAC`) giữa `auth.ts` và nghiệp vụ thực tế tại Chi nhánh vs Chuỗi
Trong [auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts#L60-L157):
- Hệ thống có 4 role: `owner` (Quản trị chuỗi - toàn chuỗi), `manager` (Quản lý chi nhánh - gắn với `CN05`), `warehouse` (Thủ kho - toàn chuỗi), `cashier` (Thu ngân - gắn với `CN01`).
- **Nghịch lý 1 (Mở/Đóng ca)**: Tại [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx#L495), form **"Mở ca mới"** đang bị chặn bằng điều kiện `!isCashier()`, nghĩa là Thu ngân không được mở ca mà chỉ Quản lý/Admin mở ca. Nhưng ở hàm `requestClose()` ([ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx#L249-L262)), nếu là `isCashier()` thì bấm **"Đóng ca"** lại chuyển thẳng trạng thái sang `status: "closed"` (1 bước, tự đóng một mình), còn Quản lý bấm thì mới qua trạng thái `closing-requested`! Điều này ngược hoàn toàn với nhận xét của giảng viên: *"Tại sao người mở ca khác người đóng ca? Chốt ca = xác thực 2 bên. Mở đóng ca chỉ nên quy định trong phạm vi CN, do QN tổng không có mặt trực tiếp không thể quản lí được"*.
- **Nghịch lý 2 (Đối soát ca)**: Tại [auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts#L60-L77), trang `/stores/shift-reconciliation` chỉ nằm trong `warehousePages` và `owner`, **không có trong `managerPages`**, trong khi bên trong [ShiftReconciliationPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/ShiftReconciliationPage.tsx#L910) nút **"Phê duyệt"** lại kiểm tra quyền `can("stock.approveAdjustment")` (vốn chỉ cấp cho `manager` và `owner`). Tức là Quản lý chi nhánh có quyền duyệt nhưng lại không vào được trang đó!

### 0.3. Không đồng nhất mã và danh sách Chi nhánh giữa các module
- `INITIAL_STORES` trong [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L451-L489) chỉ có 3 chi nhánh: `CN01`, `CN05`, `CN08`.
- `BRANCH_DIRECTORY` trong [BranchesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/branches/BranchesPage.tsx#L24-L169) có 6 chi nhánh: `CN01`, `CN02`, `CN03`, `CN05`, `CN08`, `CN10`.
- `PROFIT_LOSS_ROWS` trong [ProfitLossPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/ProfitLossPage.tsx#L43-L195) có 12 chi nhánh: `CN01..CN12`.
- **Giải pháp chuẩn hóa**: Gom toàn bộ danh mục chi nhánh về một nguồn duy nhất (`MASTER_BRANCHES` trong `src/data/branches.ts` hoặc mở rộng `INITIAL_STORES` trong `business-demo.ts` kèm tọa độ `lat`, `lng`, `district`) để bộ lọc chi nhánh ở mọi trang hoạt động đồng nhất.

### 0.4. Dữ liệu hạn sử dụng Lô hàng (`IngredientLot`) bị quá hạn so với ngày hệ thống
- Trong [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L540-L602), các lô `INITIAL_LOTS` và `INITIAL_BATCHES` có `expiryDate` rơi vào khoảng `2026-11-05` đến `2026-11-12`. Khi chạy ứng dụng sau ngày `2026-11-12`, hàm `isExpired()` đánh dấu toàn bộ lô thành phẩm ở Kho Tổng là **"Hết hạn"**, làm cho `readyBatches` trong [DistributionPlanningPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/distribution/DistributionPlanningPage.tsx#L194-L202) bị rỗng, không thể phê duyệt kế hoạch phân phối nếu không tạo mẻ mới.
- **Giải pháp**: Chuyển ngày hết hạn trong dữ liệu seed sang tính động tương đối so với `new Date()` (ví dụ `addDays(today, +14)` cho lô khả dụng, `addDays(today, +2)` cho lô cận hạn, `addDays(today, -2)` cho lô hết hạn mẫu).

### 0.5. Sai lệch công thức tính giảm giá Thành viên giữa POS UI và Store lưu đơn
- Ở [PosCart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/sales/PosCart.tsx#L53-L66), giảm giá thành viên đã được cập nhật thành: Thành viên mới giảm `2.000 ₫` (`flatDiscount = 2000`), Bạc giảm `5.000 ₫` (`flatDiscount = 5000`), Vàng `5%`, VIP `10%`.
- Tuy nhiên, hàm `createPosOrder()` trong [sales-orders-store.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/sales-orders-store.ts#L574-L578) chỉ nhận `discountRate` (%) và tính `Math.round(subtotal * (params.discountRate / 100))`, bỏ quên `flatDiscount` (`2.000 ₫` / `5.000 ₫`). Do đó khách Thành viên mới hoặc Hạng Bạc trên màn hình POS thấy được giảm `2.000 ₫` / `5.000 ₫`, nhưng khi lưu thành `SalesOrder` và `Invoice` thì tiền giảm lại bằng `0 ₫`!

---

## PHẦN 1: PHÂN HỆ NHÂN VIÊN (`# Nhân viên`)

---

### 1.1. Kho hàng / Sản phẩm (`/inventory/products`)

#### 📌 Nguyên văn Feedback Giảng viên
> **kho hang/ sản phẩm:**
> - danh sách sản phẩm thấy được sản phẩm theo chi nhánh (chi nhánh nào thì nhìn thấy được sản phẩm của nó). Thêm nút sắp xếp

#### 🧠 Suy luận & Giải thích chi tiết từ Note
1. **Vì sao giảng viên góp ý mục này?**
   - Hiện tại trong [ProductsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/inventory/ProductsPage.tsx#L73-L82), danh sách `filtered` chỉ lọc theo từ khóa tìm kiếm (`q`), nhóm món (`categoryFilter`: `"Tất cả" | "Trà sữa" | "Trà trái cây" | "Topping"`) và trạng thái toàn chuỗi (`statusFilter`: `"all" | "active" | "paused"`).
   - Mặc dù mỗi `ProductItem` trong [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L52-L64) đã có trường `lockedStoreIds: string[]` (danh sách các chi nhánh bị khóa bán món đó), nhưng trang `/inventory/products` **không hề gọi `scopedBranch()`** từ [auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts#L168-L171) và **không có bộ lọc Chi nhánh** trên thanh công cụ.
   - Hậu quả: Nhân viên/Quản lý của `CN01` hay `CN05` khi vào xem danh sách sản phẩm đều nhìn thấy toàn bộ thực đơn tổng mà không biết món nào đang được bán tại chi nhánh mình, món nào đang bị khóa tại chi nhánh mình, và tồn kho nguyên liệu tại quầy chi nhánh mình hiện pha được bao nhiêu ly.
   - Ngoài ra, bảng sản phẩm ([ProductsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/inventory/ProductsPage.tsx#L281-L343)) hiện render theo đúng thứ tự mảng gốc, hoàn toàn **không có nút Sắp xếp (Sort)** trên thanh lọc hay trên tiêu đề cột (`<thead>`).

2. **Mở rộng suy luận nghiệp vụ**:
   - Đối với **Nhân viên thu ngân (`cashier` - `CN01`)** hoặc **Quản lý chi nhánh (`manager` - `CN05`)**: Hệ thống phải tự động khóa phạm vi hiển thị về đúng chi nhánh của họ (`effectiveBranchId = scopedBranch() || selectedBranchId`). Trên mỗi dòng sản phẩm phải hiển thị rõ:
     - **Trạng thái tại chi nhánh (`Branch Availability`)**: `Đang mở bán tại CN05` vs `Tạm khóa tại CN05` (dựa vào `!product.lockedStoreIds.includes(effectiveBranchId)` và `product.status === "Đang bán"`).
     - **Khả năng cung ứng tại chi nhánh (`Branch Availability`)**: Hiển thị trạng thái mở bán hoặc cảnh báo thiếu nguyên liệu tại chi nhánh đó (lấy từ trạng thái sẵn có của dữ liệu chi nhánh).
   - Đối với **Quản trị chuỗi (`owner`) / Thủ kho (`warehouse`)**: Có dropdown chọn `"Tất cả chi nhánh"` hoặc chọn từng chi nhánh cụ thể (`CN01`, `CN05`, `CN08`...) kèm toggle `"Chỉ hiện sản phẩm đang mở bán tại chi nhánh đang chọn"`.
   - **Quy định rõ các trường dữ liệu (Fields) dùng để Sắp xếp (Sort)**:
     - **Sắp xếp theo Tên (`A → Z` / `Z → A`)**: Dựa trên trường **`product.name`** (so sánh thứ tự bảng chữ cái tiếng Việt).
     - **Sắp xếp theo Mã sản phẩm (`A → Z` / `Z → A`)**: Dựa trên trường **`product.code`** (ví dụ `HD-001` → `TP-001`).
     - **Sắp xếp theo Thời gian (`Mới nhất` / `Cũ nhất`)**: Dựa trên trường **`product.createdAt`** (hoặc **`product.updatedAt`**, kiểu ngày `YYYY-MM-DD`).

#### 🛠️ Cần thay đổi cái gì & ở đâu?

1. **File [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L52-L64)**:
   - Mở rộng interface `ProductItem`:
     ```ts
     export interface ProductItem {
       id: string;
       code: string;             // Trường dùng để sort Mã SP (A -> Z / Z -> A)
       name: string;             // Trường dùng để sort Tên SP (A -> Z / Z -> A)
       category: "Trà sữa" | "Trà trái cây" | "Topping" | "Cà phê" | "Đá xay" | "Macchiato" | "Sữa tươi" | "Món mới";
       status: "Đang bán" | "Tạm ngưng";
       channel: string;
       lockedStoreIds: string[]; // CN nằm trong mảng này sẽ không bán món này
       variants: ProductVariant[];
       isHotSale?: boolean;      // Đồng bộ tag Hot Sale với POS
       createdAt: string;        // Trường dùng để sort Mới nhất / Cũ nhất (YYYY-MM-DD)
       updatedAt?: string;       // Trường thời gian cập nhật gần nhất
     }
     ```
2. **File [ProductsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/inventory/ProductsPage.tsx)**:
   - **Tại dòng 1–8**: Import thêm `scopedBranch, getSession` từ `../../utils/auth`.
   - **Tại dòng 28–42 (State)**:
     - Thêm state lọc chi nhánh:
       ```ts
       const lockedBranch = scopedBranch(); // "CN01" với cashier, "CN05" với manager, null với owner/warehouse
       const [branchFilter, setBranchFilter] = useState<string>(lockedBranch || "ALL");
       const [branchVisibilityMode, setBranchVisibilityMode] = useState<"available_only" | "all_with_badge">("available_only");
       ```
     - Thêm state sắp xếp chỉ rõ trường dữ liệu (`name`, `code`, `createdAt`):
       ```ts
       type ProductSortOption = "name_asc" | "name_desc" | "code_asc" | "code_desc" | "createdAt_desc" | "createdAt_asc";
       const [sortOption, setSortOption] = useState<ProductSortOption>("createdAt_desc");
       ```
     - Thêm bộ lọc kiểm tra tất cả sản phẩm có chứa 1 nguyên liệu (`ingredientFilterId`): Đối chiếu `product.id` với danh sách công thức `state.recipes` (`recipe.productId === product.id` và kiểm tra mảng `recipe.lines` có chứa `ingredientFilterId`) để xem nhanh tất cả món có chứa nguyên liệu đó.
   - **Tại dòng 73–82 (`filtered` & `sorted`)**:
     - Khi `branchFilter !== "ALL"`:
       - Nếu `branchVisibilityMode === "available_only"` (mặc định cho nhân viên chi nhánh): Lọc bỏ các món có `product.lockedStoreIds.includes(branchFilter)` hoặc `product.status === "Tạm ngưng"` để nhân viên **chỉ nhìn thấy sản phẩm của chi nhánh mình**.
       - Có nút gạt nhanh `"Hiện cả món đang tạm khóa tại CN (X)"` để khi cần tra cứu vẫn bật lên xem được.
     - Áp dụng `.sort((a, b) => ...)` dựa trực tiếp trên trường `a.name` (`A → Z` / `Z → A`), `a.code` (`A → Z` / `Z → A`), hoặc `a.createdAt` (`Mới nhất` / `Cũ nhất`).
   - **Tại dòng 241–279 (Filter Bar UI)**:
     - Thêm dropdown **Chi nhánh** (nếu `lockedBranch` khác `null` thì `disabled` và hiển thị rõ badge `"Chi nhánh của bạn: CN01 - Nguyễn Huệ"`).
     - Thêm **Dropdown Sắp xếp** ghi rõ trường sắp xếp:
       - `Tên sản phẩm: A → Z (trường name)`
       - `Tên sản phẩm: Z → A (trường name)`
       - `Mã sản phẩm: A → Z (trường code)`
       - `Thời gian tạo: Mới nhất (trường createdAt)`
       - `Thời gian tạo: Cũ nhất (trường createdAt)`
   - **Tại dòng 282–292 (`<thead>` bảng danh sách sản phẩm)**:
     - Biến các tiêu đề cột `Mã SP (code)`, `Tên sản phẩm (name)`, `Ngày cập nhật (createdAt)` thành nút bấm có icon mũi tên `↕ / ↑ / ↓` để bấm sắp xếp trực tiếp trên cột.

---

### 1.2. Bán hàng / Điểm bán hàng (POS - `/sales/pos` & Đóng ca `/sales/shifts`)

#### 📌 Nguyên văn Feedback Giảng viên
> **bán hang/ điểm bán hang (POS)**
> - Thêm "hot sale" tag ở thẳng cái menu 
> - các tùy chỉnh và chốt đơn sản phẩm, các nút chức năng người bán cần cố định. Trong gộp chung recycle view
> - có thêm chế độ ẩn sidebar để bộc bớt (ẩn) các chức năng ko cần thiết cho người bán hàn
> - tạo các phím tắt nhấn nhanh các chức năng
> - tùy chỉnh thêm đóng ca, kiểm kê. Có thêm rule kiểm kê. Tại sao hiện tại người mở ca khác với người đóng ca. Chốt ca = xác thực 2 bên

---

#### 🧠 Suy luận & Giải thích chi tiết từng ý trong mục POS

##### Ý 1: Thêm `"Hot Sale"` tag ở thẳng cái menu + Bộ lọc món Hot Sale
- **Hiện trạng ([PosTerminalPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PosTerminalPage.tsx#L397-L441) & [products.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/sales/products.ts#L1-L162))**:
  - Trên mỗi card sản phẩm trong lưới menu hiện chỉ có badge tồn kho ở góc phải trên (`Còn 42`, dòng 409–413) và badge số lượng đang có trong giỏ ở góc trái trên (`inCartQty`, dòng 414–418). Hoàn toàn **không có nhãn `"HOT SALE"` / `"Bán chạy"`**.
  - Thu ngân khi khách hỏi *"Quán mình món nào bán chạy nhất em?"* hoặc trong giờ cao điểm cần bấm nhanh nhóm món chủ lực thì phải tự nhớ hoặc gõ tìm kiếm.
- **Giải pháp**:
  - Bổ sung thuộc tính `isHotSale?: boolean`, `hotRank?: number`, `soldToday?: number` vào `PosProduct` ([products.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/sales/products.ts)).
  - Hiển thị trực tiếp pill badge **`🔥 HOT SALE`** nổi bật ngay trên ảnh card sản phẩm trong menu (góc trái dưới của khung ảnh hoặc cạnh tên món) và thêm tab danh mục **`🔥 Bán chạy (Hot Sale)`** đứng đầu thanh category pills ([PosTerminalPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PosTerminalPage.tsx#L381-L394)).

##### Ý 2: Các tùy chỉnh và chốt đơn sản phẩm, các nút chức năng người bán cần cố định, gộp chung vào 1 Recycle View (Unified Scrollable Container)
- **Hiện trạng lỗi UX nghiêm trọng ([PosTerminalPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PosTerminalPage.tsx#L338-L553) & [PosCart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/sales/PosCart.tsx#L140-L433))**:
  1. Panel **"Tùy chọn món (Size / Đá / Đường / Topping)"** ([PosTerminalPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PosTerminalPage.tsx#L444-L552)) hiện đang nằm ở cột bên trái (`lg:col-span-7`) **bên dưới toàn bộ lưới 12 card sản phẩm**! Khi thu ngân chọn 1 món ở hàng đầu tiên, họ phải cuộn chuột xuống tận đáy trang bên trái mới chỉnh được Size/Đá/Đường/Topping.
  2. Cột bên phải (`lg:col-span-5` - [PosCart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/sales/PosCart.tsx#L140-L433)) dựng **3 thẻ `.card` rời nhau xếp chồng dọc**:
     - Card 1: Giỏ hàng (`max-h-[380px] overflow-y-auto`)
     - Card 2: Thông tin đơn hàng & Hội viên (Loại đơn, SĐT, Hạng thẻ, Voucher, Ghi chú)
     - Card 3: Thanh toán & Nút **"Hoàn tất bán hàng"** (`#pos-complete-btn`)
     - Tổng chiều cao của 3 card này lên tới **~1.150px**, vượt xa chiều cao màn hình laptop chuẩn (`768px - 900px`). Dù có class `sticky top-20`, do nội dung bên trong dài hơn viewport nên nút **"Hoàn tất bán hàng"**, **"Tạm giữ đơn"**, **"Xóa giỏ"** luôn bị đẩy tụt xuống dưới đáy trang, buộc thu ngân phải cuộn cả trang web lên xuống liên tục!
- **Giải pháp chuẩn POS chuyên nghiệp (Gộp chung Recycle View + Sticky Action Footer)**:
  - Chuyển toàn bộ giao diện `/sales/pos` sang bố cục **cố định theo chiều cao khung nhìn (`h-[calc(100vh-4.5rem)] overflow-hidden`)** chia làm 2 cột độc lập:
    - **Cột trái (Menu sản phẩm - `lg:col-span-7 flex flex-col h-full`)**:
      - **Header cố định (Fixed Top)**: Thanh tìm kiếm + Category pills (có tab `🔥 Hot Sale`) + Phím tắt nhanh.
      - **Recycle View Menu (`flex-1 overflow-y-auto pr-1`)**: Chỉ phần lưới thẻ món ăn cuộn độc lập.
    - **Cột phải (Unified Order Panel - `lg:col-span-5 flex flex-col h-full card overflow-hidden`)**: Gộp toàn bộ **Tùy chỉnh món đang chọn + Danh sách món trong giỏ + Thông tin khách/khuyến mãi** vào **1 khung cuộn duy nhất (Single Unified Recycle View)** ở giữa, còn **Header giỏ hàng** và **Footer Chốt đơn / Thanh toán** được **ghim cố định tuyệt đối (`shrink-0 sticky bottom-0`)**:
      1. **Pinned Top Header (`shrink-0`)**: Tiêu đề Giỏ hàng, số lượng ly, chọn nhanh `Tại quầy / Mang đi`, nút `Đơn giữ (N)`, `Xóa giỏ`.
      2. **Unified Recycle View (`flex-1 overflow-y-auto divide-y`)**:
         - **Khối A - Tùy chỉnh nhanh món đang chọn (`Inline Item Customizer`)**: Ngay khi bấm vào 1 món trên menu hoặc bấm vào 1 dòng trong giỏ, khối tùy chỉnh `Size (M/L) · Đá (100/70/50/0%) · Đường (100/70/50/30/0%) · Topping` hiển thị gọn ngay đầu Recycle View (hoặc mở rộng inline ngay tại dòng món đó trong giỏ) để chỉnh tức thì mà không cần rời mắt khỏi giỏ hàng.
         - **Khối B - Danh sách món trong giỏ (`Cart Items List`)**: Hiển thị từng món kèm tag tùy chỉnh (`Size M · 70% đường · 100% đá · +Trân châu đen`), nút `-/+`, nút sửa nhanh tùy chỉnh, nút xóa.
         - **Khối C - Hội viên & Voucher (`Compact Customer & Promo Accordion`)**: Tra cứu SĐT hội viên, chọn Voucher, ghi chú đơn.
      3. **Pinned Bottom Checkout & Action Dock (`shrink-0 border-t bg-white dark:bg-gray-900 p-3.5 shadow-lg`)**:
         - Luôn hiển thị cố định ở đáy khung phải, **không bao giờ bị cuộn khuất**:
           - Chọn phương thức thanh toán (`Tiền mặt | Chuyển khoản QR | Thẻ`) + mệnh giá tiền mặt nhanh (`Đưa đủ`, `50k`, `100k`, `200k`, `500k`) + Tiền thối.
           - Dòng tổng kết: `Tạm tính` · `Giảm giá` · `TỔNG CỘNG (cỡ chữ lớn)`.
           - Cụm nút chức năng người bán cố định: **`[Alt+H] Tạm giữ`** · **`[Alt+X] Hủy giỏ`** · **`[Ctrl+Enter] HOÀN TẤT BÁN HÀNG & IN PHIẾU`**.

##### Ý 3: Chế độ ẩn Sidebar để bộc bớt (ẩn) các chức năng không cần thiết cho người bán hàng
- **Hiện trạng ([MainLayout.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/layouts/MainLayout.tsx#L12-L42), [Sidebar.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/shared/Sidebar.tsx#L92-L120), [pos-template.css](file:///d:/OOAD/HaiLyDa-FrontEnd/src/assets/css/pos-template.css#L7-L110))**:
  - Trên màn hình desktop (`>= 1024px`), CSS trong `pos-template.css` (dòng 94–110) ép cứng `.sidebar { transform: translateX(0); width: 16rem }` và `.main-wrapper { margin-left: 16rem }`.
  - Nút hamburger trên `Header.tsx` (dòng 104–112) có class `lg:hidden`, tức là **trên máy tính thu ngân không có bất kỳ cách nào để thu gọn hoặc ẩn Sidebar 256px đi**!
  - Hơn nữa, Sidebar luôn hiện hàng loạt nhóm menu quản trị khiến không gian ngang của màn hình POS bị hẹp mất `256px`.
- **Giải pháp**:
  - Thêm chế độ **`Focus Mode / Ẩn Sidebar cho Thu ngân (`sidebarMode: "expanded" | "collapsed" | "hidden"`)`** lưu trong `localStorage["milktyway_sidebar_mode_v1"]`:
    1. **Nút bấm Toggle Sidebar trên Header (hiển thị cả trên Desktop `lg:inline-flex`)** và nút **`Chế độ Toàn màn hình POS (Ẩn menu trái) [Ctrl+B / ~]`** ngay trên thanh công cụ của `PosTerminalPage.tsx`.
    2. Khi bật **Chế độ Tập trung Bán hàng (POS Focus Mode)**:
       - Ẩn hoàn toàn Sidebar bên trái (`margin-left: 0`), nhường trọn `100%` chiều ngang màn hình cho Menu món và Giỏ hàng.
       - Trên thanh đỉnh của POS chỉ hiện 4 lối tắt tác nghiệp thiết yếu của người bán hàng: **`Bán hàng (POS)`** · **`Pha chế (KDS)`** · **`Đổi trả / Khiếu nại`** · **`Ca làm việc & Kiểm kê`**, ẩn toàn bộ các menu rườm rà khác.

##### Ý 4: Tạo các phím tắt nhấn nhanh các chức năng (Tinh gọn 5 phím tắt cốt lõi — Chỉ dùng cho các thao tác nhiều bước, không lạm dụng tràn lan, không dùng `F1..F12`)
- **Hiện trạng**: Cả `PosTerminalPage.tsx` và `PosCart.tsx` đều không có bất kỳ `window.addEventListener("keydown", ...)` nào.
- **Giải pháp**: Thay vì gắn phím tắt lên mọi nút gây rối mắt, chỉ trang bị **đúng 5 phím tắt thiết yếu nhất** giúp thu ngân rút gọn các thao tác lặp đi lặp lại tốn nhiều bước chuột:

| Phím tắt | Chức năng tại Điểm bán hàng (POS) | Lý do cần phím tắt này |
|---|---|---|
| `/` (hoặc `Ctrl + K`) | Đưa con trỏ thẳng vào ô Tìm kiếm sản phẩm & bôi đen chữ cũ | Thu ngân không cần rê chuột lên đầu trang và xóa từ khóa cũ |
| `` ` `` hoặc `~` (hoặc `Ctrl + B`) | Ẩn / Hiện nhanh Sidebar trái (Chế độ tập trung bán hàng) | Mở rộng toàn màn hình POS ngay lập tức bằng 1 phím |
| `Alt + D` | Điền nhanh khách đưa **Đúng số tiền cần thanh toán (`Đưa đủ`)** | Bỏ qua bước gõ tay 6–7 chữ số tiền mặt khi khách đưa vừa đủ |
| `Alt + H` | Tạm giữ đơn hàng hiện tại (`Hold Order`) | Lưu tạm giỏ hàng nhiều món bằng 1 thao tác khi khách chờ chọn thêm |
| `Ctrl + Enter` | **Hoàn tất bán hàng & Xuất hóa đơn** | Chốt đơn ngay từ bàn phím mà không cần rê chuột xuống góc dưới |

##### Ý 5: Tùy chỉnh thêm Đóng ca, Kiểm kê — Có thêm Rule Kiểm kê — Giải thích tại sao Người mở ca khác Người đóng ca — Chốt ca = Xác thực 2 bên
- **Trả lời câu hỏi phản biện của Giảng viên: *"Tại sao hiện tại người mở ca khác với người đóng ca?"***
  1. **Nguyên nhân trong code hiện tại ([ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx#L82-L108) & [auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts#L118-L125))**:
     - Trong dữ liệu khởi tạo `INITIAL_SHIFTS` ([ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx#L84-L90)), ca `CA-001` tại `CN01` đang mở có `cashier: "Nguyễn An"`.
     - Trong khi đó, tài khoản demo của role `cashier` trong `ROLE_PROFILES` ([auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts#L121)) lại có `displayName: "Lê Quốc Tuấn Anh"`.
     - Khi đăng nhập bằng tài khoản Thu ngân (`Lê Quốc Tuấn Anh`) và bấm đóng ca `CA-001`, hàm `requestClose()` ([ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx#L254)) ghi `closedBy: currentActorName()` (`"Lê Quốc Tuấn Anh"`), dẫn đến **Người mở ca là `Nguyễn An` nhưng Người đóng ca lại là `Lê Quốc Tuấn Anh`** mà hệ thống không hề cảnh báo hay yêu cầu lý do bàn giao!
     - Tệ hơn nữa, ở dòng 495 (`{!isCashier() && (...)}`), hệ thống chặn Thu ngân mở ca (buộc Quản lý mở ca hộ), nên người tạo/mở ca luôn khác với thu ngân đứng quầy đóng ca.
  2. **Giải thích theo nghiệp vụ thực tế & Cách xử lý chuẩn trong hệ thống**:
     - **Quy tắc chuẩn (Normal Rule)**: Trong một ca tiêu chuẩn (Ca sáng 06:30–14:00 hoặc Ca chiều 14:00–22:00), **Thu ngân nhận bàn giao két tiền đầu ca (Người mở ca) phải chính là người chịu trách nhiệm đếm tiền & kiểm kê cuối ca (Người lập yêu cầu đóng ca)** tại đúng chi nhánh đó.
     - **Khi nào Người mở ca được phép khác Người đóng ca (Exception Rule)?** Chỉ xảy ra trong 3 trường hợp ngoại lệ tại cửa hàng:
       1. Nhân viên mở ca có việc đột xuất / ốm đau giữa ca phải **Bàn giao giữa ca (`Mid-shift Handover`)** cho nhân viên khác.
       2. Ca gãy / tăng ca có sự điều chuyển nhân sự bởi Quản lý chi nhánh.
       3. Quản lý chi nhánh thực hiện **Đóng ca cưỡng bức (`Force Close`)** khi nhân viên quên đóng ca hoặc bỏ vị trí.
     - **Ràng buộc bắt buộc trên phần mềm**:
       - Sửa lại `INITIAL_SHIFTS` để ca đang mở của `CN01` khớp với nhân viên thu ngân thuộc `CN01`, và **cho phép Thu ngân mở ca tại đúng chi nhánh của mình** (với sự xác nhận quỹ đầu ca).
       - Khi bấm Đóng ca, nếu `closingCashierId !== openingCashierId`, hệ thống **tự động bật cảnh báo màu cam `"Người đóng ca khác với Người mở ca"`** và **bắt buộc chọn Lý do bàn giao thay thế** (`Bàn giao giữa ca do việc đột xuất` / `Đổi ca được Quản lý duyệt` / `Quản lý đóng ca hộ`) + nhập mã PIN/xác nhận của Quản lý chi nhánh, nếu không chọn sẽ không cho phép gửi yêu cầu chốt ca!

- **Thiết kế bộ "Rule Kiểm kê cuối ca" (`Stock Count Rules`)**:
  - Hiện tại phần kiểm kê nguyên liệu trong [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx#L53-L79) chỉ có 6 nguyên liệu cố định và chỉ kiểm tra `note.trim()` khi có lệch, chưa có **Bộ quy tắc kiểm kê (Inventory Count Rules)** rõ ràng.
  - Cần bổ sung **`SHIFT_INVENTORY_RULES`** minh bạch ngay trên giao diện và thực thi tự động khi chốt ca:
    1. **Rule 1 - Kiểm kê mù có dẫn hướng (`Guided / Blind Count Option`)**: Thu ngân phải nhập số lượng thực đếm tại quầy (`actualQty`) cho 100% nguyên liệu nhóm A (nhóm giá trị cao/hao hụt nhanh: Bột sữa, Trà đen, Trà ô long, Trân châu, Kem cheese, Ly nhựa). Không được để trống (`actualQty !== null`).
    2. **Rule 2 - Đối chiếu Tồn lý thuyết (`systemQty`) vs Thực đếm (`actualQty`)**:
       - Hệ thống hiển thị sẵn số lượng tồn lý thuyết (`systemQty` do Backend/Store cung cấp) để đối chiếu với số lượng thực đếm tại quầy (`actualQty`).
    3. **Rule 3 - Ngưỡng dung sai hao hụt (`Tolerance Thresholds`)**:
       - **Mức Xanh (Nằm trong ngưỡng cho phép)**: Hao hụt tự nhiên trong pha chế → Cho phép gửi chốt ca bình thường.
       - **Mức Vàng (Lệch nhẹ)**: Vượt ngưỡng dung sai nhẹ → **Bắt buộc chọn Lý do giải trình** cho từng dòng nguyên liệu lệch (`Đổ vỡ khi pha`, `Làm lại món cho khách`, `Hao hụt nấu trân châu`...).
       - **Mức Đỏ (Lệch nghiêm trọng)**: **Khóa tự động nút duyệt nhanh**, bắt buộc lập **Biên bản chênh lệch bất thường** và yêu cầu Quản lý chi nhánh kiểm đếm lại trực tiếp (`Recount Required`) trước khi ký xác thực.

- **Thiết kế cơ chế "Chốt ca = Xác thực 2 bên (`Two-Party Shift Verification`)"**:
  - Sửa lỗi nghiêm trọng ở [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx#L249-L262) (nơi `isCashier()` đang tự chuyển thẳng sang `"closed"`).
  - Quy trình chốt ca bắt buộc phải trải qua **2 bên độc lập xác nhận (Two-Party Handshake)** ngay tại chi nhánh:
    - **Bên thứ 1 (Người bàn giao - Thu ngân / Pha chế đứng ca)**:
      - Thực hiện đếm tiền mặt theo mệnh giá hoặc tổng thực đếm + Nhập số liệu kiểm kê nguyên liệu tại quầy + Giải trình các khoản lệch (nếu có) + Ký xác nhận **Bên giao (`handoverPartySignedBy`, `handoverPartySignedAt`)**.
      - Trạng thái ca chuyển từ `"open"` → `"closing-requested"` (Chờ Bên thứ 2 xác thực).
    - **Bên thứ 2 (Người nhận bàn giao / Quản lý chi nhánh hoặc Trưởng ca kế tiếp)**:
      - Kiểm tra đối chiếu tiền mặt thực tế trong két + Kiểm tra bảng kiểm kê nguyên liệu quầy + Chọn nhân sự xác thực thuộc cùng chi nhánh (`verifierName`, `verifierRole: "Quản lý chi nhánh" | "Ca trưởng nhận bàn giao"`) + Nhập mã xác thực / PIN (`verifierPin`, mặc định demo gợi ý rõ trên UI ví dụ `1234` hoặc nút xác nhận khi đăng nhập bằng tài khoản `manager`).
      - Ký xác nhận **Bên nhận/kiểm chứng (`verifiedBy`, `verifiedAt`)**.
      - Chỉ khi **cả 2 chữ ký (`handoverPartySignedBy` !== `verifiedBy`)** hoàn tất, ca mới chuyển sang `"closed"` và tự động đẩy biên bản sang trang **Đối soát ca tại cửa hàng (`/stores/shift-reconciliation`)**!

---

### 1.3. Pha chế / Hàng đợi pha chế (`/sales/preparation`)

#### 📌 Nguyên văn Feedback Giảng viên
> **sale/preparation:**
> - gọn các thông tin lại
> - pha chế cần hiện thị công thức chế biến

#### 🧠 Suy luận & Giải thích chi tiết từ Note
1. **Vì sao giảng viên yêu cầu "gọn các thông tin lại"?**
   - Trong [PreparationQueuePage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PreparationQueuePage.tsx#L194-L403):
     - Màn hình đang dàn trải gồm: 1 Page Header lớn + 4 thẻ `StatCard` chiếm nguyên một hàng cao + 1 Card bộ lọc lớn chứa 3 cột dropdown/input + 1 Bảng 7 cột (`Thứ tự`, `Đơn hàng`, `Món cần pha (Tách ly)`, `Ghi chú`, `Chờ`, `Trạng thái`, `Thao tác`).
     - Đặc biệt ở cột `Món cần pha (Tách ly)` (dòng 305–338), hàm `expandToCupLabels(order)` tách 1 đơn 6 ly thành **6 dòng thẻ riêng biệt xếp chồng dọc** bên trong 1 ô `<td>`. Chỉ cần 3 đơn hàng là bảng dài lê thê, nhân viên pha chế đứng nhìn màn hình KDS (Kitchen Display System) phải cuộn chuột liên tục và bị rối mắt bởi thông tin tên khách hàng, kênh bán, chi nhánh lặp đi lặp lại.
2. **Vì sao giảng viên yêu cầu "pha chế cần hiển thị công thức chế biến"?**
   - Người đứng quầy pha chế (Barista) cần biết **với ly Trà sữa truyền thống (Size L, 70% đường, 50% đá, +Trân châu đen)** thì phải đong:
     - Bao nhiêu `ml` cốt trà đen?
     - Bao nhiêu `g` bột sữa?
     - Bao nhiêu `ml` nước đường (đã nhân tỷ lệ `70%` đường)?
     - Bao nhiêu `g` đá viên (đã nhân tỷ lệ `50%` đá)?
     - Bao nhiêu `g` topping Trân châu đen?
     - Quy trình lắc / khuấy / ủ trong bao nhiêu giây?
   - Hiện tại `PreparationQueuePage.tsx` chỉ hiện mỗi cái tên `"Trà sữa truyền thống (L) · Đá 50% · Đường 70%"` chứ hoàn toàn không kết nối với `INITIAL_RECIPES` trong [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L662-L760).

#### 🛠️ Cần thay đổi cái gì & ở đâu?

1. **Chuẩn hóa liên kết Sản phẩm POS ↔ Công thức (`RecipeVersion`)**:
   - Trong [products.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/sales/products.ts) và [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts):
     - Thêm trường `recipeProductId?: string` (hoặc đồng nhất `sku` / `code` giữa `POS_PRODUCTS` và `INITIAL_PRODUCTS`) và bổ sung đầy đủ định mức công thức chuẩn cho cả 12 món POS trong `src/data/sales/pos-recipes.ts` (kết hợp dữ liệu động từ `useDemoState().state.recipes`).
   - Trong [sales-orders-store.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/sales-orders-store.ts#L10-L18):
     - Bổ sung `productId?: string` và `sku?: string` vào `SalesOrderItem`.
     - Trong `createPosOrder()` (dòng 579–589), lưu `productId: String(item.product.id)` và `sku: item.product.sku`.
2. **Thiết kế lại giao diện gọn nhẹ cho [PreparationQueuePage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PreparationQueuePage.tsx)**:
   - **Thu gọn Header & Filter thành 1 thanh KDS Toolbar duy nhất (cao `56px`)**:
     - Gộp các chỉ số đếm (`Chờ pha: X` · `Đang pha: Y` · `Hoàn thành: Z` · `Quá hạn >10p: W`) thành các **Filter Pills bấm được trực tiếp** nằm chung 1 hàng với ô tìm kiếm nhanh mã đơn và nút chuyển chế độ xem (`Thẻ KDS gọn` / `Bảng gọn`).
   - **Gom nhóm các ly giống nhau trong cùng đơn**:
     - Thay vì in 4 dòng giống hệt nhau cho 4 ly `Trà sữa truyền thống (M · Đá 100% · Đường 70%)`, hiển thị gọn **`x4 Trà sữa truyền thống [Size M]`** kèm badge `[Ly 1..4/6]`, và cho phép bấm mở rộng từng ly nếu cần.
   - **Tích hợp "Thẻ Công Thức Chế Biến (`Barista Recipe Card / Drawer`)"**:
     - Trên mỗi món trong hàng đợi có nút **`📖 Công thức`** (hoặc tự động hiển thị ở khung bên phải / popover khi bấm vào món hoặc bấm `"Bắt đầu pha"`):
       - **Hiển thị định lượng nguyên liệu cần đong (Frontend đọc từ dữ liệu công thức định sẵn của món và thông tin `size`, `sugar`, `ice`, `qty` từ đơn hàng / Backend trả về)**:
         - Ví dụ hiển thị trên UI cho món *Trà sữa truyền thống* (Size L, Đường 70%, Đá 50%, Số lượng 2 ly):
           - `Cốt hồng trà (F1)`: Hiển thị lượng cần đong theo Size L & 2 ly (VD: `375 ml` — chuẩn 1 ly Size M là `150 ml`).
           - `Bột sữa béo (F0)`: Hiển thị lượng cần đong (VD: `87.5 g`).
           - `Siro đường (F0)`: Hiển thị lượng cần đong đã điều chỉnh theo mức `70% Đường` (VD: `44 ml`, gạch ngang mức chuẩn `62.5 ml` để pha chế thấy rõ khách giảm đường).
           - `Đá bi tiêu chuẩn`: Hiển thị lượng đá theo mức `50% Đá` (VD: `180 g`).
           - `Topping cộng thêm`: Hiển thị danh sách topping của món (VD: `Trân châu đen: 100 g`).
       - **Các bước thao tác chuẩn (3–4 bước ngắn gọn)**:
         1. Đong cốt trà nóng + bột sữa khuấy tan hoàn toàn.
         2. Thêm siro đường theo mức `70%` + đá viên mức `50%` vào bình shaker, lắc đều 12 nhịp.
         3. Cho topping vào đáy ly, rót trà sữa ra ly, dập màng ép và dán tem `[Ly 1/2]`, `[Ly 2/2]`.

---

### 1.4. Đổi trả & Hoàn tiền (`/sales/returns`)

#### 📌 Nguyên văn Feedback Giảng viên
> **sale/returns:**
> - thêm thanh search cho đơn cần xử lí, có thể search bang mã đơn hàng. 
> - đổi một món trong hóa hoặc đổi toàn bộ đơn. Sau khi hoafn thành kiếu nại hoàn tiền thì có thêm
> 	+ ghi lại thay đổi vào đơn hàng (ưu tiên). Chi phí hoàn hoàn thì tự động tính toán chứ không đề tay
> 	+ ghi lại mới hoàn toàn

#### 🧠 Suy luận & Giải thích chi tiết từ Note
1. **Vấn đề 1 — Chọn đơn gốc chưa có thanh Search**:
   - Tại [SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx#L397-L413), trong modal `"Tạo phiếu đổi trả / hoàn tiền"`, việc chọn `"Đơn hàng gốc"` đang dùng thẻ `<select>` HTML thuần chứa toàn bộ danh sách đơn. Khi cửa hàng có hàng trăm đơn trong ca, thu ngân không thể gõ mã đơn (`DH-00125`) hay SĐT khách để tìm đơn cần xử lý trong modal này.
   - Ở ngoài danh sách chính ([SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx#L254-L286)) cũng cần khu vực **"Tra cứu nhanh đơn hàng cần xử lý đổi trả"** ngay đầu trang: gõ mã đơn hàng (`DH-00125`) hoặc mã hóa đơn (`HD-CN01-003814`) hoặc SĐT khách là hiện ngay thông tin đơn hàng đó kèm nút **`Tạo phiếu đổi/hoàn cho đơn này`**.

2. **Vấn đề 2 — Chỉ đang nhập tên món bằng text, chưa chọn "Đổi 1 món trong hóa đơn" hay "Đổi/Hoàn toàn bộ đơn"**:
   - Hiện tại khi chọn đơn gốc, hàm `handleSelectOrder` ([SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx#L140-L149)) chỉ nối chuỗi tất cả tên món vào 1 ô `<input type="text">` (`formItemSummary`) và gán toàn bộ `order.total` vào ô `formAmount`.
   - Thu ngân không thể tích chọn từng món cụ thể trong hóa đơn (ví dụ đơn có 4 ly, khách chỉ khiếu nại 1 ly *Kem cheese bị chua* với số lượng `1/2 ly`), cũng không thể chọn món đổi thay thế (`replacementItem`) để hệ thống hiển thị chênh lệch giá.

3. **Vấn đề 3 — Tiền hoàn đang cho gõ tay (`<input type="number">`) thay vì tự động hiển thị**:
   - Dòng 462–471 của [SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx#L462-L471) đang cho phép thu ngân tự gõ bất kỳ số tiền nào vào ô `Số tiền hoàn (VND)`. Điều này cực kỳ rủi ro thất thoát tiền mặt. Việc tính toán số tiền hoàn là trách nhiệm của hệ thống/Backend dựa trên món được chọn, còn **Frontend phải khóa ô nhập tay (`readOnly`) và chỉ hiển thị bảng kết quả chi phí hoàn tự động**.

4. **Vấn đề 4 — Sau khi hoàn thành khiếu nại/hoàn tiền: "Ghi lại thay đổi vào đơn hàng (Ưu tiên)" vs "Ghi lại mới hoàn toàn"**:
   - Hiện tại khi bấm `"Hoàn tất"` phiếu đổi trả (`updateStatus(id, "completed")` tại dòng 182–201 của [SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx#L182-L201)), nếu là `"refund"` thì hệ thống gọi `updateOrderPayment(orderId, "refunded")` biến cả đơn hàng 500.000 ₫ thành `"Đã hoàn tiền"` toàn bộ (dù chỉ hoàn 1 ly 35.000 ₫!), còn nếu là `"exchange"` (đổi món) thì **không hề cập nhật gì vào đơn hàng gốc hay tạo đơn mới**!
   - Giảng viên yêu cầu 2 chế độ ghi nhận sau khi xử lý xong (`resolutionRecordMode`):
     - **Chế độ 1 (Ưu tiên mặc định - `amend-original`): Ghi lại thay đổi trực tiếp vào đơn hàng gốc**:
       - Giữ nguyên mã đơn hàng gốc (`DH-00125`), cập nhật danh sách món (`items`), cập nhật số tiền thực thu sau điều chỉnh, chuyển trạng thái thanh toán thành `"partially-refunded"` (Hoàn một phần) hoặc `"refunded"` (Hoàn toàn bộ), và **lưu lịch sử điều chỉnh (`amendmentLogs: OrderAmendmentLog[]`)** ngay bên trong đơn hàng gốc và hóa đơn gốc (`/sales/orders`, `/invoices/details`).
     - **Chế độ 2 (Tùy chọn - `create-new-order`): Ghi lại mới hoàn toàn**:
       - Đánh dấu đơn cũ (hoặc phần món lỗi của đơn cũ) là đã hủy/hoàn trả, đồng thời **sinh một Đơn hàng mới (`DH-00125-R1`)** chứa các món đúng / món đổi mới, có trường `parentOrderId` trỏ về đơn gốc `DH-00125` để kế toán truy vết hai chiều.

#### 💡 Cơ chế Hiển thị Chi phí hoàn / Đổi món Tự động trên Frontend (Không gõ tay - Số liệu do Backend/Store cung cấp)
- Thay vì để thu ngân tự nhập tay số tiền, khi thu ngân tích chọn món cần hoàn/đổi và món thay thế (nếu có), Frontend gửi thông tin món chọn (hoặc đọc từ các trường dữ liệu đã tính sẵn trong Store/Backend) và hiển thị trong một **Khung Chi tiết Chi phí Hoàn/Đổi (`readOnly`)** gồm các trường:
  1. `returnedItemsOriginalAmount`: Giá niêm yết của các món được tích chọn trả lại.
  2. `allocatedDiscountDeduction`: Phần giảm giá voucher/hạng thành viên đã áp dụng trên các món đó (do Backend phân bổ).
  3. `replacementItemsAmount`: Giá trị món mới thay thế (nếu khách chọn `Đổi món khác`).
  4. `autoRefundAmount` (**Ô `readOnly` khóa gõ tay**): Số tiền thực tế cần hoàn lại cho khách (hoặc `0 ₫` nếu đổi ngang món cùng loại, hoặc hiển thị nhãn `Khách bù thêm chênh lệch` nếu đổi sang món đắt hơn).
  5. `internalRemakeCost`: Chi phí hao hụt làm lại nội bộ của quán (chỉ hiển thị để theo dõi quản trị).

#### 🛠️ Cần thay đổi cái gì & ở đâu?

1. **File [sales-orders-store.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/sales-orders-store.ts#L10-L43)**:
   - Mở rộng `PaymentStatus`: thêm `"partially-refunded"` (`"Hoàn 1 phần"`).
   - Mở rộng `SalesOrderItem`: thêm `returnedQty?: number`, `returnStatus?: "normal" | "exchanged" | "refunded"`, `replacedByItemName?: string`.
   - Thêm interface `OrderAmendmentLog`:
     ```ts
     export interface OrderAmendmentLog {
       id: string;
       returnCode: string;
       timestamp: string;
       actor: string;
       scope: "single-item" | "full-order";
       resolutionType: "refund" | "exchange";
       recordMode: "amend-original" | "new-order";
       affectedItems: {
         itemIndex: number;
         itemName: string;
         returnedQty: number;
         unitPrice: number;
         replacementItemName?: string;
         replacementUnitPrice?: number;
       }[];
       autoRefundAmount: number;
       internalRemakeCost: number;
       newOrderId?: string;
       note: string;
     }
     ```
   - Bổ sung vào `SalesOrder`: `amendments?: OrderAmendmentLog[]`, `refundedAmount?: number`, `parentOrderId?: string`, `replacedByOrderId?: string`.
   - Viết 2 hàm store mới trong `sales-orders-store.ts`:
     - `amendSalesOrderFromReturn(orderId, amendment)`: Ghi đè thay đổi trực tiếp vào đơn hàng gốc (cập nhật `items`, `refundedAmount`, `paymentStatus`, đẩy bản ghi vào `amendments`) và đồng bộ sang `milktyway_invoices_v1`.
     - `recreateSalesOrderFromReturn(orderId, amendment)`: Đánh dấu đơn gốc đã hoàn/đổi và sinh đơn hàng mới `DH-xxxxx-R1` có `parentOrderId = orderId`.

2. **File [SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx)**:
   - **Thêm Thanh Search Đơn Cần Xử Lý**:
     - Ngay trên đầu trang (dòng 254): Thêm hộp **"Tìm nhanh đơn hàng cần đổi trả / hoàn tiền"** (nhập mã đơn `DH-...`, mã hóa đơn `HD-...`, hoặc SĐT khách → hiển thị kết quả tức thì kèm danh sách món trong đơn và nút `"Xử lý đổi/hoàn đơn này"`).
     - Bên trong Modal tạo phiếu (dòng 397–413): Thay thẻ `<select>` đơn thuần bằng **Searchable Order Combobox** (có ô input gõ tìm mã đơn `DH-00125`, tên khách, SĐT, lọc theo chi nhánh).
   - **Thêm lựa chọn Phạm vi đổi trả (`scope: "single-item" | "full-order"`)**:
     - Radio button 1: **`Đổi / Hoàn một hoặc vài món trong hóa đơn`** → Hiển thị bảng từng món của đơn hàng gốc có checkbox chọn món, bộ chọn số lượng lỗi (`1 .. item.qty`), và (nếu chọn `Đổi món mới`) dropdown chọn món thay thế từ menu POS.
     - Radio button 2: **`Đổi / Hoàn toàn bộ đơn hàng`** → Tự động tích chọn toàn bộ các món và toàn bộ số lượng trong đơn.
   - **Khóa ô nhập tay tiền hoàn — Thay bằng Bảng tính chi phí hoàn tự động (`Auto-Calculated Refund Breakdown`)**:
     - Hiển thị rõ công thức: `Giá gốc món lỗi` − `Khấu trừ KM phân bổ` − `Giá trị món đổi mới` = **`Số tiền hoàn trả khách (Tự động tính)`** + **`Chi phí nguyên liệu làm lại nội bộ (Tự động tính)`**. Ô số tiền hoàn là `readOnly` (không cho gõ tay).
   - **Thêm lựa chọn Chế độ ghi nhận vào đơn hàng (`recordMode`)**:
     - Radio 1 (**Mặc định - Ưu tiên**): `Ghi lại thay đổi trực tiếp vào đơn hàng gốc (Cập nhật hóa đơn gốc & lưu lịch sử điều chỉnh)`.
     - Radio 2: `Ghi lại thành đơn hàng mới hoàn toàn (Tạo mã đơn mới liên kết với đơn gốc)`.

---

### 1.5. Khuyến mãi (Góc nhìn Nhân viên & Bố cục danh sách - `/marketing/promotions`)

#### 📌 Nguyên văn Feedback Giảng viên
> **khuyến mãi:**
> - đều chỉnh % nội dung sao cho danh sách mại bự ra

#### 🧠 Suy luận & Giải thích chi tiết từ Note
- **Vì sao giảng viên nhận xét *"điều chỉnh % nội dung sao cho danh sách khuyến mãi bự ra"*?**
  - Khi kiểm tra [PromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PromotionsPage.tsx#L283-L450):
    1. Phần trên của trang đang bị chiếm diện tích quá lớn bởi: Page Header + 4 thẻ `StatCard` cao + 1 Card bộ lọc cồng kềnh (`grid-cols-4` có label riêng). Khi mở trên màn hình chuẩn, phần danh sách khuyến mãi bên dưới chỉ còn chiếm chưa tới **40% chiều cao khung nhìn đầu tiên (above the fold)**.
    2. Bên trong bảng danh sách khuyến mãi (`<table>` dòng 367–450), có tới **9 cột** nhồi nhét ngang nhau, trong đó các cột phụ (`Cập nhật`, `Thao tác` gồm 3 nút chữ dài `"Sửa"`, `"Tạm dừng"`, `"Xóa"`) chiếm quá nhiều chiều ngang, làm cho các cột nội dung cốt lõi của khuyến mãi (**Tên & Mô tả chương trình**, **Mức giảm `% / ₫`**, **Điều kiện & Phạm vi**, **Tiến độ ngân sách / lượt dùng `%`**) bị ép nhỏ lại và xuống dòng xấu.
- **Giải pháp**:
  1. **Tối ưu tỷ lệ chiều dọc (Vertical Layout Ratio)**:
     - Thu gọn dải KPI và thanh bộ lọc ở trên thành 1 thanh **Compact Summary & Filter Strip** gọn gàng, giúp **Bảng danh sách khuyến mãi chiếm > 75% diện tích màn hình**.
  2. **Tối ưu tỷ lệ phần trăm chiều ngang các cột (`Column Width %`) & Cỡ chữ hiển thị**:
     - Quy hoạch lại độ rộng cột theo `%` rõ ràng (`table-fixed` hoặc `colgroup` chuẩn):
       - Cột **Mã & Tên chương trình + Quy định ngắn**: `28%` (cỡ chữ tiêu đề `text-base font-bold`, badge mã KM nổi bật).
       - Cột **Mức ưu đãi (`% / Số tiền`)**: `14%` (hiển thị badge lớn `text-lg font-extrabold text-emerald-600`, ví dụ **`-20%`**, **`-30.000 ₫`**, **`Mua 2 Tặng 1`**).
       - Cột **Giới hạn & Tiến độ (`Tổng / Số lượng / Tiền`)**: `26%` (hiển thị thanh progress bar lớn kèm `%` đã dùng và dự báo giới hạn nào chạm trước).
       - Cột **Thời gian & Chi nhánh áp dụng**: `16%`.
       - Cột **Trạng thái & Ràng buộc**: `8%`.
       - Cột **Thao tác (Icon buttons gọn)**: `8%`.
  3. **Cho phép Thu ngân (`cashier`) xem danh sách khuyến mãi ở chế độ Tra cứu (`Read-only`)**:
     - Trong [auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts#L73-L77), thêm `/marketing/promotions` vào `cashierPages` (ẩn các nút `Tạo khuyến mãi`, `Sửa`, `Xóa` bằng `can("promotion.manage")`) để nhân viên bán hàng có thể mở tra cứu chi tiết thể lệ khuyến mãi cho khách tại quầy.


---

## PHẦN 2: PHÂN HỆ QUẢN LÝ (`# Quản lí`)

---

### 2.1. Bảng điều khiển Tổng quan (`/dashboard`)

#### 📌 Nguyên văn Feedback Giảng viên
> **/dashboard**
> - Đơn vị thời gian 
> - cần xem lượng khách theo từng chia nhánh, thời gian 
> - thêm pop up, hay hiển thị rà chuột để hiển thị tên thông tin 
> - ngưỡng lieu dưới ngưỡng: 
> 	+ cho xem cách thức tính toán ra ngưỡng.
> 	+ khóa, bỏ qua các nguyên lieu mà mình cho là ko còn sài nuawxn -> lọc bỏ cảnh báo thừa 
> - coi được các công thức tính toán , các thông tin cho từng chi nhánh

#### 🧠 Suy luận & Giải thích chi tiết từng ý từ Note

1. **Đơn vị thời gian (`Time Unit Granularity` + Đơn vị hiển thị trục biểu đồ)**:
   - **Hiện trạng trong [DashboardPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/DashboardPage.tsx#L462-L470) & [charts.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/dashboard/charts.ts#L1-L26) & [TemplateChart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/shared/TemplateChart.tsx#L117-L163)**:
     - Tại dòng 462–466 của `DashboardPage.tsx`, khu vực biểu đồ `Tổng quan doanh thu` hiện chỉ còn duy nhất 1 nút tĩnh `<button>Tháng</button>` (2 nút `Ngày` và `Tuần` đã bị xóa ở các lần chỉnh sửa trước). Do đó người quản lý không thể chuyển đổi đơn vị thời gian (`Theo Giờ trong ngày | Theo Ngày trong tuần | Theo Tuần trong tháng | Theo Tháng trong năm | Theo Quý`).
     - Hơn nữa, trong `charts.ts` (dòng 24), mảng `salesData.monthly.data = [67347, 70234, ...]` đang lưu theo đơn vị **Nghìn đồng (k VND)**, nhưng trong `TemplateChart.tsx` (dòng 118 và 136), dataset lại gán nhãn `label: "Đơn hàng"` và định dạng tooltip là `67.347 VND` (thay vì `67.347.000 ₫`), còn trục tung `Y` không ghi đơn vị thời gian/tiền tệ (`Triệu ₫ / Tháng`).
   - **Giải pháp**:
     - Thêm bộ chọn **Đơn vị thời gian toàn cục (`timeGranularity: "hour" | "day" | "week" | "month" | "quarter"`)** trên thanh công cụ Dashboard và đồng bộ trực tiếp vào tất cả các biểu đồ (`Doanh thu`, `Lượng khách`, `Số ly bán ra`) + nhãn trục `X` (`Giờ (07:00 - 22:00)`, `Ngày (T2 - CN)`, `Tuần (Tuần 1 - Tuần 4)`, `Tháng (T1 - T12)`) và nhãn trục `Y` (`Đơn vị: Triệu VNĐ`, `Đơn vị: Lượt khách`).

2. **Xem lượng khách theo từng chi nhánh, thời gian (`Customer Traffic by Branch & Time`)**:
   - **Hiện trạng**:
     - Thẻ KPI `"Tổng khách hàng"` ([DashboardPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/DashboardPage.tsx#L431)) đang hiển thị con số cứng `1,377` (trong `dashboard-demo.ts` dòng 83), không hề thay đổi khi chọn Chi nhánh hay chọn Khoảng thời gian!
     - Hoàn toàn **chưa có biểu đồ hay bảng phân tích Lượng khách (`Customer Footfall / Traffic`) theo từng Chi nhánh và theo Khung giờ / Ngày / Tháng**.
   - **Giải pháp**:
     - Xây dựng mới widget/biểu đồ **"Phân tích Lượng khách theo Chi nhánh & Thời gian (`BranchCustomerTrafficSection`)"** ngay trên Dashboard:
       - Hỗ trợ 2 chế độ xem:
         1. **So sánh giữa các chi nhánh theo thời gian** (Grouped Bar / Multi-line Chart: `CN01 - Nguyễn Huệ`, `CN05 - Hàng Xanh`, `CN08 - Cầu Giấy`... theo Giờ cao điểm / Ngày / Tuần / Tháng).
         2. **Phân rã khách tại 1 chi nhánh**: `Khách hội viên quay lại` vs `Khách vãng lai mới` vs `Khách đặt đơn lớn`, kèm `Lượng khách trung bình/giờ` và `Khung giờ cao điểm (Peak Hour)`.

3. **Thêm Pop-up / Hiển thị rà chuột (`Hover Tooltip & Click Popover`) để hiển thị tên đầy đủ và thông tin chi tiết**:
   - **Hiện trạng**:
     - Các danh sách như *Nguyên liệu dưới ngưỡng*, *Top sản phẩm*, *Lô sắp hết hạn*, *Thẻ KPI* có nhiều tên dài bị cắt (`truncate`) hoặc viết tắt (`ROP`, `AOV`, `COGS`, `SL`, `CN01..CN12`) mà khi rà chuột vào không có tooltip giải thích.
   - **Giải pháp**:
     - Tạo component dùng chung `InfoPopover` / `HoverTooltip` (`src/components/shared/InfoTooltip.tsx`):
       - Khi **rà chuột (hover)** vào bất kỳ tên nguyên liệu, tên món, mã chi nhánh, chỉ số KPI, cột biểu đồ nào → hiện ngay khung thông tin đầy đủ (Tên đầy đủ, Mã, Chi nhánh, Mô tả quy tắc nghiệp vụ, Giá trị kỳ trước).
       - Khi **bấm (click)** vào thẻ KPI hoặc dòng cảnh báo → mở **Pop-up chi tiết (Modal / Slide-over Drawer)** liệt kê danh sách bản ghi cấu thành nên con số đó.

4. **Ngưỡng nguyên liệu dưới ngưỡng (`Below-Threshold Ingredients`)**:
   - **4a. Cho xem cách thức tính toán ra ngưỡng (`Hiển thị thuyết minh ngưỡng ROP từ Backend/Store`)**:
     - **Hiện trạng ([stock-summary.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/stock-summary.ts#L66-L98) & [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L502-L538))**:
       - Hiện tại `ingredient.minimum` trong `INITIAL_INGREDIENTS` chỉ là một con số tĩnh (`5000 g`, `3000 g`, `4000 g`...) dùng chung cho cả Kho Tổng lẫn từng Quầy chi nhánh! Khi giảng viên hỏi *"Ngưỡng 5.000g này ở đâu ra? Tại sao quầy nhỏ cũng áp ngưỡng 5.000g giống kho tổng?"*, giao diện không có chỗ hiển thị thuyết minh.
     - **Giải pháp trên Frontend (Số liệu ngưỡng do Backend tính toán và trả về theo từng điểm kho)**:
       - Mở rộng dữ liệu `Ingredient` nhận từ Backend/Store thêm các trường thông tin thuyết minh ngưỡng cho từng điểm kho (`branchMinimums`, `avgDailyUsage`, `leadTimeDays`, `safetyStock`, `thresholdRuleText`).
       - Khi người quản lý bấm nút **`📐 Cách tính ngưỡng`** hoặc rà chuột vào con số ngưỡng tối thiểu trên bảng, Frontend hiển thị Pop-up thuyết minh rõ các thông số cấu thành ngưỡng của điểm kho đó:
         - **Mức tiêu thụ bình quân ngày (`avgDailyUsage`)**: Ví dụ tại `CN05` là `1.800 g/ngày`.
         - **Thời gian chờ cung ứng (`leadTimeDays`)**: Ví dụ Quầy chi nhánh nhận từ Kho Tổng là `1 ngày`; Kho Tổng nhập từ Nhà cung cấp là `3 ngày`.
         - **Mức tồn kho an toàn dự phòng (`safetyStock`)**: Ví dụ tại `CN05` là `700 g`.
         - **Ngưỡng cảnh báo tối thiểu (`minimum` / `branchMinimum`)**: Hiển thị kết quả ngưỡng áp dụng cho `CN05` là `2.500 g` (trong khi tại `Kho Tổng` là `20.000 g`).
     - **Sửa lỗi ngầm trong `buildStockSummary()` ([stock-summary.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/stock-summary.ts#L66-L98))**:
       - Hiện tại `buildStockSummary` chỉ duyệt qua các `lots` đang có tại chi nhánh đó (`grouped.set(lot.ingredientId, ...)`). Nếu một nguyên liệu tại `CN05` đã dùng **hết sạch (0 lô còn lại)** thì nó lại **biến mất khỏi danh sách cảnh báo dưới ngưỡng**! Phải sửa lại để duyệt qua toàn bộ `state.ingredients`, nếu nguyên liệu nào không còn lô tại chi nhánh thì `availableQuantity = 0` → báo động đỏ `Hết hàng` (trừ khi nguyên liệu đó đã bị khóa/bỏ qua).

   - **4b. Khóa, bỏ qua các nguyên liệu không còn xài nữa → Lọc bỏ cảnh báo thừa (`Mute / Ignore Discontinued Ingredients`)**:
     - **Thiết kế tính năng**:
       - Bổ sung vào `DemoState` (hoặc `Ingredient` trong [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L10-L18)):
         ```ts
         export interface IgnoredThresholdRule {
           ingredientId: string;
           scope: "ALL" | string; // "ALL" (toàn chuỗi) hoặc mã chi nhánh "CN01", "CN05"
           reason: "Ngưng kinh doanh món" | "Đổi sang nguyên liệu thay thế" | "Nguyên liệu theo mùa đã kết thúc" | "Khác";
           note?: string;
           ignoredBy: string;
           ignoredAt: string;
         }
         ```
       - Ngay trên từng dòng của bảng **"Nguyên liệu dưới ngưỡng"** tại `/dashboard` ([DashboardPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/DashboardPage.tsx#L308-L353)) và `/inventory/ingredients`:
         - Thêm nút **`📐 Cách tính ngưỡng`** (mở pop-up thuyết minh ngưỡng của nguyên liệu đó).
         - Thêm nút **`🔕 Bỏ qua / Ngưng dùng`** (chọn phạm vi: *Tại chi nhánh này* hoặc *Toàn chuỗi* + lý do: *Không còn sử dụng / Đã đổi mã NL mới*).
         - Khi bấm **Bỏ qua**, nguyên liệu đó lập tức được **lọc ra khỏi danh sách cảnh báo dưới ngưỡng** và trừ khỏi bộ đếm cảnh báo đỏ trên KPI Card!
         - Có nút **`Đã khóa/bỏ qua (N)`** ở góc bảng để quản lý xem lại danh sách các nguyên liệu đã khóa và bấm **`Khôi phục theo dõi`** bất cứ lúc nào.

5. **Coi được thuyết minh cách tính và thông tin cho từng chi nhánh (`Rule Inspector & Per-Branch Breakdown`)**:
   - Thêm nút **`📋 Thuyết minh chỉ số & Chi tiết theo Chi nhánh`** ngay trên đầu trang `/dashboard` và biểu tượng `(i)` trên từng thẻ KPI (`Tổng sản lượng ly`, `Doanh thu thuần`, `Lượng khách`, `Giá trị đơn TB (AOV)`, `Tỷ lệ hủy/hoàn`, `Tỷ lệ hao hụt kho`).
   - Khi chọn 1 chi nhánh trên bộ lọc (`CN01`, `CN05`, `CN08`...) hoặc xem bảng so sánh:
     - Toàn bộ 6 thẻ KPI, biểu đồ Doanh thu, biểu đồ Lượng khách, Top món bán chạy, Cảnh báo nguyên liệu dưới ngưỡng đều **hiển thị số liệu của đúng chi nhánh đó** (thay vì hiển thị số cố định `786`, `1,377` như hiện tại ở dòng 409–455 của `DashboardPage.tsx`).

---

### 2.2. Công thức sản xuất (`/production/recipes`)

#### 📌 Nguyên văn Feedback Giảng viên
> **/production/recipes**
> - sắp xếp theo priority
> - lọc nguyên liệu trong công thức. Tôi muốn xem tất cả món có trà xanh chẳng hạn. Thay thế nguyên liệu bằng cách nào, làm sao thay thế nhanh được.
> ví dụ là có trà loại A sài cho món X,Y,Z. Muốn thay đổi A trong X thì có ảnh hưởng Y,Z k?. Món X cần bỏ đi làm lại hay

#### 🧠 Suy luận & Giải thích chi tiết từng ý từ Note

##### 1. Sắp xếp Công thức (`Sort`) — Cụ thể từng trường dữ liệu (`Field`)
Trên thanh công cụ của [RecipesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/RecipesPage.tsx), bổ sung Dropdown/Nút **Sắp xếp (`sortBy`)** nói rõ trường dữ liệu (`field`) được dùng để sort:
- **Theo Độ ưu tiên (`priority`)**:
  - `Độ ưu tiên: Cao → Thấp` (`priority-asc`): Sort theo trường **`recipe.priority`** (`1` = Cao / Món chủ lực Signature → `2` = Trung bình → `3` = Thấp / Món theo mùa).
  - `Độ ưu tiên: Thấp → Cao` (`priority-desc`): Sort theo trường **`recipe.priority`** (`3 → 2 → 1`).
- **Theo Tên món (`A → Z` / `Z → A`)**:
  - `Tên món: A → Z` (`name-asc`) và `Tên món: Z → A` (`name-desc`): Sort theo trường **`product.name`** (tra cứu từ `recipe.productId` sang `ProductItem.name` bằng `localeCompare("vi")`).
- **Theo Ngày hiệu lực / Phiên bản (`Mới nhất` / `Cũ nhất`)**:
  - `Mới nhất trước` (`newest`): Sort giảm dần theo trường **`recipe.effectiveDate`** (định dạng `YYYY-MM-DD`, ví dụ `"2026-11-10"` xếp trước `"2026-09-01"`).
  - `Cũ nhất trước` (`oldest`): Sort tăng dần theo trường **`recipe.effectiveDate`**.

##### 2. Kiểm tra & Xem TẤT CẢ các món có chứa 1 nguyên liệu được tìm kiếm (Ví dụ: Tìm `"trà xanh"` ra toàn bộ các món có Trà xanh)
- **Hiện trạng ([RecipesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/RecipesPage.tsx#L140-L157))**:
  - Ô tìm kiếm hiện tại trên `RecipesPage.tsx` chỉ kiểm tra `product.name`, `recipe.version`, `recipe.approvedBy`. Nếu giảng viên gõ `"trà xanh"` hoặc muốn lọc nguyên liệu `Trà xanh nhài (nl-003)`, hệ thống **không hề kiểm tra mảng `recipe.lines` (danh sách nguyên liệu cấu thành món)**!
- **Cơ chế Kiểm tra tất cả các món chứa nguyên liệu được tìm kiếm (`Ingredient-to-Dishes Reverse Lookup`)**:
  - Thêm bộ lọc chuyên biệt **"Lọc / Tìm tất cả món chứa nguyên liệu"** (gồm cả Dropdown chọn nguyên liệu `ingredientFilterId` LẪN hỗ trợ gõ tên nguyên liệu như `"trà xanh"`, `"bột sữa"`, `"trân châu"`):
  - Với mỗi bản ghi `recipe` trong `state.recipes`, hàm kiểm tra `recipeContainsIngredient(recipe, targetIngredientIdOrKeyword)` thực hiện **2 tầng kiểm tra**:
    1. **Kiểm tra trực tiếp (`Direct Match` trong `recipe.lines`)**:
       - Duyệt qua từng dòng `line` trong `recipe.lines: RecipeLine[]`.
       - Tra cứu đối tượng `ingredient` từ `line.ingredientId`.
       - Khớp nếu `line.ingredientId === selectedIngredientId` HOẶC `ingredient.name.toLowerCase().includes(keyword)` HOẶC `ingredient.code.toLowerCase().includes(keyword)`.
    2. **Kiểm tra bắc cầu qua nguyên liệu trung gian `F1` (`Transitive Match via F1 Base`)**:
       - Nếu dòng `line` trong công thức món sử dụng một nguyên liệu bán thành phẩm `F1` (ví dụ `Cốt trà sữa truyền thống - nl-f1-001` có `tier === "F1"`), hệ thống kiểm tra tiếp mảng `f1Ingredient.parentF0Composition`.
       - Nếu trong `parentF0Composition` có chứa nguyên liệu gốc `F0` đang tìm kiếm (ví dụ `Trà đen - nl-001` hoặc `Trà xanh nhài - nl-003`), thì món đó **cũng được tính là có chứa nguyên liệu đang tìm**!
  - **Hiển thị kết quả trực quan trên UI**:
    - Hiển thị **Banner Tổng hợp Kết quả Kiểm tra** ngay phía trên danh sách công thức:
      - Ví dụ: **`🔍 Kết quả kiểm tra nguyên liệu "Trà xanh nhài (NL-003)": Tìm thấy 3 món có chứa nguyên liệu này:`** kèm danh sách tag các món khớp (**`1. Trà đào cam sả (120 ml)`**, **`2. Trà vải hoa hồng (100 ml)`**, **`3. Lục trà macchiato (150 ml - qua cốt F1)`**).
    - Bên trong từng thẻ công thức được lọc ra, dòng nguyên liệu khớp tìm kiếm trong bảng `recipe.lines` được **tô sáng (highlight viền xanh lá + badge `Đang lọc`)** để giảng viên nhìn thấy ngay nguyên liệu đó nằm ở đâu và dùng bao nhiêu định lượng trong từng món!

##### 3. Trả lời câu hỏi phản biện của Giảng viên về Thay thế nguyên liệu (`A -> B` trong `X, Y, Z`)
> *"Ví dụ có trà loại A xài cho món X, Y, Z. Muốn thay đổi A trong X thì có ảnh hưởng Y, Z không? Món X cần bỏ đi làm lại hay sao?"*

1. **Khi thay đổi nguyên liệu `A -> B` trong món `X`, có ảnh hưởng tới món `Y, Z` hay không?**
   Câu trả lời phụ thuộc vào **Cấp độ nguyên liệu (Phân cấp `F0` vs `F1`)** nơi thực hiện thay đổi:
   - **Trường hợp 1: Thay thế trực tiếp trong Công thức của riêng món `X` (`Recipe-level Local Swap`)**:
     - Trong cấu trúc dữ liệu ([business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L66-L81)), mỗi món `X, Y, Z` sở hữu bản ghi `RecipeVersion` độc lập với mảng `lines: RecipeLine[]` riêng (`ingredientId` và `quantity`).
     - Do đó, nếu thay **Trà loại A (`nl-001`)** bằng **Trà loại B (`nl-003`)** chỉ trong công thức của **Món X**, hệ thống sẽ sinh ra phiên bản công thức mới cho riêng **Món X**; còn **Món Y và Món Z hoàn toàn KHÔNG bị ảnh hưởng** (vẫn giữ nguyên công thức dùng Trà loại A).
   - **Trường hợp 2: Thay thế hàng loạt có chọn lọc (`Selective Bulk Swap across X, Y, Z`)**:
     - Nếu Trà loại A bị nhà cung cấp ngưng giao hoặc cần đổi sang Trà loại B cho nhiều món, người quản lý mở công cụ **"Thay thế nhanh nguyên liệu"**: hệ thống tự động kiểm tra và liệt kê toàn bộ các món đang chứa Trà A (`[✓] Món X`, `[ ] Món Y`, `[ ] Món Z`). Quản lý tích chọn món nào thì chỉ những món được tích mới được cập nhật sang Trà B.
   - **Trường hợp 3: Thay thế ở cấp Bán thành phẩm trung gian `F1` (`Shared Intermediate Base Swap`)**:
     - Nếu Trà loại A (`F0`) không nằm trực tiếp trong công thức pha ly của `X, Y, Z` mà nằm trong công thức nấu **Cốt trà nền `F1`**, còn cả 3 món `X, Y, Z` đều dùng chung **Cốt trà nền `F1`** đó:
       - Khi thay đổi công thức nấu **Cốt `F1`** (đổi Trà A sang Trà B), thì **cả 3 món `X, Y, Z` đều sẽ bị ảnh hưởng gián tiếp**!
       - Nếu chỉ muốn một mình món `X` đổi vị trà mà **không làm ảnh hưởng `Y, Z`**, hệ thống cung cấp tùy chọn **`Tách nhánh cốt nền F1 mới cho riêng Món X`** hoặc đổi nguyên liệu trực tiếp ở công thức của riêng Món `X`.

2. **Món `X` (và các mẻ bán thành phẩm đã chuẩn bị) có cần bỏ đi làm lại (`Discard & Remake`) hay không?**
   Hệ thống cung cấp **2 tùy chọn xử lý mẻ/lô cũ (`Disposition Policy`)** ngay trên Modal khi bấm áp dụng thay đổi công thức:
   - **Kịch bản A — Thay đổi do nâng cấp hương vị / tối ưu giá vốn / đổi nhà cung cấp thông thường (`Sell-through existing lots`)**:
     - **KHÔNG cần bỏ đi làm lại**. Các mẻ của món `X` đã chuẩn bị hoặc các lô cốt nền cũ còn hạn sử dụng tại quầy vẫn được **tiếp tục bán hết** theo phiên bản công thức cũ cho đến khi hết lô hoặc đến ngày hiệu lực `effectiveDate` của phiên bản mới.
   - **Kịch bản B — Thay đổi khẩn cấp do Lỗi chất lượng / Hỏng nguyên liệu / Sai công thức (`Discard & Remake`)**:
     - **BẮT BUỘC hủy lô cũ và làm lại**:
       1. Toàn bộ các mẻ sản xuất (`ProductionBatch`) và lô tồn quầy (`IngredientLot`) liên quan đến nguyên liệu A bị lỗi của món `X` được đánh dấu thu hồi/hủy (`StockAdjustment` loại `Hủy hàng - Hỏng`).
       2. Các ly món `X` đang ở trạng thái `"Đang pha chế"` hoặc `"Sẵn sàng"` chưa giao khách trên màn hình `/sales/preparation` được gắn nhãn **`⚠️ Cần pha lại theo công thức mới`**.
       3. Hệ thống tạo lệnh sản xuất bù (`Remake Batch`) theo công thức mới.

#### 🛠️ Cần thay đổi cái gì & ở đâu?

1. **File [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L66-L81)**:
   - Mở rộng interface `RecipeVersion`:
     ```ts
     export type RecipePriority = 1 | 2 | 3; // 1 = Cao (Món chủ lực / Signature), 2 = Trung bình, 3 = Thấp (Món phụ / Theo mùa)

     export interface RecipeVersion {
       id: string;
       productId: string;
       version: string;
       effectiveDate: string; // YYYY-MM-DD — Dùng để sort Mới nhất / Cũ nhất
       yieldQuantity: number;
       yieldUnit: string;
       status: "Đang áp dụng" | "Nháp" | "Lưu trữ";
       approvedBy: string;
       note: string;
       priority: RecipePriority; // Dùng để sort theo Priority (1 -> 3 hoặc 3 -> 1)
       targetType?: "product" | "f1_base";
       outputIngredientId?: string;
       lines: RecipeLine[];
       steps?: string[];
       changeHistory?: {
         changedAt: string;
         changedBy: string;
         fromIngredientId?: string;
         toIngredientId?: string;
         dispositionPolicy: "sell-through" | "discard-and-remake";
         affectedBatchIds: string[];
       }[];
     }
     ```
2. **File [RecipesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/RecipesPage.tsx)**:
   - **Bổ sung Bộ Sắp xếp (`sortBy`) chỉ rõ từng trường**:
     - `priority-asc` / `priority-desc`: Sort trên trường **`recipe.priority`**.
     - `name-asc` (`A → Z`) / `name-desc` (`Z → A`): Sort trên trường **`product.name`** (tra theo `recipe.productId`).
     - `newest` (`Mới nhất`) / `oldest` (`Cũ nhất`): Sort trên trường **`recipe.effectiveDate`**.
   - **Bổ sung Bộ lọc & Kiểm tra tất cả các món chứa 1 nguyên liệu (`ingredientFilterId` + `ingredientSearchQuery`)**:
     - Khi người dùng chọn hoặc gõ tên 1 nguyên liệu (VD: `"trà xanh"` hoặc `NL-003`), hệ thống quét toàn bộ `recipe.lines` (cả trực tiếp `F0` và gián tiếp qua `F1`), hiển thị **Banner liệt kê tất cả các món có chứa nguyên liệu đó** và tô sáng dòng nguyên liệu trong từng công thức.
   - **Xây dựng Công cụ "Thay thế nhanh nguyên liệu & Phân tích Tác động (`Quick Ingredient Replacement Modal`)"**:
     - Nút **`🔄 Thay thế nhanh nguyên liệu`** ngay trên thanh công cụ của `/production/recipes`:
       - **Bước 1**: Chọn **Nguyên liệu cần thay thế (A)** → Hệ thống lập tức kiểm tra và hiển thị danh sách tất cả các món đang chứa A (`Món X`, `Món Y`, `Món Z`).
       - **Bước 2**: Chọn **Nguyên liệu mới thay thế (B)** và định lượng thay thế.
       - **Bước 3 (Chọn phạm vi món áp dụng & Xem bảng phân tích ảnh hưởng)**:
         - Cho phép tích chọn chỉ thay trong **Món X** (giữ nguyên **Món Y, Z**) hoặc thay hàng loạt cho cả `X, Y, Z`.
         - Hiển thị rõ: Món nào được cập nhật công thức, món nào **không bị ảnh hưởng**, và cảnh báo nếu thay đổi ở cấp cốt nền `F1` dùng chung.
       - **Bước 4 (Chọn cách xử lý món X / mẻ cũ đã chuẩn bị)**:
         - Radio 1: **`Bán hết lô cũ còn hạn, áp dụng công thức mới cho mẻ tiếp theo (Không hủy bỏ)`**.
         - Radio 2: **`Hủy bỏ các mẻ/lô cũ đang tồn & Tạo lệnh làm lại ngay (Discard & Remake)`**.

---

### 2.3. Lô / Mẻ sản xuất (`/production/batches`)

#### 📌 Nguyên văn Feedback Giảng viên
> **/production/batches**
> - chưa thấy cách phân phối nguyên liệu, ko truy vết được

#### 🧠 Suy luận & Giải thích chi tiết từ Note
- **Vì sao giảng viên nhận xét *"chưa thấy cách phân phối nguyên liệu, không truy vết được"*?**
  - Khi kiểm tra [BatchesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/BatchesPage.tsx#L285-L388) và `BatchAllocation` trong [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L103-L120):
    1. Một mẻ sản xuất (`ProductionBatch`, ví dụ `ME-20261109-01`) hiện chỉ lưu: `recipeId`, `plannedQuantity`, `actualQuantity`, `status`, `lotCode` (`LOT-ME-01`), mà **không hề lưu danh sách các Lô nguyên liệu đầu vào (`inputLots`)** đã lấy từ kho nào, của nhà cung cấp nào để nấu ra mẻ đó!
    2. Ngược lại, sau khi mẻ sản xuất hoàn thành (`Hoàn thành`), nguyên liệu thành phẩm của mẻ đó được phân bổ đi các chi nhánh nào (`CN01` bao nhiêu, `CN05` bao nhiêu, `CN08` bao nhiêu), qua phiếu xuất/nhập nào, hiện còn tồn ở quầy chi nhánh bao nhiêu — **hoàn toàn không được hiển thị trên trang `/production/batches`** và cũng không có nút bấm để phân phối trực tiếp từ mẻ sản xuất!
- **Giải pháp — Xây dựng Chuỗi Truy Vết 2 Chiều (`End-to-End Batch Traceability & Distribution`)**:
  - Thiết lập chuỗi liên kết dữ liệu khép kín **5 mắt xích** hiển thị trực quan bằng sơ đồ luồng trên UI:
    `[1. Lô Nguyên liệu gốc F0 (NCC / PO)] -> [2. Mẻ sản xuất (Batch)] -> [3. Lô Bán thành phẩm F1 tại Kho Tổng] -> [4. Phiếu Phân phối về Chi nhánh (CN01, CN05, CN08)] -> [5. Lô tồn tại Quầy CN & Các đơn hàng/món đã tiêu thụ]`

#### 🛠️ Cần thay đổi cái gì & ở đâu?

1. **File [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts#L83-L120)**:
   - Mở rộng `ProductionBatch`:
     ```ts
     export interface BatchInputLotUsage {
       ingredientId: string;
       lotId: string;
       lotCode: string;
       supplierName: string;
       quantityUsed: number;
       unit: string;
     }

     export interface BatchBranchDistribution {
       id: string;
       storeId: string;
       allocatedQuantity: number;
       receivedQuantity: number;
       remainingAtCounter: number;
       unit: string;
       transferCode: string; // Liên kết tới phiếu xuất/chuyển kho (VD: "PXK-20261109-01")
       distributedAt: string;
       status: "Chờ xuất" | "Đang vận chuyển" | "Đã nhập quầy";
     }
     ```
   - Bổ sung `inputLotUsages?: BatchInputLotUsage[]`, `outputIngredientId?: string`, và `distributions?: BatchBranchDistribution[]` vào `ProductionBatch` (kèm dữ liệu seed đầy đủ cho `ME-20261109-01` và `ME-20261109-02`).
2. **File [BatchesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/BatchesPage.tsx)**:
   - **Trên bảng danh sách mẻ sản xuất (dòng 310–388)**:
     - Thêm cột **`Tiến độ Phân phối về Chi nhánh`**: Hiển thị thanh tiến độ `Đã phân phối: 160 / 196 ly (CN01: 70, CN05: 50, CN08: 40) · Còn tại Kho Tổng: 36`.
     - Thêm nút **`🚚 Phân phối về CN`** ngay trên dòng mẻ đã `"Hoàn thành"`: Cho phép chia nhanh số lượng từ mẻ này về các chi nhánh `CN01`, `CN05`, `CN08` (tự động tạo `BatchAllocation` và `ReceiptRecord` tương ứng).
     - Thêm nút **`🔍 Truy vết nguồn gốc & Phân phối (`Traceability`)`** mở **Drawer / Modal Sơ đồ Truy vết Lô Mẻ**:
       - **Chiều xuôi (Forward Trace - Từ mẻ đi tới đâu?)**: Mẻ `ME-20261109-01` (`LOT-ME-01`) -> Xuất cho `CN01` (`70 đơn vị`, phiếu `PN-20261108-09`, đã bán `52`, còn tồn quầy `18`), `CN05` (`50 đơn vị`), `CN08` (`40 đơn vị`).
       - **Chiều ngược (Backward Trace - Nguyên liệu lấy từ đâu?)**: Mẻ `ME-20261109-01` được nấu từ:
         - `Trà đen (NL-001)`: Lô `LOT-TD-1101` (`3.000 g`) — NCC: *Công ty Trà Việt* (PO-1024).
         - `Bột sữa béo (NL-002)`: Lô `LOT-BS-1102` (`5.000 g`) — NCC: *Thực phẩm Á Châu* (PO-1028).
         - `Siro đường (NL-004)`: Lô `LOT-SR-1101` (`4.000 ml`) — NCC: *Đường Biên Hòa*.

---

### 2.4. Kế hoạch sản xuất & Phân phối (`/production/planning` & `/distribution/planning`)

#### 📌 Nguyên văn Feedback Giảng viên
> **/production/planning**
> - cần có kế hoạch cố định ở kho tổng số cần chuẩn bị. Hôm báo thiếu thì thay đổi tăng cho ngày mai, hay cho nhiều ngày khác. 
> 	+ dự kiến thay đổi nhưng không thay đổi kết hoạch tổng 
> 	+ bổ sung thời lượng hiệu lực "lượng thêm"
>  Conclusion: thay đổi tạm thời có ảnh hưởng tới thay đổi cố định, và thay đổi trong tương lai hay không?. Và cái thay đổi tạm thời này kéo dài bao lâu. 
> Thanh Hương bình luận : có cách biến tạm thời thành cố định, với xem được lịch sử phân phối. 
> - tỉ lệ rõ ràng, công thức tính toán.
> - có thêm phân cấp nguyên liệu
> 	+ nguyên liệu f0 -> nguyên liệu f1 -> món. Ví dụ f0:{trà, sửa} -> f1:{cốt trà sửa}-> món:{trà sửa vị gì đó }
> 	+ nguyên liệu f0 -> món. Ví dụ f0{thạch} -> món{thạch chân châu siêu cấp hoả hạn}

#### 🧠 Suy luận & Giải đáp trọn vẹn bài toán Kế hoạch cố định vs Thay đổi tạm thời & Phân cấp F0/F1

##### 1. Lưu ý về Đường dẫn Route (`/production/planning` vs `/distribution/planning`)
- Hiện tại trong [AppRoutes.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/routes/AppRoutes.tsx#L121), trang lập kế hoạch đang đặt ở `/distribution/planning` ([DistributionPlanningPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/distribution/DistributionPlanningPage.tsx)). Giảng viên ghi trong note là `/production/planning`.
- **Cần làm**: Giữ `/distribution/planning` và **thêm route `/production/planning` trỏ tới cùng trang này** trong `AppRoutes.tsx` và `auth.ts` để dù giảng viên gõ URL nào cũng vào đúng trang!

##### 2. Trả lời câu hỏi Kết luận của Giảng viên & Bình luận của Thanh Hương:
> **Câu hỏi Conclusion**: *"Thay đổi tạm thời có ảnh hưởng tới thay đổi cố định, và thay đổi trong tương lai hay không? Và cái thay đổi tạm thời này kéo dài bao lâu?"*
> **Bình luận của Thanh Hương**: *"Có cách biến tạm thời thành cố định, với xem được lịch sử phân phối."*

**Mô hình Kiến trúc Kế hoạch 2 Lớp (`Two-Layer Planning Architecture: Master Fixed Plan + Temporary Delta Overrides`)**:

1. **Lớp 1 — Kế hoạch Cố định ở Kho Tổng (`Master Fixed Plan` / `BaseQuota`)**:
   - Là định mức chuẩn cần chuẩn bị mỗi ngày ở Kho Tổng cho từng chi nhánh, ví dụ:
     - `CN01`: Cố định `220 ly/ngày`
     - `CN05`: Cố định `180 ly/ngày`
     - `CN08`: Cố định `150 ly/ngày`
     - **Tổng Kế hoạch Cố định Kho Tổng (`Fixed Master Total`)**: `550 ly/ngày`.
2. **Lớp 2 — Điều chỉnh Tạm thời / Lượng thêm (`TemporaryPlanOverride`)**:
   - Khi hôm nay chi nhánh báo thiếu hàng hoặc ngày mai có sự kiện/khuyến mãi, quản lý tạo một **Bản ghi Lượng thêm Tạm thời (`TemporaryPlanOverride`)** với đầy đủ:
     - `deltaQuantity`: Lượng tăng/giảm thêm (ví dụ `+40 ly/ngày` hoặc `+1.200 g Cốt trà sữa`).
     - `effectiveStartDate` & `effectiveEndDate` (**Thời lượng hiệu lực của lượng thêm**, ví dụ: *Chỉ áp dụng cho Ngày mai (1 ngày)*, *Áp dụng trong 3 ngày (17/11 – 19/11)*, hoặc *Áp dụng 7 ngày*).
     - `reason`: Lý do báo thiếu / tăng đột biến.
3. **Trả lời trực tiếp 3 câu hỏi trong Conclusion của Giảng viên (Hiển thị rõ thành hộp Giải thích Quy tắc Nghiệp vụ ngay trên giao diện)**:
   - **Thay đổi tạm thời có ảnh hưởng tới Kế hoạch cố định không?**
     -> **KHÔNG**. Bản ghi Kế hoạch cố định gốc (`baseQuota`) được giữ nguyên bất biến (`immutable`) trừ khi quản lý chủ động bấm nút *"Biến tạm thời thành cố định"*. Cột `Kế hoạch cố định` và cột `Lượng thêm tạm thời` được hiển thị tách biệt trên giao diện để thấy rõ kế hoạch tổng cố định không bị sửa đổi.
   - **Thay đổi tạm thời kéo dài bao lâu?**
     -> Kéo dài **đúng bằng Thời lượng hiệu lực (`durationDays`: từ `effectiveStartDate` đến hết `effectiveEndDate`, kèm badge đếm ngược số ngày còn lại trên UI)**.
   - **Thay đổi tạm thời có ảnh hưởng tới tương lai không?**
     - **Trong khoảng thời gian hiệu lực (`effectiveStartDate` -> `effectiveEndDate`)**: Có cộng lượng thêm vào lệnh chuẩn bị kho của các ngày tương lai nằm trong khung hiệu lực đó.
     - **Sau khi hết thời lượng hiệu lực**: Bản ghi tạm thời tự động chuyển sang trạng thái `"Hết hiệu lực (Expired)"`, và kế hoạch các ngày tương lai sau ngày kết thúc **tự động quay về đúng mức Kế hoạch cố định gốc** mà không cần sửa tay!
4. **Đáp ứng yêu cầu của Thanh Hương**:
   - **Nút `"📌 Biến tạm thời thành cố định (Promote to Fixed Plan)"`**:
     - Khi một chi nhánh liên tục báo thiếu và lượng tăng thêm (ví dụ `+40 ly/ngày` cho `CN01`) trở thành nhu cầu thường xuyên lâu dài, quản lý bấm nút **`📌 Biến thành cố định`** trên dòng Lượng thêm tạm thời đó.
     - Hệ thống/Backend sẽ cập nhật trường `baseQuota` của kế hoạch cố định gốc (tăng từ `220` lên `260 ly/ngày`) và đóng bản ghi tạm thời với trạng thái `"Đã hợp nhất vào Kế hoạch cố định (Promoted)"`.
   - **Tab / Khu vực `"📜 Lịch sử Phân phối & Điều chỉnh Kế hoạch (Distribution & Override History)"`**:
     - Hiển thị bảng lịch sử đầy đủ theo ngày: Ngày phân phối · Chi nhánh · Định mức cố định · Lượng thêm tạm thời · Tổng thực xuất · Thực nhận tại CN · Trạng thái · Người duyệt · Phiếu kho liên kết.

##### 3. Hiển thị Tỷ lệ định mức & Thuyết minh quy đổi rõ ràng (`Explicit Ratios & Rule Description`)
- **Hiện trạng ([DistributionPlanningPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/distribution/DistributionPlanningPage.tsx#L118-L202))**:
  - Người dùng đang phải tự gõ tay cả `expectedCups` lẫn `needQuantity` mà không hiển thị tỷ lệ định mức chuẩn trên 1 đơn vị món hay thuyết minh số liệu từ Backend!
- **Giải pháp trên Frontend (Số liệu quy đổi do Backend tính sẵn, Frontend hiển thị minh bạch)**:
  - Trên bảng kế hoạch, hiển thị rõ các trường dữ liệu định mức do Backend/Store trả về:
    1. `ratioPerCupLabel`: Tỷ lệ định mức chuẩn trên mỗi ly (ví dụ: `150 ml Cốt trà sữa F1 / 1 ly`, `30 g Trân châu / 1 ly`).
    2. `f1ToF0RatioLabel`: Tỷ lệ cấu thành từ nguyên liệu gốc `F0` sang bán thành phẩm `F1` (ví dụ: `1.000 ml Cốt trà sữa F1 cần: 30g Trà đen F0 + 50g Bột sữa F0 + 40ml Đường F0`).
    3. `plannedTotalQuantity` & `netAllocationNeed`: Khối lượng cần chuẩn bị và lượng cần cấp thêm về chi nhánh (hiển thị kèm Pop-up thuyết minh thông số đầu vào gồm: Định mức cố định, Lượng thêm tạm thời, Tồn an toàn quầy, Tồn hiện tại ở quầy).

##### 4. Phân cấp nguyên liệu (`Ingredient Hierarchy: F0 -> F1 -> Món` vs `F0 -> Món`)
- **Hiện trạng**:
  - Trong [DistributionPlanningPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/distribution/DistributionPlanningPage.tsx#L39-L45) và [StockTransfersPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/inventory/StockTransfersPage.tsx#L82-L83), hệ thống chỉ hardcode một mảng `DIRECT_COUNTER_INGREDIENT_IDS = ["nl-003", "nl-005", "nl-006"]` chứ chưa định nghĩa mô hình phân cấp `F0` (Nguyên liệu gốc) và `F1` (Nguyên liệu sơ chế / Bán thành phẩm trung gian) trong `business-demo.ts`.
- **Chuẩn hóa Mô hình Phân cấp 2 luồng đúng như ví dụ của Giảng viên**:
  - **Luồng 1 (2 cấp - Qua sơ chế trung gian): `Nguyên liệu F0 -> Nguyên liệu F1 -> Món`**
    - **Ví dụ 1**:
      - **`F0` (Nguyên liệu thô từ NCC)**: `{Lá trà đen (NL-001): 30g, Bột sữa béo (NL-002): 50g, Nước đường (NL-004): 40ml}`
      - -> *(Nấu/Ủ tại Kho Tổng)* -> **`F1` (Bán thành phẩm nền)**: `{Cốt trà sữa truyền thống (NL-F1-001): 1.000 ml}`
      - -> *(Pha chế tại quầy)* -> **Món hoàn chỉnh**: `{Trà sữa truyền thống (180ml cốt F1), Trà sữa Hoàng Kim (160ml cốt F1 + 30g trân châu)}`
    - **Ví dụ 2**:
      - **`F0`**: `{Bột kem phô mai, Sữa tươi lạnh, Muối hồng}` -> **`F1`**: `{Kem Macchiato đánh sẵn (NL-F1-002)}` -> **Món**: `{Hồng trà kem cheese, Ô long kem cheese}`
  - **Luồng 2 (1 cấp - Trực tiếp từ nguyên liệu gốc lên món): `Nguyên liệu F0 -> Món`**
    - **Ví dụ đúng theo note giảng viên**:
      - **`F0` (Nguyên liệu ăn liền / đóng gói dùng thẳng)**: `{Thạch đào / Thạch dừa / Trân châu trắng ăn liền (NL-005)}`
      - -> *(Đong thẳng vào ly, không qua nấu F1)* -> **Món**: `{Trà đào thạch trân châu siêu cấp hoả hạn / Trà trái cây nhiệt đới}`

#### 🛠️ Cần thay đổi cái gì & ở đâu?

1. **File [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts)**:
   - Mở rộng `Ingredient`:
     ```ts
     export type IngredientTier = "F0" | "F1";
     export type IngredientFlowType = "F0_TO_F1_TO_DISH" | "F0_DIRECT_TO_DISH";

     export interface Ingredient {
       id: string;
       code: string;
       name: string;
       unit: string;
       minimum: number;
       branchMinimums?: Record<string, number>; // Ngưỡng ROP riêng cho từng chi nhánh
       avgDailyUsage?: number;
       leadTimeDays?: number;
       safetyStock?: number;
       storageNote: string;
       tier: IngredientTier; // "F0" (Nguyên liệu gốc) hoặc "F1" (Cốt bán thành phẩm)
       flowType: IngredientFlowType; // Qua F1 hay đi thẳng lên Món
       parentF0Composition?: { f0IngredientId: string; ratioPerUnit: number; unit: string }[]; // Nếu là F1, cấu thành từ những F0 nào
       isIgnoredInAlert?: boolean;
       ignoredReason?: string;
     }
     ```
   - Thêm các nguyên liệu `F1` tường minh vào `INITIAL_INGREDIENTS`:
     - `nl-f1-001` (`F1-001` - **Cốt trà sữa truyền thống** - Đơn vị `ml`, cấu thành từ `F0: Trà đen + Bột sữa béo + Siro đường`).
     - `nl-f1-002` (`F1-002` - **Cốt trà ô long ủ lạnh** - Đơn vị `ml`, cấu thành từ `F0: Trà ô long + Đường mía`).
     - `nl-f1-003` (`F1-003` - **Sốt Kem Cheese đánh sẵn** - Đơn vị `g`, cấu thành từ `F0: Kem béo thực vật + Sữa tươi`).
   - Thêm vào `DemoState` 2 mảng mới:
     - `masterFixedPlans: MasterBranchPlan[]` (Kế hoạch cố định ở Kho Tổng cho từng chi nhánh & nguyên liệu).
     - `temporaryPlanOverrides: TemporaryPlanOverride[]` (Lượng thêm tạm thời có `startDate`, `endDate`, `durationDays`, `status: "active" | "expired" | "promoted"`, `promotedAt`, `promotedBy`).
2. **File [DistributionPlanningPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/distribution/DistributionPlanningPage.tsx) (và alias `/production/planning` trong [AppRoutes.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/routes/AppRoutes.tsx#L121))**:
   - **Khu vực 1 — Sơ đồ Phân cấp Nguyên liệu & Định mức Tỷ lệ (`F0 -> F1 -> Món` vs `F0 -> Món`)**:
     - Hiển thị trực quan 2 luồng cây nguyên liệu kèm nhãn tỷ lệ định mức từ `1 ly món` -> `ml/g F1` -> `g/ml F0`.
   - **Khu vực 2 — Bảng Kế hoạch Cố định Kho Tổng vs Lượng thêm Tạm thời (`Fixed Master Plan + Temporary Override`)**:
     - Cột 1: Chi nhánh (`CN01`, `CN05`, `CN08`).
     - Cột 2: **Kế hoạch cố định (`Fixed Base Quota`)** — Không bị thay đổi khi báo thiếu đột xuất.
     - Cột 3: **Lượng thêm tạm thời đang hiệu lực (`Temp Extra Quota`)** + Badge **Thời lượng hiệu lực** (ví dụ: `Hiệu lực: 3 ngày (16/11 → 18/11) · Còn 2 ngày`).
     - Cột 4: **Tổng dự kiến chuẩn bị hôm nay (`Effective Plan`)** + Khối lượng `F1` và `F0` do Backend/Store trả về.
     - Cột 5: Nút **`➕ Báo thiếu / Thêm lượng tạm thời`** (nhập lượng thêm + số ngày hiệu lực, cam kết không sửa kế hoạch cố định) và nút **`📌 Biến tạm thời thành cố định`** (theo đúng góp ý của Thanh Hương).
   - **Khu vực 3 — Hộp Trả lời Kết luận Nghiệp vụ & Tab Lịch sử Phân phối**:
     - Hiển thị rõ quy tắc hiệu lực tạm thời và bảng **Lịch sử phân phối & biến động kế hoạch** theo thời gian.

---

### 2.5. Nguyên liệu Cửa hàng & Đối soát Ca (`/stores/ingredients` & `/stores/shift-reconciliation`)

#### 📌 Nguyên văn Feedback Giảng viên
> **/stores/ingredients**
> **/stores/shift-reconciliation**
> - đang thêm xóa sửa bớt thông tin? 
> - nếu chọn chi nhánh thì sẽ giới hạn input field là nhân viên thuộc chi nhánh nào. Quản lí chi nhánh chỉ thấy được những đối soát ở chỗ họ
> có nghĩa là mở đóng ca, thì chỉ nên quy định trong phạm vi CN để mở ca, do QN tổng không có mặt trực tiếp không thể quản lí được
> QN chỉnh là chỉ là đối xoát báo cáo, phân công nhân viên thuộc CN nào.

#### 🧠 Suy luận & Giải thích chi tiết từ Note

1. **Giải mã câu hỏi của Giảng viên: *"đang thêm xóa sửa bớt thông tin?"***
   - Trong [ShiftReconciliationPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/ShiftReconciliationPage.tsx#L285-L420):
     - Hiện tại trang Đối soát ca có nút `Tạo đối soát mới`, nút `Lưu điều chỉnh` (sửa trực tiếp `actualCash`, `countedStock` của các bản ghi đang chờ duyệt) nhưng **không rõ quy tắc lúc nào được Thêm/Sửa/Xóa và ai được quyền làm gì**.
     - Đặc biệt, một bản ghi đối soát đã `"approved"` (Đã phê duyệt chốt sổ) thì tuyệt đối **không được sửa/xóa trực tiếp** (phải khóa `readOnly`), còn bản ghi `"pending"` (Nháp / Chờ duyệt tại chi nhánh) thì Quản lý chi nhánh có thể bổ sung giải trình, sửa số đếm kiểm chứng hoặc xóa bản nháp tạo nhầm trước khi ký duyệt.
   - Tại [StoreIngredientsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/StoreIngredientsPage.tsx#L41-L265):
     - Trang hiện chỉ xem được 3 chi nhánh và tạo lệnh điều chỉnh tồn kho một chiều mà chưa lọc tự động theo `scopedBranch()` của Quản lý chi nhánh (`CN05`).

2. **Giới hạn Input Field Nhân viên theo đúng Chi nhánh đang chọn (`Branch-Scoped Staff Selectors`)**:
   - **Lỗi hiện tại ([ShiftReconciliationPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/ShiftReconciliationPage.tsx#L619-L653))**:
     - Trong Modal `"Tạo đối soát ca mới"`, 3 trường **`Thu ngân mở ca` (`formOpener`)**, **`Nhân viên kiểm đếm` (`formCounter`)**, và **`Quản lý phụ trách` (`formApprover`)** đang là **3 ô `<input type="text">` gõ tự do**!
     - Hệ quả: Khi chọn chi nhánh `CN05 - Hàng Xanh`, người dùng vẫn có thể gõ tên nhân viên của `CN01` hoặc gõ tên bất kỳ ai không tồn tại trong chi nhánh đó.
   - **Giải pháp**:
     - Tạo danh mục nhân sự theo từng chi nhánh (`BRANCH_STAFF_DIRECTORY` đồng bộ với [UsersPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/users/UsersPage.tsx#L26-L108)).
     - Thay cả 3 ô `<input type="text">` bằng `<select>` (hoặc Combobox) **chỉ liệt kê đúng nhân viên & quản lý thuộc chi nhánh đang chọn (`selectedBranch`)**! Khi đổi chi nhánh trên dropdown `Chi nhánh`, danh sách nhân viên trong 3 ô `Thu ngân mở ca`, `Nhân viên kiểm đếm`, `Quản lý đối soát` tự động lọc lại ngay lập tức.

3. **Quản lý chi nhánh chỉ thấy được những đối soát ở chỗ họ (`Strict Branch Isolation for Manager`)**:
   - **Lỗi hiện tại**:
     - Trong [auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts#L60-L67), `managerPages` đang thiếu `/stores/shift-reconciliation`.
     - Trong [ShiftReconciliationPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/ShiftReconciliationPage.tsx#L232-L280), trang không gọi `scopedBranch()`, nên ai vào cũng thấy toàn bộ đối soát của `CN01`, `CN02`, `CN03`, `CN05`.
   - **Giải pháp**:
     - Cấp quyền `/stores/shift-reconciliation` cho `manager` trong [auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts#L60-L67).
     - Gọi `const lockedBranch = scopedBranch();` trong cả `StoreIngredientsPage.tsx` và `ShiftReconciliationPage.tsx`.
     - Nếu đăng nhập là **Quản lý chi nhánh (`manager` - `CN05`)**: Khóa cứng bộ lọc chi nhánh về `CN05` (`branchFilter = "CN05"`), ẩn dữ liệu của các chi nhánh khác, để **Quản lý chi nhánh chỉ nhìn thấy và duyệt đối soát của đúng chi nhánh mình quản lý**.

4. **Phân định rạch ròi vai trò Mở/Đóng ca (Phạm vi Chi nhánh) vs Quản trị Tổng (`owner`)**:
   - Đúng như giảng viên phân tích cực kỳ sâu sắc:
     > *"Mở đóng ca thì chỉ nên quy định trong phạm vi CN để mở ca, do Quản lý tổng (Admin/Owner) không có mặt trực tiếp tại quầy nên không thể quản lý đếm tiền trực tiếp được. Quản lý tổng chỉ là đối soát báo cáo, phân công nhân viên thuộc CN nào."*
   - **Cập nhật Ma trận Phân quyền Nghiệp vụ Ca & Đối soát**:
     | Thao tác nghiệp vụ | Thu ngân (`cashier` - tại CN) | Quản lý Chi nhánh (`manager` - tại CN) | Quản trị Tổng (`owner` - Hội sở) |
     |---|---|---|---|
     | **Mở ca làm việc tại quầy (`/sales/shifts`)** | ✅ Được mở ca của CN mình | ✅ Được mở / giám sát tại CN mình | ❌ **Không mở ca trực tiếp** (Chỉ xem trạng thái & báo cáo ca toàn chuỗi) |
     | **Đếm tiền, kiểm kê & Gửi yêu cầu đóng ca (Bên 1)** | ✅ Thực hiện tại CN mình | ✅ Thực hiện nếu đứng ca | ❌ Không thực hiện (Không có mặt tại quầy) |
     | **Xác thực đóng ca 2 bên & Duyệt đối soát tại CN (Bên 2)** | ❌ Không tự duyệt 1 mình | ✅ **Xác thực & Phê duyệt tại CN mình** | ❌ Không ký đếm tiền tại quầy |
     | **Xem báo cáo đối soát toàn chuỗi & Hậu kiểm (`/stores/shift-reconciliation`)** | 👁️ Xem ca của mình | ✅ Quản lý & Duyệt trong phạm vi CN mình | ✅ **Xem báo cáo đối soát toàn chuỗi, xuất báo cáo & Phân công nhân sự về các CN** |
   - Thêm tính năng **"Phân công nhân viên thuộc Chi nhánh (`Branch Staff Assignment Modal`)"** dành riêng cho **Quản trị Tổng (`owner`)** ngay trên `/stores/shift-reconciliation` và `/users/list` để thể hiện rõ vai trò của Quản lý tổng!

---

### 2.6. Quản lý Chương trình Khuyến mãi (`/marketing/promotions` & `/marketing/branch-promotions`)

#### 📌 Nguyên văn Feedback Giảng viên
> **/marketing/promotions**
> - xem các ràng buộc có liên quan tới nhau hay? Hết khuyến mãi như thê nào? Hết thời gian hay giới hạn sử dụng hay ngân sách tối đa. 
> - mỖI KHUYẾN MÃI: TỔNG / SỐ LƯỢNG / TIỀN 
> Chủ yếu xem số nào sẽ có trước, số nào có sau để suy ra giới hạn
> thay vì ghi tiền, số, có thể ghi quy định: 100 người đến trước
> **/marketing/branch-promotions**
> - Quyền điều chỉnh các chương trình khuyến mãi chỉ có Admin (Quản lý tổng)

#### 🧠 Suy luận & Giải thích chi tiết từ Note

1. **Xem các ràng buộc có liên quan tới nhau hay không (`Promotion Constraints & Mutual Exclusivity / Stacking Rules`)**:
   - **Hiện trạng ([PromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PromotionsPage.tsx#L13-L35))**:
     - Mỗi `PromotionRecord` hiện là một bản ghi rời rạc, hoàn toàn không có thông tin:
       - Khuyến mãi này **có được áp dụng đồng thời (`stackable`)** với Chiết khấu Hạng thành viên (`2k / 5k / 5% / 10%`) hay không?
       - Khuyến mãi này **xung đột / loại trừ lẫn nhau (`mutuallyExclusiveWith`)** với mã khuyến mãi nào đang chạy cùng khung giờ và cùng nhóm sản phẩm?
       - **Thứ tự ưu tiên áp dụng (`priorityOrder`)**: Khi khách đủ điều kiện của cả 2 chương trình (ví dụ `HAPPYHOUR20` và `SINHNHAT50K`), hệ thống tự động chọn chương trình có lợi nhất cho khách hay áp dụng theo mức ưu tiên nào?
   - **Giải pháp**:
     - Bổ sung vào mỗi chương trình khuyến mãi khối **"Ràng buộc & Quan hệ tương tác (`Constraint & Stacking Matrix`)"**:
       - `stackWithMembership`: `"allow" | "disallow"` (Cộng dồn với ưu đãi hạng thẻ hay không).
       - `stackWithOtherPromos`: `"exclusive" | "stackable"` (Độc quyền 1 mã/đơn hay cho phép gộp).
       - `conflictPromoCodes`: Tự động phát hiện và hiển thị badge cảnh báo nếu có 2 chương trình cùng đang `"active"`, trùng thời gian và trùng nhóm món áp dụng (ví dụ: `⚠️ Trùng khung áp dụng với HAPPYHOUR20 — Quy tắc: Không cộng dồn, ưu tiên mã giảm cao hơn`).

2. **Hết khuyến mãi như thế nào? (`Termination Condition: Time vs Usage Count vs Max Budget`) & Hiển thị giới hạn nào chạm trước (`TỔNG / SỐ LƯỢNG / TIỀN — Which Limit Hits First?`)**:
   - **Giải thích bài toán của Giảng viên**:
     Một chương trình khuyến mãi trong thực tế thường bị chặn bởi **3 trần giới hạn đồng thời (`Triple-Cap Termination`)**:
     1. **Trần Thời gian (`Time Limit`)**: Từ `startDate` đến `endDate` (số ngày còn lại do hệ thống trả về).
     2. **Trần Số lượng lượt sử dụng (`Usage / Quota Limit` - SỐ LƯỢNG)**: Số lượt đã dùng `usageCount` trên tổng số lượt tối đa `usageLimit`.
     3. **Trần Ngân sách tối đa (`Budget Cap` - TIỀN / TỔNG)**: Số tiền giảm giá đã chi `budgetSpent` trên tổng ngân sách tối đa `budgetLimit`.
     - **Quy tắc kết thúc (`End Trigger Rule`)**: Chương trình sẽ **tự động kết thúc ngay khi BẤT KỲ giới hạn nào trong 3 giới hạn trên chạm ngưỡng `100%` trước**.
   - **Hiển thị dự báo "Số nào sẽ chạm giới hạn trước (`predictedBindingLimit`)" trên Frontend (Số liệu dự báo do Backend đánh giá và trả về)**:
     - Trong mỗi bản ghi `PromotionRecord`, Backend/Store trả về trường `predictedBindingLimit: "budget" | "usage" | "time"` cùng chuỗi thuyết minh `predictionNote`. Frontend hiển thị trực quan 3 thanh tiến độ (`Progress Bar`) cho **TỔNG NGÂN SÁCH / SỐ LƯỢNG LƯỢT / THỜI GIAN** kèm Badge kết luận:
       - Khi `predictedBindingLimit === "budget"`: Hiển thị badge **`🔥 Dự báo: Chạm trần NGÂN SÁCH TIỀN trước (sẽ hết ngân sách trước khi hết lượt và trước ngày kết thúc)`**.
       - Khi `predictedBindingLimit === "usage"`: Hiển thị badge **`⚡ Dự báo: Chạm trần SỐ LƯỢNG LƯỢT trước (sẽ hết lượt sử dụng trước khi hết ngân sách tiền)`**.
       - Khi `predictedBindingLimit === "time"`: Hiển thị badge **`🕒 Dự báo: Hết hạn theo THỜI GIAN trước (dự kiến còn dư ngân sách & số lượt)`**.

3. **Thay vì chỉ ghi Tiền, Số, có thể ghi Quy định tự nhiên như: `"100 người đến trước"` (`Natural Rule Presets / First-Come Rule`)**:
   - Trong form Tạo/Sửa khuyến mãi và trên bảng danh sách của [PromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PromotionsPage.tsx):
     - Thêm trường **`Quy định giới hạn hiển thị (`quotaRuleLabel` / `ruleMode`)`** với các mẫu chọn nhanh (Presets):
       - `🏃 100 người đến trước mỗi ngày (First-come, first-served)`
       - `🎁 50 khách hàng đầu tiên tại mỗi chi nhánh`
       - `⚡ Giới hạn 1 lượt / 1 SĐT hội viên trong suốt chương trình`
       - `💰 Tự động dừng ngay khi hết ngân sách 10.000.000 ₫ hoặc đủ 200 lượt (Tùy điều kiện nào đến trước)`
     - Trên bảng danh sách, hiển thị song song cả **Quy định bằng lời dễ hiểu (`"100 người đến trước"`)** lẫn **Bộ 3 chỉ số `TỔNG NGÂN SÁCH / SỐ LƯỢNG LƯỢT / TIỀN GIẢM ĐƠN`** kèm nhãn dự báo giới hạn nào hết trước!

4. **Phân quyền tại `/marketing/branch-promotions` ([BranchPromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/BranchPromotionsPage.tsx))**:
   - **Hiện trạng**:
     - Trong [BranchPromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/BranchPromotionsPage.tsx#L1-L340), hoàn toàn **không có kiểm tra quyền `can("promotion.manage")`** hay `getCurrentRole() === "owner"`. Bất kỳ ai vào trang cũng bấm bật/tắt khuyến mãi của các chi nhánh được.
     - Ngoài ra còn có **1 bug logic nghiêm trọng ở dòng 77–90 và 111–145**: Khi một chương trình có `branchMode === "exclude"` (tức là mảng `branches` chứa danh sách các chi nhánh **bị loại trừ**), hàm `isEnabledOnBranch` đang kiểm tra `promo.branches.includes(branchCode)` (biến chi nhánh bị loại trừ thành đang bật, và ngược lại khi bấm toggle lại thêm vào mảng `branches`!).
   - **Giải pháp**:
     - Sửa ngay hàm kiểm tra:
       ```ts
       function isPromoActiveAtBranch(promo: PromotionRecord, branchCode: string): boolean {
         if (promo.branchMode === "all") return true;
         if (promo.branchMode === "include") return promo.branches.includes(branchCode);
         if (promo.branchMode === "exclude") return !promo.branches.includes(branchCode);
         return false;
       }
       ```
     - **Khóa quyền điều chỉnh chỉ dành cho Admin chuỗi (`owner` / `can("promotion.manage")`)**:
       - Nếu người dùng là **Quản lý chi nhánh (`manager`)** hoặc **Thu ngân (`cashier`)**:
         - Chỉ hiển thị ở chế độ **Xem (`Read-only`)** (và với `manager` chỉ làm nổi bật dòng chi nhánh `CN05` của họ).
         - Các nút gạt Bật/Tắt toàn chi nhánh và ô tích ma trận được khóa `disabled` kèm banner thông báo rõ: **`🔒 Quyền điều chỉnh chương trình khuyến mãi thuộc về Quản trị chuỗi (Admin). Cửa hàng chỉ xem trạng thái áp dụng tại chi nhánh mình.`**


---

## PHẦN 3: PHÂN HỆ NHÀ CUNG CẤP & BÁO CÁO (`/suppliers`, `/reports/inventory-report`, `/reports/profit-loss`)

---

### 3.1. Nhà cung cấp (`/suppliers`) & Bộ lọc Chi nhánh cho Biểu đồ / Bảng

#### 📌 Nguyên văn Feedback Giảng viên
> **/suppliers**
> - Nhà cung cấp từ bao lâu
> - biểu đồ của phần suppliers, và reports: 
> 	+ Đối với admin: phải có filter chọn chi nhánh 
> 	+ Đối với quản lí: chỉ xem được của chính chi nhánh đó

#### 🧠 Suy luận & Giải thích chi tiết từ Note
1. **"Nhà cung cấp từ bao lâu (`Partnership Tenure / Partner Since`)" & Cụ thể các trường Sắp xếp (`Sort`) trên `/suppliers`**:
   - **Hiện trạng ([SuppliersPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/suppliers/SuppliersPage.tsx#L12-L95))**:
     - Interface `SupplierRecord` hiện chỉ có: `id`, `code`, `name`, `category`, `contactName`, `phone`, `email`, `leadTimeDays`, `onTimeRate`, `debt`, `totalPurchase`, `status`.
     - Hoàn toàn **không có ngày bắt đầu hợp tác (`partnerSince`)** hay nhãn thời gian gắn bó (`partnerTenureLabel`, ví dụ `3 năm 4 tháng` / `Từ 06/2023`), nên người quản lý không phân biệt được đâu là **Đối tác chiến lược lâu năm** và đâu là **Nhà cung cấp mới thử nghiệm**.
   - **Giải pháp**:
     - Bổ sung vào `SupplierRecord` trong [SuppliersPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/suppliers/SuppliersPage.tsx#L12-L26):
       - `partnerSince: string` (định dạng `YYYY-MM-DD`, ví dụ `"2022-03-15"`).
       - `partnerTenureLabel?: string` (chuỗi hiển thị thời gian hợp tác, ví dụ `"4 năm 8 tháng"`).
       - `suppliedBranches: string[]` (danh sách các chi nhánh mà nhà cung cấp này đang giao hàng, ví dụ `["CN01", "CN02", "CN05", "CN08"]`).
       - `branchPurchases: Record<string, { totalPurchase: number; debt: number; orderCount: number; onTimeRate: number }>` (số liệu nhập hàng & công nợ tách theo từng chi nhánh).
     - Hiển thị rõ trên bảng và trong Modal chi tiết NCC:
       - Ví dụ: **`4 năm 8 tháng`** *(Hợp tác từ 15/03/2022 · Đối tác chiến lược)* hoặc **`7 tháng`** *(Hợp tác từ 04/2026 · NCC mới)*.
     - **Bổ sung Bộ Sắp xếp (`sortBy`) nói rõ từng trường dữ liệu trên `/suppliers`**:
       - **Theo Tên nhà cung cấp (`A → Z` / `Z → A`)**: Sort trực tiếp trên trường **`supplier.name`** (sử dụng `localeCompare("vi")`).
       - **Theo Ngày bắt đầu hợp tác (`Mới nhất` / `Cũ nhất` - Hợp tác lâu năm nhất)**: Sort trực tiếp trên trường **`supplier.partnerSince`** (`YYYY-MM-DD`: `Cũ nhất / Hợp tác lâu năm nhất` xếp `"2021-05-10"` lên đầu; `Mới nhất` xếp `"2026-04-12"` lên đầu).

2. **Bộ lọc Chi nhánh cho Biểu đồ & Bảng ở `/suppliers` và tất cả các trang `/reports/*` (Phân quyền Admin vs Quản lý chi nhánh)**:
   - **Hiện trạng**:
     - Tại [SuppliersPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/suppliers/SuppliersPage.tsx): Không có bộ lọc chi nhánh, không gọi `scopedBranch()`, chưa có biểu đồ phân tích giá trị mua hàng & tỷ lệ giao đúng hạn theo chi nhánh.
     - Tại [SalesReportPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/SalesReportPage.tsx#L96-L155): Có state `branch` nhưng **không gọi `scopedBranch()`**, nên Quản lý chi nhánh (`CN05`) vẫn chọn xem được `CN01`, `CN02`, `CN03`, và dữ liệu biểu đồ doanh thu chỉ đang nhân với một hệ số giả lập (`branchMultiplier`) mà chưa khóa theo quyền.
     - Tại [InventoryReportPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/InventoryReportPage.tsx#L80-L120): Gọi `scopedBranch()` nhưng khi Admin (`owner`) chọn `"Tất cả điểm kho"` thì biểu đồ cơ cấu tồn kho vẫn chưa cho phép so sánh tách bạch từng chi nhánh.
     - Tại [ProfitLossPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/ProfitLossPage.tsx#L198-L215): **Không gọi `scopedBranch()`**! Khi đăng nhập bằng tài khoản Quản lý chi nhánh (`manager` - `CN05`), họ vẫn nhìn thấy toàn bộ lãi lỗ của 12 chi nhánh (`CN01..CN12`) thay vì chỉ xem được của chính `CN05`!
   - **Giải pháp đồng bộ trên cả 4 trang (`SuppliersPage.tsx`, `SalesReportPage.tsx`, `InventoryReportPage.tsx`, `ProfitLossPage.tsx`)**:
     - Gọi `const lockedBranch = scopedBranch();` (`null` nếu là `owner`/`warehouse`, `"CN05"` nếu là `manager`, `"CN01"` nếu là `cashier`).
     - **Nếu là Admin (`owner`, `lockedBranch === null`)**:
       - Hiển thị **Dropdown chọn Chi nhánh (`Tất cả chi nhánh toàn chuỗi` | `CN01` | `CN02` | ... | `CN12`)** ngay trên thanh công cụ và trên tiêu đề Biểu đồ. Khi Admin đổi chi nhánh, cả KPI Cards, Biểu đồ và Bảng chi tiết đều lọc và vẽ lại theo đúng chi nhánh đó.
     - **Nếu là Quản lý chi nhánh (`manager`, `lockedBranch === "CN05"`)**:
       - Khóa cứng `selectedBranch = "CN05"`, ẩn tùy chọn `"Tất cả chi nhánh"` và các chi nhánh khác, hiển thị badge **`📍 Phạm vi báo cáo: CN05 - Hàng Xanh (Chi nhánh của bạn)`**. Toàn bộ biểu đồ và bảng trong `/suppliers` và `/reports/*` chỉ hiển thị dữ liệu của đúng `CN05`.

---

### 3.2. Báo cáo Tồn kho (`/reports/inventory-report`)

#### 📌 Nguyên văn Feedback Giảng viên
> **/reports/inventory-report**
> - cái bảng màu vàng quá GỚM!

#### 🧠 Suy luận & Chỉ điểm chính xác đoạn code gây ra "Bảng màu vàng quá gớm"
- Khi kiểm tra [InventoryReportPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/InventoryReportPage.tsx#L135-L213), nguyên nhân nằm chính xác ở **dòng 137 đến dòng 186**:
  1. **Dòng 137**: Toàn bộ khối `<div className="card mb-6 overflow-hidden border-2 border-amber-300 dark:border-amber-700/60">` dùng viền dày `border-2 border-amber-300` bao quanh cả bảng lớn.
  2. **Dòng 138**: Thanh tiêu đề bảng `<div className="bg-amber-500/10 px-5 py-3.5 flex items-center justify-between flex-wrap gap-2 border-b border-amber-200 dark:border-amber-800/40">` phủ một lớp nền vàng đục `bg-amber-500/10` + viền vàng `border-amber-200` + chấm tròn nhấp nháy `animate-pulse` màu đỏ + chữ nâu vàng `text-amber-900`.
  3. **Dòng 163**: Từng dòng `<tr>` bên trong bảng lại bị tô đè màu nền đỏ/vàng (`bg-red-50/50` và `bg-amber-50/30`), khi kết hợp với khung viền vàng bên ngoài tạo thành một mảng màu vàng-đỏ lòe loẹt, chói mắt và thiếu chuyên nghiệp đúng như giảng viên nhận xét (*"cái bảng màu vàng quá GỚM!"*).

#### 🛠️ Cần thay đổi cái gì & ở đâu?
- **Tại [InventoryReportPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/InventoryReportPage.tsx#L135-L213)**:
  1. **Thay thế khung ngoài (dòng 137)**:
     - Bỏ `border-2 border-amber-300 dark:border-amber-700/60`.
     - Dùng chuẩn `.card` trung tính giống các bảng khác trong hệ thống: `className="card mb-6 overflow-hidden border border-gray-200/80 dark:border-gray-800 shadow-sm"`.
  2. **Thay thế Header của bảng (dòng 138–150)**:
     - Bỏ `bg-amber-500/10 border-b border-amber-200` và bỏ chấm `animate-pulse`.
     - Dùng nền trắng/xám rất nhẹ tinh tế: `className="bg-white dark:bg-gray-900 px-5 py-4 flex items-center justify-between flex-wrap gap-3 border-b border-gray-100 dark:border-gray-800"`.
     - Tiêu đề dùng màu chữ chuẩn `text-gray-900 dark:text-white font-semibold`, đi kèm 1 pill badge nhỏ gọn tinh tế ở bên phải (`bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-medium px-2.5 py-1 rounded-full`).
  3. **Thay thế màu dòng `<tr>` (dòng 163)**:
     - Bỏ toàn bộ `bg-red-50/50` và `bg-amber-50/30` phủ kín cả dòng `<tr>`.
     - Giữ nền dòng trắng sạch sẽ (`hover:bg-gray-50/80 dark:hover:bg-gray-800/40`), chỉ thể hiện mức độ cảnh báo thông qua **Status Pill nhỏ gọn** ở cột `Tình trạng` (`Hết hạn`, `Cận hạn`, `Dưới ngưỡng`) và thanh tiến độ tồn kho nhỏ!

---

### 3.3. Báo cáo Lãi & Lỗ (`/reports/profit-loss`)

#### 📌 Nguyên văn Feedback Giảng viên
> **/reports/profit-loss**
> - đỏ lòm gớm 
> - cân bằng thu chi: (doanh thu - chi phí) * (1 - thuế). xem lại công thức tính toán 
> - coi được kết quả của đợt khuyến mãi.

#### 🧠 Suy luận & Giải thích chi tiết từng ý từ Note

##### Ý 1: Sửa ngay giao diện "Đỏ lòm gớm" tại `/reports/profit-loss`
- **Chỉ điểm chính xác các dòng code đang làm trang `/reports/profit-loss` bị "đỏ lòm" ([ProfitLossPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/ProfitLossPage.tsx))**:
  1. **Dòng 219–225 (Thẻ KPI Giá vốn hàng bán - COGS)**:
     - Đang truyền `tone="danger"` cho thẻ `GIÁ VỐN HÀNG BÁN (COGS)` khiến con số `1.298.800.000 ₫` và icon bị tô đỏ rực như thể đang bị lỗi/lỗ, trong khi Giá vốn hàng bán là một chỉ tiêu tài chính bình thường! -> **Đổi sang `tone="amber"` hoặc `tone="info"` trung tính**.
  2. **Dòng 263–296 (Khối cảnh báo chi nhánh lỗ CN11 & CN12)**:
     - Đang dùng `<div className="card mb-6 overflow-hidden border-2 border-red-300 dark:border-red-700/70 bg-red-50/40 dark:bg-red-950/20">`, cộng thêm header `bg-red-500/10 border-b border-red-200`, bên trong lại có các thẻ con `border-red-200 bg-white` với hàng loạt chữ `text-red-700`, `text-red-600`, `bg-red-100` tạo thành một mảng đỏ chói chiếm nửa màn hình!
     - **Cách sửa**: Chuyển sang thiết kế **Executive Financial Insight Card** nền trắng (`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-l-4 border-l-rose-500`), tiêu đề màu `text-gray-900`, các thẻ chi nhánh dùng nền `bg-gray-50/70 border border-gray-200/80`, chỉ giữ màu đỏ trầm (`text-rose-600`) duy nhất ở con số âm `-19.000.000 ₫` và `-13.500.000 ₫`.
  3. **Dòng 356, 377, 383, 390, 405 (Trong bảng P&L chi tiết)**:
     - Dòng `<tr>` của chi nhánh lỗ đang bị tô kín nền `bg-red-50/60 dark:bg-red-950/25`, cột Giá vốn và cột Chi phí vận hành của **tất cả 12 chi nhánh** đều bị tô chữ đỏ `text-red-600` (dòng 377 & 383), làm cả bảng 12 dòng nhìn đâu cũng thấy chữ đỏ!
     - **Cách sửa**:
       - Cột `Giá vốn (COGS)` và `Chi phí vận hành (OPEX)` phải dùng màu chữ tài chính chuẩn **`text-slate-700 dark:text-slate-300`** (không tô đỏ).
       - Bỏ nền `bg-red-50/60` phủ toàn dòng `<tr>`. Chỉ tô màu xanh (`text-emerald-600`) cho số Lãi dương và màu đỏ trầm (`text-rose-600`) cho số Lỗ âm ở cột `Lợi nhuận ròng sau thuế`.

##### Ý 2: Hiển thị cấu trúc Cân bằng thu chi & Lợi nhuận sau thuế (`(Doanh thu - Chi phí) * (1 - Thuế)`) từ dữ liệu Backend
- **Phân tích thiếu sót hiển thị trong code hiện tại ([ProfitLossPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/ProfitLossPage.tsx#L21-L196))**:
  1. Trong `ProfitLossRow` hiện tại, bảng chỉ hiển thị `revenue`, `cogs`, `opex`, và `netProfit` mà **chưa có cột hiển thị Tổng Chi phí, Lợi nhuận trước thuế, Thuế TNDN, và Lợi nhuận ròng sau thuế theo quy tắc `(Doanh thu - Chi phí) * (1 - Thuế)`**.
  2. Cột `breakEven` (`Điểm hòa vốn`) chưa có Pop-up/Tooltip giải thích ý nghĩa chỉ tiêu từ Backend.
- **Giải pháp trên Frontend (Mọi phép tính tài chính do Backend xử lý, Frontend chỉ hiển thị các trường dữ liệu trả về và nhãn quy tắc)**:
  - Mở rộng `ProfitLossRow` nhận từ Backend/Store để hiển thị đầy đủ các cột:
    1. `revenue`: Doanh thu thuần.
    2. `totalCost`: Tổng chi phí (gồm `cogs` Giá vốn + `opex` Chi phí vận hành + `promoCost` Chi phí khuyến mãi).
    3. `preTaxProfit`: Chênh lệch Thu - Chi trước thuế (`Doanh thu - Chi phí`).
    4. `taxRate` & `taxAmount`: Thuế suất và Tiền thuế TNDN.
    5. `afterTaxProfit`: Lợi nhuận ròng sau thuế (hiển thị kèm nhãn quy tắc thuyết minh trên Header bảng: `Quy tắc: (Doanh thu - Chi phí) * (1 - Thuế)`).
    6. `breakEven`: Doanh thu điểm hòa vốn (kèm Hover Tooltip hiển thị chuỗi giải thích `breakEvenNote` do Backend trả về).

##### Ý 3: Coi được kết quả của đợt khuyến mãi (`Promotion Campaign Effectiveness Section`)
- **Hiện trạng**: Trên trang `/reports/profit-loss`, người quản lý thấy doanh thu và lợi nhuận nhưng **không xem được kết quả của các đợt khuyến mãi đang chạy (`HAPPYHOUR20`, `WELCOME10`, `BUY2GET1`, `VIPFREEUP`...) mang lại bao nhiêu đơn hàng, bao nhiêu doanh thu, tốn bao nhiêu ngân sách giảm giá và đạt hiệu quả ra sao**.
- **Giải pháp**:
  - Bổ sung khu vực **"Báo cáo Kết quả Tài chính các Đợt Khuyến mãi (`Promotion Campaign Results`)"** ngay trên `/reports/profit-loss` (hiển thị dữ liệu tổng hợp từ Backend/Store):
    - Với mỗi chiến dịch khuyến mãi, hiển thị các cột dữ liệu:
      1. **Mã & Tên đợt khuyến mãi** (VD: `HAPPYHOUR20 - Giờ vàng giảm 20% trà trái cây`).
      2. **Thời gian & Phạm vi chi nhánh** (lọc theo chi nhánh đang chọn).
      3. **Số đơn áp dụng / Lượt dùng (`redemptionCount`)**.
      4. **Doanh thu từ đơn có KM (`campaignRevenue`)**.
      5. **Tổng chi phí giảm giá đã cấp (`discountCost`)**.
      6. **Giá vốn nguyên liệu các đơn KM (`campaignCogs`)**.
      7. **Lợi nhuận ròng sau thuế của đợt KM (`netCampaignProfit`)** (số liệu do Backend trả về).
      8. **Đánh giá kết quả (`effectivenessLabel`)**: Hiển thị Badge đánh giá trực quan (VD: `Hiệu quả cao · Lãi ròng +28.4tr` hoặc `Cần tối ưu ngân sách`).

---

## PHẦN 4: PHÂN HỆ KHÁCH HÀNG (`# Khách hàng`)

#### 📌 Nguyên văn Feedback Giảng viên
> **# Khách hàng**
> - chọn chi nhánh gần tôi
> - CÓ MUỐN đăng nhập và lưu thông tin hay ko
> - tra cứu không cần otp làm gì

#### 🧠 Suy luận & Giải thích chi tiết từ Note

1. **Phân tích hiện trạng dự án đối với phân hệ Khách hàng**:
   - Khi kiểm tra [AppRoutes.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/routes/AppRoutes.tsx#L87-L163) và [auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts#L50-L95):
     - Hiện tại **100% các trang trong ứng dụng đều là trang quản trị nội bộ** (bị chặn bởi `if (!session) return <Navigate to="/login" replace />` ở dòng 99 của `AppRoutes.tsx`).
     - Chưa có trang **Cổng Khách hàng (`Customer Portal / Đặt món & Tra cứu đơn hàng trực tuyến`)**, hoặc khi khách/giảng viên muốn trải nghiệm góc nhìn Khách hàng thì bị ép phải đăng nhập vào hệ thống ERP.
   - Do đó, để đáp ứng trọn vẹn và xuất sắc 3 gạch đầu dòng trong mục `# Khách hàng` của giảng viên, chúng ta cần xây dựng **Phân hệ Khách hàng (`/customer` hoặc `/order` & `/lookup`)** có thể truy cập trực tiếp từ màn hình `/login` (nút `"Dành cho Khách hàng: Đặt món & Tra cứu đơn nhanh"` không bắt buộc đăng nhập) VÀ tích hợp lối tắt ngay trên thanh Header để giảng viên bấm kiểm tra chỉ với 1 cú click!

2. **Chi tiết 3 tính năng cốt lõi của Phân hệ Khách hàng**:

   - **Tính năng 1: Chọn chi nhánh gần tôi (`Nearest Branch Selector`)**:
     - Bổ sung thông tin khu vực (`district`) và khoảng cách/thời gian ước tính (`distanceKm`, `estimatedMinutes` do Backend trả về dựa trên vị trí khách chọn) cho các chi nhánh trong danh mục:
       - `CN01 - Nguyễn Huệ (Quận 1)`
       - `CN02 - Thảo Điền (TP. Thủ Đức)`
       - `CN03 - Phú Mỹ Hưng (Quận 7)`
       - `CN05 - Hàng Xanh (Bình Thạnh)`
       - `CN08 - Cầu Giấy (Hà Nội)`
       - `CN10 - Hải Châu (Đà Nẵng)`
     - Cung cấp nút **`📍 Chọn chi nhánh gần tôi`** + bộ chọn nhanh **Khu vực hiện tại của bạn** (ví dụ: *Đang ở Quận 1*, *Đang ở Bình Thạnh*, *Đang ở Thủ Đức*, *Đang ở Quận 7*, *Đang ở Hà Nội* hoặc lấy vị trí trình duyệt gửi lên hệ thống).
     - Frontend nhận danh sách chi nhánh kèm `distanceKm` và `estimatedMinutes` từ dữ liệu trả về, sắp xếp danh sách chi nhánh theo thứ tự từ **Gần nhất -> Xa nhất** (`sort` tăng dần theo trường `distanceKm`), gắn nhãn **`🎯 Gần bạn nhất (Cách 0.8 km · ~4 phút)`**, và chỉ hiển thị các món đang mở bán tại đúng chi nhánh khách đã chọn!

   - **Tính năng 2: Tùy chọn "CÓ MUỐN đăng nhập và lưu thông tin hay không?" (`Optional Login & Save Info Consent`)**:
     - Giải thích ý giảng viên: Khách hàng mua trà sữa cần sự nhanh gọn. Không được ép khách phải đăng ký/đăng nhập tài khoản mới cho đặt món hoặc tra cứu, nhưng cũng phải hỏi rõ xem khách **có muốn đăng nhập hội viên (để hưởng giảm giá 2k / 5k / 5% / 10% & tích điểm) và có muốn lưu thông tin (Họ tên, SĐT, Địa chỉ nhận hàng, Chi nhánh yêu thích) cho lần sau hay không**.
     - Thiết kế trên giao diện Khách hàng:
       1. **Bộ chọn chế độ mua hàng rõ ràng (`Identity Choice Banner`)**:
          - **Lựa chọn A — `Khách vãng lai (Mua nhanh không cần đăng nhập)`**: Khách chỉ cần nhập Tên + SĐT nhận nước. Bên dưới có checkbox rõ ràng:
            - `[ ] Lưu thông tin nhận hàng & chi nhánh yêu thích trên thiết bị này cho lần đặt sau` (Chỉ khi khách tích đồng ý mới lưu vào `localStorage["milktyway_customer_saved_profile_v1"]`; nếu không tích thì xóa ngay sau khi hoàn tất đơn, kèm nút `"Xóa thông tin đã lưu"`).
          - **Lựa chọn B — `Đăng nhập / Nhận diện Hội viên (Nhận ưu đãi Hạng thẻ & Tích điểm)`**: Khách nhập SĐT hội viên (ví dụ `0903123456` - Nguyễn An - VIP giảm 10%) và chọn `[✓] Ghi nhớ phiên hội viên của tôi`.

   - **Tính năng 3: Tra cứu Đơn hàng & Tích điểm KHÔNG CẦN OTP (`Instant Order & Loyalty Lookup Without OTP`)**:
     - Giải thích ý giảng viên (*"tra cứu không cần otp làm gì"*):
       - Việc tra cứu trạng thái một ly trà sữa (`Đang chờ pha` -> `Đang pha chế` -> `Sẵn sàng nhận nước`) hoặc tra cứu hạng thành viên / lịch sử hóa đơn bằng **Mã đơn hàng (`DH-00125`)**, **Mã hóa đơn (`HD-CN01-003814`)** hoặc **Số điện thoại (`0903123456`)** là thao tác tra cứu nhanh (`Read-only`), không phải giao dịch rút tiền ngân hàng. Bắt khách nhập mã OTP SMS khi tra cứu đơn hàng là rườm rà, vô lý và làm đứt gãy trải nghiệm!
       - *(Đồng thời kiểm tra [ForgotPasswordPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/auth/ForgotPasswordPage.tsx#L19-L26) để loại bỏ thông báo giả lập gửi OTP rườm rà).*
     - Thiết kế **Khu vực Tra cứu Nhanh Không Cần OTP (`Instant Lookup — No OTP Required`)**:
       - Khách chỉ cần nhập **Mã đơn hàng (`DH-00125`)** HOẶC **Số điện thoại (`0903123456`)** và bấm **`🔍 Tra cứu ngay (Không cần OTP)`**:
         - Hiển thị tức thì tiến trình đơn hàng thời gian thực (`Đã tiếp nhận` -> `Đang pha chế` -> `Sẵn sàng tại quầy CN01`).
         - Hiển thị chi tiết các món đã đặt, mức đá/đường, chi nhánh nhận nước, số tiền đã thanh toán và hạng thẻ thành viên (che bớt một phần thông tin nhạy cảm nếu tra bằng mã đơn công khai, ví dụ `0903***456`).
         - Khi khách đặt đơn mới trên trang `/customer`, đơn hàng được đẩy trực tiếp vào `sales-orders-store.ts` (`channel: "online"`) để **xuất hiện ngay lập tức trên màn hình Hàng đợi pha chế (`/sales/preparation`) và Danh sách đơn hàng (`/sales/orders`)**!

---

## PHẦN 5: TỔNG HỢP SUY LUẬN MỞ RỘNG & BẢNG CHECKLIST THAY ĐỔI THEO TỪNG FILE

### 5.1. Các suy luận mở rộng (Extended Improvements) giúp đồ án hoàn hảo khi vấn đáp

1. **Liên thông toàn trình (`End-to-End Live Data Flow`) giữa 6 phân hệ**:
   - `Khách hàng đặt đơn tại /customer (Chọn CN gần nhất)` HOẶC `Thu ngân bấm thanh toán tại /sales/pos`
   - -> Đơn hàng lưu vào `milktyway_sales_orders_v1` (có đầy đủ `productId`, `sku`, `branchCode`, `shiftId`, `memberDiscount`, `promoCode`)
   - -> Xuất hiện tức thì tại `/sales/preparation` kèm **Công thức chế biến chi tiết**
   - -> Nếu khách khiếu nại tại `/sales/returns`: Tìm theo mã đơn, chọn **1 món hoặc cả đơn**, **hiển thị tiền hoàn tự động (`readOnly`)**, và **ghi đè lịch sử điều chỉnh vào đơn gốc (`amend-original`)** hoặc **tạo đơn mới (`new-order`)**
   - -> Cuối ca tại `/sales/shifts`: Kiểm kê theo **Rule kiểm kê**, bắt buộc giải trình nếu **Người mở ca khác Người đóng ca**, thực hiện **Xác thực 2 bên (Thu ngân bàn giao + Quản lý/Ca trưởng xác nhận)**
   - -> Đẩy biên bản sang `/stores/shift-reconciliation` (Quản lý chi nhánh chỉ thấy và duyệt chi nhánh mình; Admin chuỗi xem báo cáo tổng và phân công nhân sự).

2. **Bổ sung thanh chuyển đổi nhanh Vai trò & Góc nhìn (`Quick Role & Portal Switcher`) khi Demo bảo vệ đồ án**:
   - Giữ thanh chuyển role nhanh (`Quản trị chuỗi` | `Quản lý CN05` | `Thủ kho` | `Thu ngân CN01`) và thêm nút mở nhanh **`🧋 Cổng Khách hàng (/customer)`** để nhóm có thể trình diễn mượt mà tất cả các yêu cầu trong bảng feedback của giảng viên chỉ trong vài giây.

---

### 5.2. Danh mục File cần chỉnh sửa / tạo mới (Implementation File Map)

| STT | File Path | Mục Feedback giải quyết | Thay đổi cốt lõi |
|---|---|---|---|
| 1 | [auth.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/utils/auth.ts) | Phân quyền Nhân viên, Quản lý CN, Admin chuỗi, Khách hàng | Thêm `/stores/shift-reconciliation`, `/production/planning` vào `managerPages`; thêm `/marketing/promotions` (read-only) vào `cashierPages`; thêm public route `/customer`; phân tách quyền Mở/Đóng ca (chỉ tại CN) vs Xem đối soát/Phân công nhân sự (Admin). |
| 2 | [AppRoutes.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/routes/AppRoutes.tsx) | Route `/production/planning` & `/customer` | Thêm route `/production/planning` trỏ về `DistributionPlanningPage`; thêm public route `/customer` (`CustomerPortalPage.tsx`) không bị chặn bởi login redirect. |
| 3 | [business-demo.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/business-demo.ts) | Kho SP, Công thức, Lô mẻ, Kế hoạch sản xuất, Ngưỡng NL | Chuẩn hóa hạn sử dụng động; thêm `priority`, `effectiveDate`, `steps` vào `RecipeVersion`; thêm `tier: "F0" \| "F1"`, `flowType`, `parentF0Composition`, `branchMinimums`, `isIgnoredInAlert` vào `Ingredient`; thêm `inputLotUsages` & `distributions` vào `ProductionBatch`; thêm `masterFixedPlans` & `temporaryPlanOverrides`. |
| 4 | [products.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/data/sales/products.ts) | POS Hot Sale, Kho SP theo CN, Công thức pha chế | Thêm `isHotSale`, `hotRank`, `soldToday`, `availableBranches`, `recipeLines`, `prepSteps` cho toàn bộ 12 sản phẩm POS. |
| 5 | [ProductsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/inventory/ProductsPage.tsx) | `# Nhân viên` -> `kho hang/ sản phẩm` | Lọc sản phẩm theo chi nhánh (`scopedBranch()` + selector cho Admin); kiểm tra tất cả các món chứa 1 nguyên liệu được tìm kiếm; thêm bộ nút Sắp xếp nói rõ trường (`product.name` A->Z/Z->A, `product.code` A->Z/Z->A, `product.createdAt` Mới nhất/Cũ nhất). |
| 6 | [PosTerminalPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PosTerminalPage.tsx) & [PosCart.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/sales/PosCart.tsx) | `# Nhân viên` -> `bán hang/ điểm bán hang (POS)` | Gắn tag `🔥 HOT SALE` trên menu; gộp Tùy chỉnh món + Giỏ hàng + Hội viên vào **1 Recycle View chung** và ghim cố định các nút chức năng chốt đơn ở đáy cột phải; thêm chế độ **Ẩn Sidebar (POS Focus Mode)**; thêm 5 phím tắt thiết yếu (`/`, `` ` ``/`~`, `Alt+D`, `Alt+H`, `Ctrl+Enter`). |
| 7 | [MainLayout.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/layouts/MainLayout.tsx) & [Header.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/components/shared/Header.tsx) | Ẩn Sidebar trên Desktop cho người bán hàng | Hỗ trợ state `desktopSidebarHidden` để ẩn hoàn toàn sidebar `256px` trên desktop và hiển thị nút bật/tắt nhanh trên Header. |
| 8 | [ShiftsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/ShiftsPage.tsx) | `# Nhân viên` -> Đóng ca, Kiểm kê, Xác thực 2 bên | Cho phép Thu ngân mở ca tại CN mình; cảnh báo & bắt buộc nhập lý do khi `Người mở ca !== Người đóng ca`; áp dụng **Rule kiểm kê**; bắt buộc **Chốt ca = Xác thực 2 bên (Thu ngân giao + Quản lý/Ca trưởng nhận)**. |
| 9 | [PreparationQueuePage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PreparationQueuePage.tsx) | `# Nhân viên` -> `sale/preparation` | Thu gọn bố cục thông tin (gom nhóm các ly giống nhau, thanh lọc 1 dòng); hiển thị **Công thức chế biến chi tiết** cho từng món. |
| 10 | [SalesReturnsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/SalesReturnsPage.tsx) & [sales-orders-store.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/sales-orders-store.ts) | `# Nhân viên` -> `sale/returns` | Thêm thanh search đơn cần xử lý theo Mã đơn/SĐT; chọn đổi/hoàn **1 món hoặc toàn bộ đơn**; **hiển thị chi phí hoàn tự động (`readOnly`, khóa gõ tay)**; hỗ trợ **Ghi lại thay đổi vào đơn gốc (Ưu tiên)** và **Ghi lại thành đơn mới hoàn toàn**. |
| 11 | [DashboardPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/DashboardPage.tsx) & [stock-summary.ts](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/shared/stock-summary.ts) | `# Quản lí` -> `/dashboard` | Bộ chọn **Đơn vị thời gian** (`Giờ / Ngày / Tuần / Tháng / Quý`); biểu đồ **Lượng khách theo từng chi nhánh & thời gian**; **Hover Tooltip & Pop-up** thuyết minh; xem **thuyết minh ngưỡng ROP** và nút **Khóa/Bỏ qua nguyên liệu ngưng dùng** để lọc cảnh báo thừa; xem thông tin theo từng chi nhánh. |
| 12 | [RecipesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/RecipesPage.tsx) | `# Quản lí` -> `/production/recipes` | Sắp xếp theo `recipe.priority` (Cao->Thấp / Thấp->Cao), `product.name` (A->Z / Z->A), `recipe.effectiveDate` (Mới nhất / Cũ nhất); kiểm tra & lọc **tất cả các món chứa 1 nguyên liệu được tìm kiếm** (VD: Trà xanh); công cụ **Thay thế nhanh nguyên liệu & Phân tích ảnh hưởng X, Y, Z** + tùy chọn xử lý mẻ cũ. |
| 13 | [BatchesPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/production/BatchesPage.tsx) | `# Quản lí` -> `/production/batches` | Hiển thị tiến độ phân phối nguyên liệu từ mẻ về các chi nhánh; nút phân phối trực tiếp và **Sơ đồ truy vết 2 chiều (`NCC/Lô F0 -> Mẻ -> Lô F1 -> Chi nhánh -> Món`)**. |
| 14 | [DistributionPlanningPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/distribution/DistributionPlanningPage.tsx) | `# Quản lí` -> `/production/planning` | Thiết lập **Kế hoạch cố định ở Kho Tổng**; thêm **Lượng thêm tạm thời** có **Thời lượng hiệu lực** mà không làm đổi kế hoạch tổng; nút **Biến tạm thời thành cố định** và **Lịch sử phân phối** (Thanh Hương); hiển thị tỷ lệ định mức; sơ đồ phân cấp `F0 -> F1 -> Món` và `F0 -> Món`. |
| 15 | [ShiftReconciliationPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/ShiftReconciliationPage.tsx) & [StoreIngredientsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/stores/StoreIngredientsPage.tsx) | `# Quản lí` -> `/stores/shift-reconciliation` | Giới hạn dropdown nhân viên (`Mở ca`, `Kiểm đếm`, `Quản lý`) theo đúng chi nhánh đang chọn; Quản lý chi nhánh chỉ thấy đối soát ở chi nhánh mình (`CN05`); Admin tổng chỉ đối soát báo cáo & phân công nhân viên về chi nhánh. |
| 16 | [PromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/PromotionsPage.tsx) & [BranchPromotionsPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/sales/BranchPromotionsPage.tsx) | `# Nhân viên` & `# Quản lí` -> `/marketing/promotions` | Điều chỉnh tỷ lệ `%` bố cục để bảng danh sách khuyến mãi lớn, rõ ràng; hiển thị ràng buộc cộng dồn/loại trừ; bộ 3 giới hạn `TỔNG / SỐ LƯỢNG / TIỀN` kèm nhãn **dự báo số nào chạm trần trước**; hỗ trợ quy định tự nhiên (`"100 người đến trước"`); khóa quyền chỉnh sửa ở `/marketing/branch-promotions` chỉ cho Admin (`owner`). |
| 17 | [SuppliersPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/suppliers/SuppliersPage.tsx) | `/suppliers` | Thêm cột **Nhà cung cấp từ bao lâu (`partnerSince`)**; thêm Sort theo `supplier.name` (`A->Z / Z->A`) và `supplier.partnerSince` (`Mới nhất / Cũ nhất`); thêm biểu đồ & bộ lọc chi nhánh cho Admin, khóa theo chi nhánh cho Quản lý CN. |
| 18 | [InventoryReportPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/InventoryReportPage.tsx) | `/reports/inventory-report` | Xóa bỏ toàn bộ style "bảng màu vàng quá gớm" (`border-amber-300`, `bg-amber-500/10`, `bg-red-50/50`), thay bằng bảng chuẩn hiện đại; đồng bộ filter chi nhánh cho Admin vs Quản lý CN. |
| 19 | [ProfitLossPage.tsx](file:///d:/OOAD/HaiLyDa-FrontEnd/src/pages/reports/ProfitLossPage.tsx) | `/reports/profit-loss` | Xóa bỏ style "đỏ lòm gớm" (`tone="danger"` trên COGS, khung `border-red-300 bg-red-50/40`, chữ đỏ trên cột chi phí); hiển thị các cột **Cân bằng thu chi & Lợi nhuận sau thuế theo quy tắc `(Doanh thu - Chi phí) * (1 - Thuế)`** từ dữ liệu Backend; bổ sung bảng **Kết quả của từng đợt khuyến mãi**; khóa phạm vi chi nhánh cho Quản lý CN. |
| 20 | `src/pages/customer/CustomerPortalPage.tsx` *(Tạo mới)* | `# Khách hàng` | Trang Khách hàng tích hợp: **Chọn chi nhánh gần tôi**, tùy chọn **Có muốn đăng nhập & lưu thông tin hay không (Guest vs Member)**, và **Tra cứu đơn hàng / tích điểm tức thì KHÔNG CẦN OTP**. |
