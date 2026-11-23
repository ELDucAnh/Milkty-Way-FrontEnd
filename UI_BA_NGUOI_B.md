# UI + BA TỐI ƯU CHO NGƯỜI B (Hậu cần · Kho · Sản xuất · Kế hoạch · Đối soát · NCC · Báo cáo)

> Tài liệu này **thay thế phần "UI" trong `PHAN_CONG_TASK_2_NGUOI.md` (Task B1–B7)**. Nghiệp vụ lấy từ [FEEDBACK DETAILS.md](file:///d:/OOAD/HaiLyDa-FrontEnd/FEEDBACK%20DETAILS.md) giữ nguyên 100%. Chỉ thay đổi **cách trình bày** để ít click, ít cuộn, đọc nhanh.
> Quy ước: không công thức toán (Backend tính, FE chỉ hiển thị). Không code mẫu. Wireframe ASCII chỉ để minh họa bố cục.

---

## 0. NGUYÊN TẮC UI CHUNG (áp dụng cho mọi trang B)

### 0.1. Vì sao cách UI cũ chưa tối ưu
| Vấn đề cũ | Hậu quả | Cách sửa |
|---|---|---|
| Mỗi tính năng = 1 card/khối to xếp dọc | Trang dài, danh sách chính bị đẩy xuống dưới | **1 vùng làm việc chính (bảng/biểu đồ) chiếm ≥ 65% màn hình đầu tiên**, tính năng phụ vào Drawer/Popover |
| Modal chồng modal (Thay thế NL 4 bước, Phân phối, Truy vết) | Mất ngữ cảnh, phải đóng mở nhiều | Dùng **Drawer bên phải (460–560px)** giữ nguyên bảng phía sau; thao tác nhiều bước dùng **stepper ngang trong drawer** |
| Nhiều dropdown lọc xếp hàng rời | Chiếm 2–3 hàng, khó biết đang lọc gì | **1 thanh Filter gọn 48px + chip bộ lọc đang bật** (bấm × để bỏ) |
| Hộp giải thích dài ngay trên trang (Conclusion, ROP, quy tắc) | Nhiễu, không ai đọc | **Ẩn sau icon (i) / nút "Quy tắc"**, mở Popover hoặc Drawer khi cần |
| Cảnh báo tô cả dòng/cả khung bằng đỏ vàng | Chói mắt (feedback "gớm") | **Nền trắng, chỉ dùng StatusPill nhỏ + 1 viền trái 3px** cho dòng cần chú ý |
| Hiển thị toàn bộ cột | Bảng rộng, chữ nhỏ | **Cột cốt lõi luôn hiện, cột phụ gộp vào hàng mở rộng (expand row) hoặc menu "Cột"** |

### 0.2. Design token (dùng chung, đồng bộ với StatCard/card hiện có)
- **Mật độ**: chiều cao hàng bảng 44px (mặc định) / 36px (chế độ "Gọn" – nút bật ở góc bảng, lưu `localStorage`).
- **Chữ**: tiêu đề trang 20px semibold; tiêu đề khối 14px semibold; nội dung 13px; chú thích 12px màu xám 500. Số liệu quan trọng 16–20px **tabular-nums** (canh phải).
- **Màu ngữ nghĩa (chỉ 4 màu)**: Xanh lá = ổn/đạt; Hổ phách nhạt = cần chú ý; Rose trầm = lỗi/âm; Xanh dương = thông tin. **Không tô nền cả dòng/cả card**. Màu chỉ xuất hiện ở: StatusPill, số âm, viền trái 3px, thanh tiến độ.
- **Khoảng cách**: khung trang `gap-4`; trong card `p-4`; không lồng card trong card.
- **Chiều cao đầu trang** (tiêu đề + KPI + filter) tối đa ~200px trên màn 1366×768 để bảng luôn thấy ≥ 6 dòng.
- **Dark mode**: giữ cặp class sáng/tối như hệ thống hiện tại.

### 0.3. Bộ component dùng chung (tạo 1 lần, 7 trang cùng dùng) — đặt trong `src/components/shared/`
1. **`FilterBar`**: ô tìm kiếm + nút "Bộ lọc" + nút "Sắp xếp" + nút "Cột" + chip đang lọc + nút "Xóa tất cả". Cao 48px, dính đầu bảng (`sticky`).
2. **`SortMenu`**: Popover liệt kê lựa chọn sắp xếp, **mỗi lựa chọn ghi rõ tên trường** bằng chữ nhỏ bên phải (vd: "Tên món A→Z · trường tên"). Tiêu đề cột trong bảng cũng bấm đảo chiều ↑↓ (đồng bộ với SortMenu). Hiển thị chip "Sắp xếp: …" khi khác mặc định.
3. **`ScopeBadge`** (Phạm vi dữ liệu): pill cố định cạnh tiêu đề trang. Admin: dropdown chọn chi nhánh (mặc định "Toàn chuỗi"). Quản lý CN/Thu ngân: pill khóa "📍 CN05 – Hàng Xanh" (có icon khóa, tooltip "Bị giới hạn theo tài khoản"). **Mọi trang B dùng cùng 1 component này**, không tự dựng dropdown riêng.
4. **`InfoTip`** (i): hover = giải thích 1–2 dòng (tên đầy đủ, nguồn số liệu); click = Popover chi tiết (thuyết minh quy tắc do Backend trả).
5. **`SideDrawer`**: panel phải 480px, có header (tiêu đề + nút đóng), body cuộn, **footer cố định chứa nút hành động chính/phụ**. Esc để đóng. Dùng cho: Thay thế NL, Phân phối mẻ, Truy vết, Thêm lượng tạm thời, Phân công nhân sự, Cách tính ngưỡng chi tiết.
6. **`StatusPill`**: chữ ≤ 2 từ + chấm màu; dùng thay mọi nền tô.
7. **`SegmentedControl`**: nhóm nút chọn 1 (đơn vị thời gian, tab xem…), cao 32px.
8. **`MiniProgress`**: thanh 6px + nhãn "x / y" bên phải; có biến thể nhiều đoạn (stack) cho phân phối theo chi nhánh.
9. **`EmptyState`**: icon + 1 câu + 1 nút hành động (vd "Xóa bộ lọc").
10. **`ConfirmInline`**: xác nhận ngay tại nút (đổi nút thành "Chắc chắn? Có / Không" trong 4 giây) thay cho modal xác nhận với thao tác nhẹ.
11. **`HighlightText`**: tô nền vàng nhạt đoạn chữ khớp từ khóa tìm kiếm.
12. **`ExpandRow`**: hàng mở rộng trong bảng chứa chi tiết (không rời trang).

### 0.4. Quy tắc tương tác chung
- Tìm kiếm áp dụng **ngay khi gõ** (debounce 200ms), không có nút "Tìm".
- Mọi bộ lọc/sắp xếp **lưu theo từng trang** vào `localStorage` (khóa dạng `mw_ui_<trang>_v1`) để quay lại vẫn còn.
- Phím tắt trang quản lý (chỉ 2, không lạm dụng): `/` focus ô tìm kiếm; `Esc` đóng Drawer/Popover.
- **Trạng thái bắt buộc cho mọi bảng**: đang tải (skeleton 5 dòng), rỗng (EmptyState), lỗi (banner nhỏ + nút "Thử lại"), không đủ quyền (EmptyState có icon khóa).
- Thông báo kết quả thao tác bằng **toast góc dưới phải** (3 giây), có nút "Hoàn tác" cho thao tác đảo ngược được (khóa NL, bỏ qua cảnh báo…).
- Số liệu tiền: `1.234.000 ₫`; số lượng kèm đơn vị; ngày `DD/MM/YYYY`.
- Khi Admin đổi `ScopeBadge`, **toàn bộ KPI + biểu đồ + bảng cập nhật đồng thời**, giữ nguyên bộ lọc khác.

---

## B1. KHO SẢN PHẨM (`/inventory/products`) + nền dữ liệu

### BA
- **Người dùng**: Thu ngân/QL chi nhánh (xem thực đơn của CN mình), Admin/Thủ kho (xem từng CN hoặc toàn chuỗi).
- **Mục tiêu**: "Chi nhánh nào thấy sản phẩm của chi nhánh đó"; tìm nhanh món; biết **món nào chứa nguyên liệu X**; sắp xếp.
- **Quy tắc**: (1) Mặc định chỉ hiện món đang mở bán tại chi nhánh đang xem; món bị khóa tại CN ẩn, bật "Hiện cả món tạm khóa" mới thấy (kèm pill xám). (2) Tìm theo tên/mã **và** theo nguyên liệu (trực tiếp + qua bán thành phẩm F1). (3) Sắp xếp có tên trường rõ: Tên (A→Z/Z→A), Mã (A→Z/Z→A), Ngày tạo (Mới nhất/Cũ nhất). (4) Số ly pha được tại CN là số liệu Backend trả, FE chỉ hiển thị.
- **Trạng thái sản phẩm tại CN**: Đang bán · Tạm khóa tại CN · Sắp thiếu NL · Hết NL.

### UI
```
[Tiêu đề: Sản phẩm]  [ScopeBadge: 📍CN05 🔒]                    [+ Thêm SP]
[KPI mini 1 hàng, cao 56px: Đang bán 24 · Sắp thiếu NL 3 · Tạm khóa 2 · Mới 30 ngày 4]
[FilterBar: 🔎 Tìm tên/mã/nguyên liệu…  | Nhóm ▾ | Trạng thái ▾ | ↕ Sắp xếp | ⚙ Cột]
[chip: Nguyên liệu: Trà xanh nhài ×]  [chip: Sắp xếp: Tên A→Z ×]
┌ Banner kết quả (chỉ khi lọc theo NL): "Có 5 món chứa Trà xanh nhài" [Xem công thức →] ┐
Bảng: ☐ | Ảnh+Tên (mã nhỏ bên dưới) | Nhóm | Giá | Pha được tại CN | Trạng thái | ⋯
```
- **KPI**: gom 4 chỉ số thành **1 dải ngang thấp**, bấm vào KPI = áp bộ lọc tương ứng (thay vì 4 StatCard cao).
- **Ô tìm kiếm thông minh**: gõ "trà xanh" → dropdown gợi ý 3 nhóm: *Sản phẩm* / *Nguyên liệu* / *Mã*. Chọn mục *Nguyên liệu: Trà xanh nhài* → thành chip và bảng lọc theo NL; đoạn khớp trong cột Tên được `HighlightText`. Banner kết quả nêu số món; mỗi dòng có thêm tag nhỏ **"qua Cốt F1"** nếu khớp gián tiếp, hoặc **"trực tiếp"**.
- **SortMenu** (mỗi dòng ghi trường): Tên món A→Z · Tên món Z→A · Mã SP A→Z · Mã SP Z→A · Mới nhất (ngày tạo) · Cũ nhất (ngày tạo). Cột Tên/Mã/Ngày tạo trong bảng có mũi tên ↑↓ bấm trực tiếp. Ô "Ngày tạo" nằm trong menu "Cột" (mặc định ẩn để bảng gọn).
- **Cột "Pha được tại CN"**: số ly + MiniProgress mảnh; hover = InfoTip nêu **nguyên liệu đang giới hạn** (vd "Giới hạn bởi Trân châu: còn ~8 ly"). Khi Admin chọn "Toàn chuỗi", cột này đổi thành "Số CN đang bán" (vd 5/6).
- **Trạng thái**: chỉ `StatusPill`. Dòng "Sắp thiếu" chỉ có viền trái 3px hổ phách, **không tô nền**.
- **Thao tác dòng**: icon ⋯ (Sửa · Khóa/Mở bán tại CN · Xem công thức). Không để 3 nút chữ.
- **Hành động hàng loạt**: tick nhiều dòng → thanh nổi đáy "Đã chọn 3 · Khóa tại CN · Mở bán · Bỏ chọn".
- **Responsive**: <1024px ẩn cột Nhóm & Giá (xuống ExpandRow).
- **Nghiệm thu UI**: tìm "trà xanh" ra đủ món (trực tiếp + qua F1) trong ≤ 1 thao tác gõ; đổi sắp xếp không reload; Quản lý CN không thấy dropdown chi nhánh khác.

---

## B2. DASHBOARD (`/dashboard`)

### BA
- **Mục tiêu**: quản lý nhìn 5 giây biết tình hình; đổi **đơn vị thời gian**; xem **lượng khách theo chi nhánh & thời gian**; hiểu **ngưỡng nguyên liệu** (cách tính, bỏ qua NL không dùng); mọi tên viết tắt có giải thích.
- **Quy tắc**: (1) Đơn vị thời gian là **bộ lọc toàn trang** (Giờ/Ngày/Tuần/Tháng/Quý), mọi biểu đồ & KPI theo cùng đơn vị. (2) KPI & bảng theo chi nhánh đang chọn. (3) NL bị "Bỏ qua" không tính vào cảnh báo và bộ đếm; có thể khôi phục. (4) Ngưỡng theo từng điểm kho (Kho tổng ≠ quầy), thuyết minh do Backend trả.

### UI
```
[Dashboard]  [ScopeBadge]  [SegmentedControl: Giờ|Ngày|Tuần|Tháng|Quý]  [Khoảng: 01–30/11 ▾]  [⋯ Thuyết minh chỉ số]
[KPI strip 6 ô trên 1 hàng (cao 84px): Ly bán · Doanh thu · Lượng khách · AOV · Hủy/Hoàn · Hao hụt]  ← mỗi ô: số lớn + ▲▼% + sparkline + (i)
┌──────── Cột trái 8/12 ────────┐ ┌──── Cột phải 4/12 ────┐
│ Tab: [Doanh thu][Lượng khách][Số ly] │ │ Nguyên liệu dưới ngưỡng (N) │
│ Biểu đồ (cao ~300px)                 │ │ list gọn 6 dòng + "Xem tất cả" │
│ Chú thích đơn vị trục rõ ràng        │ │ Lô sắp hết hạn (M)           │
└─────────────────────────────────┘ └──────────────────────┘
Hàng dưới: Top món bán chạy (bảng 5 dòng) | Bảng lượng khách theo chi nhánh
```
- **Một biểu đồ, nhiều tab** thay vì 3 biểu đồ xếp dọc → giảm chiều cao trang 60%. Tab "Lượng khách": đường nhiều chi nhánh (mặc định top 3 + chip bật/tắt từng CN; Admin xem Toàn chuỗi thì có nút "So sánh chi nhánh"). Tiêu đề trục luôn ghi **đơn vị** ("Triệu ₫ / Tháng", "Khách / Giờ").
- **Thẻ KPI**: hover = InfoTip (tên đầy đủ + nguồn); click = mở **Drawer chi tiết** liệt kê bản ghi cấu thành + bảng so sánh các chi nhánh. Nút "⋯ Thuyết minh chỉ số" mở Drawer 2 tab: *Thuyết minh* (mô tả quy tắc từng chỉ số) / *So sánh chi nhánh*.
- **Biểu đồ lượng khách – điểm nhấn**: tô nhạt vùng **giờ cao điểm** (Backend trả); hover = tooltip hiện tên CN, giá trị, so kỳ trước; dưới biểu đồ 1 dòng "Cao điểm: 11:00–13:00 · CN01 đông nhất".
- **Khối "Nguyên liệu dưới ngưỡng"** (cột phải, cuộn riêng, tối đa 6 dòng hiển thị):
  - Mỗi dòng: tên NL (truncate + tooltip tên đầy đủ) · `Tồn / Ngưỡng` dạng "1.2kg / 5kg" · MiniProgress · icon (i) · icon 🔕.
  - Bấm (i) = **Popover "Ngưỡng này từ đâu ra"**: 4 dòng nhãn–giá trị (Tiêu thụ TB/ngày · Thời gian chờ nhập · Tồn an toàn · Ngưỡng áp dụng cho *điểm kho này*) + 1 dòng thuyết minh Backend + link "So sánh ngưỡng giữa các điểm kho" (mở Drawer bảng Kho tổng vs từng CN).
  - Bấm 🔕 = **ConfirmInline đổi thành chọn nhanh**: [Tại CN này ▾ | Toàn chuỗi] + [Lý do ▾] + [Bỏ qua]. Xong: dòng biến mất + toast "Đã bỏ qua Siro cũ · Hoàn tác".
  - Footer khối: link "👁 Đã bỏ qua (3)" mở Popover danh sách + nút "Khôi phục" từng dòng.
  - Nguyên liệu hết sạch (0 lô) **vẫn hiện** với pill "Hết hàng".
- **Responsive**: <1280px cột phải rơi xuống dưới biểu đồ; KPI strip cuộn ngang.
- **Nghiệm thu UI**: không cuộn vẫn thấy KPI + biểu đồ + cảnh báo; đổi đơn vị thời gian không đổi vị trí bố cục; mọi chữ viết tắt (ROP, AOV, COGS, CN) có (i) hoặc tooltip.

---

## B3. CÔNG THỨC (`/production/recipes`)

### BA
- **Mục tiêu**: Sắp xếp theo priority/ngày hiệu lực/tên món; **tìm mọi món chứa 1 nguyên liệu**; **thay thế nhanh nguyên liệu** biết trước ảnh hưởng X/Y/Z và cách xử lý mẻ cũ.
- **Quy tắc**: (1) Sort có tên trường: Priority (1→3 / 3→1), Tên món (A→Z/Z→A), Ngày hiệu lực (Mới nhất/Cũ nhất). (2) Tìm NL gồm trực tiếp & qua F1. (3) Thay A→B ở món X chỉ tạo phiên bản mới của X; Y,Z không đổi, **trừ khi A nằm trong cốt F1 dùng chung** (cảnh báo ảnh hưởng dây chuyền, gợi ý "Tách cốt F1"). (4) Xử lý mẻ cũ: Bán hết (mặc định) hoặc Hủy & làm lại.

### UI — Màn hình chính: **bảng + panel chi tiết phải** (master–detail), không dùng thẻ công thức dài
```
[Công thức] [ScopeBadge nếu cần]                         [🔄 Thay thế nguyên liệu] [+ Công thức]
[FilterBar: 🔎 Tìm món/NL | Trạng thái ▾ | Loại: Món/F1 ▾ | ↕ Sắp xếp]   chip: NL: Trà xanh ×
┌ Banner (khi lọc NL): "✅ 5 món chứa Trà xanh nhài (3 trực tiếp · 2 qua Cốt F1)  [Thay thế NL này →]" ┐
┌──────────── Bảng 7/12 ────────────┐ ┌──────── Panel chi tiết 5/12 ────────┐
│ Pri | Món | Phiên bản | Hiệu lực | #NL | Trạng thái │ │ Tên món + phiên bản + (Pri ▾ sửa nhanh) │
│ (click dòng = chọn, panel cập nhật)                  │ │ Tab: Nguyên liệu | Các bước | Lịch sử        │
└──────────────────────────────┘ └──────────────────────────┘
```
- **Priority**: ô 24px tròn có số 1/2/3 (đỏ-cam / xanh / xám) ở cột đầu; đổi nhanh bằng popover 3 nút trong panel (không mở form).
- **SortMenu** (ghi trường): Độ ưu tiên Cao→Thấp · Thấp→Cao (trường Priority) · Tên món A→Z · Z→A (trường tên món) · Mới nhất · Cũ nhất (trường ngày hiệu lực). Mặc định Priority Cao→Thấp.
- **Tab "Nguyên liệu" trong panel**: bảng mini (NL, tier F0/F1 pill, định lượng). **Dòng khớp từ khóa tìm kiếm được tô nền xanh lá nhạt + badge "Đang lọc"**; dòng F1 có mũi tên ▸ mở rộng xem F0 cấu thành (cây 2 cấp, mặc định đóng, tự mở nếu khớp qua F1).
- **Thay thế nhanh = Drawer 520px với Stepper ngang 3 bước** (gộp 4 bước cũ):
  1. **Chọn**: NL cần thay (A) → bảng món đang dùng A hiện ngay bên dưới với checkbox; NL mới (B) + định lượng (mặc định giữ nguyên). Nút phụ "Chọn tất cả / Chỉ 1 món".
  2. **Xem ảnh hưởng** (không cần bước riêng để bấm): bảng **Impact Matrix** 3 cột: *Món · Thay đổi (v1.2 → v1.3) · Ảnh hưởng*. Nhóm 2 khối: "Sẽ cập nhật (N)" / "Không bị ảnh hưởng (M)" với icon ✅/➖. Nếu A nằm trong cốt F1 dùng chung: **banner hổ phách** "Cốt F1 dùng chung bởi 3 món — đổi sẽ ảnh hưởng cả 3. [Tách cốt F1 cho món đã chọn]".
  3. **Xử lý mẻ cũ**: 2 thẻ chọn lớn (radio-card): *Bán hết lô còn hạn (đề xuất)* / *Hủy & làm lại ngay*. Dưới mỗi thẻ 1 dòng hệ quả. Chọn "Hủy" thì hiện thêm số mẻ/lô bị hủy.
  - Footer cố định: [Quay lại] [Áp dụng thay thế (N món)] — nút chính bị khóa tới khi chọn ≥ 1 món. Áp dụng xong: toast "Đã nâng phiên bản N món · Hoàn tác (trong 30 giây)".
- **Lối tắt**: từ banner kết quả tìm NL bấm "Thay thế NL này" mở Drawer đã chọn sẵn A.
- **Responsive**: <1280px panel phải thành Drawer mở khi click dòng.
- **Nghiệm thu UI**: từ tìm "trà xanh" → thay thế trong ≤ 4 click; thấy rõ Y,Z không đổi trước khi bấm Áp dụng.

---

## B4. LÔ / MẺ SẢN XUẤT (`/production/batches`)

### BA
- **Mục tiêu**: thấy **mẻ đã phân phối đi đâu** và **truy vết 2 chiều** (NL gốc F0 → mẻ → F1 → CN → món).
- **Quy tắc**: chỉ mẻ "Hoàn thành" mới phân phối; không phân phối vượt số còn ở Kho tổng; mỗi lần phân phối sinh phiếu chuyển kho liên kết; chọn lô đầu vào theo hết hạn trước dùng trước.

### UI
```
[Lô/Mẻ sản xuất]                                            [+ Tạo mẻ]
[FilterBar: 🔎 Mã mẻ/lô | Trạng thái ▾ | Ngày ▾ | ↕ Sắp xếp (Mới nhất mặc định)]
Bảng: Mã mẻ | Sản phẩm/Công thức | Thực/Kế hoạch | ▮▮▮▯ Phân phối (stack theo CN) | Hạn dùng | Trạng thái | ⋯
  Hàng mở rộng (click ▸): Lô F0 đầu vào (pill) · Phiếu phân phối gần nhất
```
- **Cột Phân phối** là điểm nhấn: `MiniProgress` nhiều đoạn, mỗi CN 1 màu nhạt, hover từng đoạn = "CN01: 70". Nhãn phải: "160/196 · còn kho 36". Mẻ chưa hoàn thành hiện "—".
- **Nút hành động dòng**: 1 nút chính tùy trạng thái (Bắt đầu nấu / Hoàn thành / **Phân phối**) + menu ⋯ (Truy vết, Hủy). Không để 3 nút chữ cùng lúc.
- **Drawer "Phân phối"** (480px): đầu drawer 3 số (Thực thu · Đã phân phối · Còn kho). Thân: bảng CN (Tên · Nhu cầu gợi ý · **ô nhập số lượng**). Dòng cuối "Còn lại sau phân phối: X" đổi màu rose nếu vượt; nút "Chia đều theo nhu cầu" điền nhanh. Footer: [Hủy] [Xác nhận xuất] (khóa khi vượt).
- **Drawer "Truy vết"**: **timeline dọc 4 mốc** (thay vì 4 bảng): ① NL đầu vào (bảng nhỏ: NL · Lô · NCC · Số lượng) → ② Mẻ (thông tin 1 dòng) → ③ Phân phối (bảng CN · giao · đã dùng · còn quầy · mã phiếu) → ④ Món sử dụng (chip tên món). Công tắc đầu drawer "Chiều ngược ⇄ Chiều xuôi" cuộn tới mốc tương ứng. Mã lô/mã phiếu là link, bấm mở truy vết lô đó.
- **Nghiệm thu UI**: từ bảng thấy ngay mẻ nào còn chưa phân phối hết; phân phối 3 CN trong 1 drawer ≤ 30 giây.

---

## B5. KẾ HOẠCH SẢN XUẤT (`/production/planning` & `/distribution/planning`)

### BA
- **Mục tiêu**: có **kế hoạch cố định** ở Kho tổng; báo thiếu → **lượng thêm tạm thời có thời hạn** không đổi kế hoạch gốc; **biến tạm thời thành cố định**; xem **lịch sử phân phối**; thấy **phân cấp F0→F1→Món** và tỷ lệ.
- **Quy tắc**: (1) Kế hoạch cố định chỉ đổi khi bấm "Biến thành cố định" hoặc sửa trực tiếp có người duyệt. (2) Lượng thêm gắn ngày bắt đầu–kết thúc; hết hạn tự quay về cố định. (3) Tổng dự kiến = cố định + lượng thêm còn hiệu lực (Backend trả). (4) Lịch sử ghi mọi biến động.

### UI — **lưới ngày (calendar-grid) thay cho bảng 1 ngày**
```
[Kế hoạch sản xuất]  [SegmentedControl: Tuần này | 14 ngày | Tháng]  [◀ 17/11–23/11 ▶]    [➕ Báo thiếu]
[FilterBar: Chi nhánh ▾ | Nguyên liệu/Nhóm ▾ | Tầng: Tất cả/F0/F1 ▾]
┌──────────────── Lưới: hàng = CN (+ hàng Tổng Kho tổng), cột = ngày ────────────────┐
│          | T2 17 | T3 18 | T4 19 | T5 20 | …                                    │
│ CN01     | 220   | 260▲  | 260▲  | 220   |   ← ô: số tổng; ▲ = có lượng thêm tạm thời │
│ CN05     | 180   | 180   | 180   | 180   |                                          │
│ TỔNG     | 550   | 590   | 590   | 550   |                                          │
└────────────────────────────────────────────────────────────────────┘
Hàng dưới (tab): [Phân cấp NL] [Lượng thêm đang hiệu lực] [Lịch sử phân phối]
```
- **Ô lưới**: số lớn = tổng dự kiến; số nhỏ xám bên dưới = "cố định 220". Ô có lượng thêm hiện **chấm xanh dương + ▲ +40**, **ô không tô nền**. Hết hiệu lực tự trở về số cố định (nhìn thấy ngay trên lưới — trả lời trực quan câu hỏi "kéo dài bao lâu?" mà không cần đoạn văn).
- **Bấm 1 ô** → Popover nhỏ: *Cố định 220 · Lượng thêm +40 (16/11→18/11, còn 2 ngày) · Lý do* + 2 nút [Chỉnh lượng thêm] [📌 Biến thành cố định]. Kéo chọn nhiều ô liên tiếp trong 1 hàng → thanh nổi "➕ Thêm lượng thêm cho 3 ngày đã chọn" (cách nhanh nhất để "tăng cho nhiều ngày").
- **Drawer "Báo thiếu / Thêm lượng tạm thời"** (440px): CN (mặc định CN đang chọn) · Nguyên liệu/số ly · **Thời hạn bằng chip nhanh**: [Ngày mai] [3 ngày] [7 ngày] [Tùy chọn…] (tùy chọn hiện 2 ô ngày) · Lý do. Phần xem trước nhỏ: "Kế hoạch cố định không đổi · Tổng 18/11: 260". Footer: [Hủy] [Lưu lượng thêm].
- **Nút "📌 Biến thành cố định"**: dùng `ConfirmInline` + hiện xem trước "Cố định CN01: 220 → 260". Sau khi xác nhận: toast + dòng lịch sử mới.
- **Tab "Phân cấp NL"**: 2 cây nằm cạnh nhau, **luồng ngang** (F0 → F1 → Món) với chip nguyên liệu; nhãn tỷ lệ trên mũi tên (vd "180 ml/ly"). Bấm 1 nút = highlight toàn đường đi. Hai ví dụ trong feedback (trà+sữa→cốt→món; thạch→món) hiển thị bằng dữ liệu thật, mặc định thu gọn.
- **Tab "Lịch sử phân phối"**: bảng có lọc CN & loại biến động (Định kỳ / Báo thiếu / Chuyển cố định), cột: Ngày · CN · NL · Cố định · Lượng thêm · Thực xuất · Loại (pill) · Người · Mã phiếu (link). Xuất CSV ở góc.
- **Quy tắc nghiệp vụ**: không để đoạn văn "Conclusion" nằm trên trang — thay bằng nút `ⓘ Quy tắc kế hoạch` cạnh tiêu đề mở Popover 3 gạch đầu dòng ngắn.
- **Nghiệm thu UI**: thấy 7 ngày × mọi CN trong 1 màn hình; thêm lượng thêm cho 3 ngày ≤ 3 thao tác; kế hoạch cố định luôn hiển thị song song, không bị ghi đè.

---

## B6. TỒN KHO CỬA HÀNG & ĐỐI SOÁT CA (`/stores/ingredients`, `/stores/shift-reconciliation`)

### BA
- **Mục tiêu**: QL chi nhánh chỉ thấy/duyệt chi nhánh mình; chọn CN thì dropdown nhân viên **chỉ gồm nhân viên CN đó**; làm rõ ai được Thêm/Sửa/Xóa; Admin chỉ **đối soát báo cáo + phân công nhân sự**, không mở/đóng ca.
- **Quy tắc vòng đời biên bản**: Nháp/Chờ duyệt → Sửa & Xóa được (trong CN); Đã duyệt → khóa chỉ đọc. Admin: xem toàn chuỗi, xuất báo cáo, phân công; không tạo/sửa/duyệt hộ CN.

### UI — Đối soát ca
```
[Đối soát ca] [ScopeBadge]                       [Admin: 👥 Phân công nhân sự] [Quản lý CN: + Tạo đối soát]
[KPI strip: Chờ duyệt 4 · Có chênh lệch 2 · Đã duyệt tháng này 38 · Chênh lệch tiền mặt TB]
[FilterBar: 🔎 mã ca/nhân viên | Trạng thái (tab: Tất cả|Chờ duyệt|Cần xem lại|Đã duyệt) | Ngày ▾]
Bảng: Ngày/Ca | CN | Người mở → Người đóng | Chênh lệch tiền | Chênh lệch kho | Trạng thái | ⋯
```
- **Trạng thái dạng tab đếm số** (thay dropdown) để duyệt nhanh. Dòng có chênh lệch lớn: viền trái 3px + pill, **không tô nền**.
- **Cột "Người mở → Người đóng"**: nếu khác nhau hiện icon ⚠ nhỏ + tooltip lý do bàn giao (liên kết nghiệp vụ A3).
- **Thao tác dòng theo quyền**: dòng Nháp: ⋯ gồm *Sửa số liệu · Giải trình · Xóa (ConfirmInline)*; dòng Đã duyệt: icon 🔒, chỉ "Xem". Admin: chỉ "Xem · Xuất". Cột thao tác tự co lại theo vai trò, **không hiện nút bị khóa mà để mờ lộn xộn** — nút không có quyền thì ẩn, và có 1 dòng chú thích nhỏ cuối bảng "Biên bản đã duyệt được khóa".
- **Form Tạo/Sửa = Drawer 520px** (thay modal): bước chọn **Chi nhánh trước** (khóa theo `ScopeBadge` nếu là QL CN). Ba trường Người mở ca / Người kiểm đếm / Quản lý là **Combobox có tìm kiếm chỉ liệt kê nhân viên của CN đã chọn**; đổi CN → ba trường reset và hiện toast "Danh sách nhân viên đã cập nhật theo CN". Trường Quản lý chỉ liệt kê vai trò quản lý/ca trưởng và **loại trừ người đã chọn ở trường kiểm đếm** để tránh tự duyệt.
- **Drawer "Phân công nhân sự" (Admin)**: 2 cột kéo–thả hoặc bảng: Nhân viên · Vai trò · CN hiện tại ▾ (đổi bằng dropdown) ; lọc theo CN ở đầu; nút "Lưu thay đổi (N)" ở footer, hiển thị số thay đổi chưa lưu. Dữ liệu này là nguồn cho mọi dropdown nhân viên.
- **Tồn kho cửa hàng (`/stores/ingredients`)**: ScopeBadge khóa theo CN; bảng NL với MiniProgress Tồn/Ngưỡng; cột phụ vào ExpandRow; nút "Điều chỉnh tồn" mở Drawer nhỏ (lý do bắt buộc). Giữ cùng khung FilterBar để quen tay.
- **Nghiệm thu UI**: QL CN05 không thấy bất kỳ dòng nào của CN khác; chọn CN nào dropdown nhân sự chỉ có người CN đó; biên bản đã duyệt không có nút sửa/xóa.

---

## B7. NHÀ CUNG CẤP & BÁO CÁO (`/suppliers`, `/reports/inventory-report`, `/reports/profit-loss`, `/reports/sales-report`)

### B7.1 — Nhà cung cấp
**BA**: hiển thị **hợp tác từ bao lâu**; sort A→Z/Z→A theo tên NCC và Mới nhất/Cũ nhất theo ngày bắt đầu hợp tác; biểu đồ/bảng theo chi nhánh (Admin chọn, QL cố định).
**UI**:
- Đầu trang: `ScopeBadge` + KPI strip (Tổng NCC · Công nợ · Giao đúng hạn TB · NCC mới < 1 năm).
- Dải biểu đồ **thu gọn 1 hàng** (2 biểu đồ nhỏ 200px cạnh nhau: *Giá trị nhập theo NCC* / *Giao đúng hạn*) có nút thu gọn ⌃ lưu trạng thái; đổi CN ở ScopeBadge thì biểu đồ đổi theo.
- Bảng: Tên NCC (mã nhỏ bên dưới) | Nhóm | **Hợp tác** (vd "4 năm 8 tháng" + dòng nhỏ "từ 03/2022" + pill *Chiến lược/Thân thiết/Mới*) | Giao đúng hạn (MiniProgress) | Công nợ | Trạng thái | ⋯.
- **SortMenu** (ghi trường): Tên NCC A→Z · Z→A · Hợp tác lâu nhất (Cũ nhất – ngày bắt đầu hợp tác) · Mới hợp tác nhất (Mới nhất – ngày bắt đầu hợp tác). Có thể bấm tiêu đề cột "Hợp tác" để đảo chiều.
- Chi tiết NCC = **Drawer** (tab: Thông tin · Số liệu theo CN · Lịch sử PO), không modal dài.

### B7.2 — Báo cáo tồn kho ("bảng vàng quá gớm")
**BA**: danh sách NL cần xử lý ngay nhưng nhìn dịu mắt; Admin có filter chi nhánh, QL cố định.
**UI**:
- Bỏ mọi viền/nền vàng, chấm nhấp nháy, nền dòng đỏ/vàng. Khung bảng dùng card trung tính chuẩn.
- **Phân loại bằng tab đếm số**: *Dưới ngưỡng (7) · Cận hạn (3) · Hết hạn (1) · Tất cả*. Mỗi tab 1 bảng — thay vì gom hết vào 1 bảng đầy màu.
- Cột "Tình trạng" = `StatusPill`; cột tồn = MiniProgress; mức độ khẩn dùng **viền trái 3px** trên dòng đầu tiên của nhóm nghiêm trọng, không tô nền.
- Biểu đồ cơ cấu tồn ở bên phải bảng (4/12) hoặc thu gọn; dùng bảng màu tĩnh xanh–xám, chỉ 1 màu nhấn.
- Hành động dòng: 1 nút "Tạo phiếu nhập" (icon) + ⋯ (Bỏ qua cảnh báo — dùng chung cơ chế ở Dashboard).

### B7.3 — Báo cáo lãi lỗ ("đỏ lòm gớm")
**BA**: cân bằng thu chi sau thuế theo quy tắc **(Doanh thu − Chi phí) × (1 − Thuế)** — số do Backend trả; xem được **kết quả các đợt khuyến mãi**; Admin chọn CN, QL cố định.
**UI**:
- **Bảng màu tài chính trung tính**: COGS/OPEX chữ xám đậm (không đỏ); chỉ **số âm của "Lợi nhuận sau thuế" dùng rose trầm** và số dương xanh lá; KPI COGS đổi tone sang xanh dương/trung tính. Khối "chi nhánh chưa hòa vốn" thành **một dải nhỏ gọn 1 hàng** ("2 CN chưa hòa vốn: CN11 −19tr · CN12 −13,5tr  [Xem]") nền trắng, viền trái 3px — bấm mở lọc bảng, không còn khung đỏ chiếm nửa màn hình.
- **Bố cục**: KPI strip (Doanh thu · Tổng chi phí · Lợi nhuận trước thuế · Lợi nhuận sau thuế · Số CN lỗ) → Tab chính **[Theo chi nhánh] [Khuyến mãi] [Xu hướng]**.
- **Tab Theo chi nhánh**: bảng cột: CN | Doanh thu | Tổng chi phí | Chênh lệch trước thuế | Thuế | **Lợi nhuận sau thuế** | Hòa vốn (i). Header "Lợi nhuận sau thuế" có (i): "Quy tắc: (Doanh thu − Chi phí) × (1 − Thuế) · tính bởi hệ thống". Cột COGS/OPEX nằm trong **ExpandRow** (bấm ▸) để bảng gọn. Hàng "Tổng cộng" dính đáy bảng. Chọn thuế suất bằng SegmentedControl nhỏ (0% · 10% · 20%) ở góc — chỉ đổi tham số gửi Backend, số hiển thị lại.
- **Tab Khuyến mãi**: bảng đợt KM (Mã/Tên · Phạm vi · Lượt dùng · Doanh thu · Chi phí giảm · **Lợi nhuận sau thuế** · Đánh giá pill *Hiệu quả cao / Đạt / Cần tối ưu*). 3 ô KPI nhỏ trên bảng (Doanh thu từ KM · Chi phí giảm giá · Lãi ròng từ KM). Bấm dòng mở Drawer chi tiết đợt KM (không qua trang khác).
- **Tab Xu hướng**: 1 biểu đồ doanh thu–chi phí–lợi nhuận theo đơn vị thời gian giống Dashboard.
- `ScopeBadge` giống mọi trang; áp dụng cả `/reports/sales-report`.
- **Nghiệm thu UI**: toàn trang không còn diện tích nền đỏ/vàng; nhìn 1 màn hình thấy KPI + bảng 6 CN; số lỗ chỉ là chữ rose trầm.

---

## 8. THỨ TỰ LÀM ĐỀ XUẤT (giảm làm lại)
1. **Ngày 1**: làm bộ component chung §0.3 (FilterBar, SortMenu, ScopeBadge, InfoTip, SideDrawer, StatusPill, MiniProgress, SegmentedControl, EmptyState, ConfirmInline, HighlightText, ExpandRow) + tokens. Viết thử trên B1.
2. **Ngày 2**: B1 → B7 (đơn giản, dùng lại khung bảng) → B2 (Dashboard).
3. **Ngày 3**: B3 (master–detail + Drawer thay thế) → B4 → B6.
4. **Ngày 4**: B5 (lưới ngày — phức tạp nhất) → rà trạng thái rỗng/lỗi/quyền → tối ưu responsive.

## 9. CHECKLIST UI CUỐI CÙNG (tự kiểm trước khi nộp)
- [ ] Mọi trang: bảng thấy ≥ 6 dòng ở màn 1366×768 mà không cuộn.
- [ ] Mọi trang có đủ 4 trạng thái: tải / rỗng / lỗi / không quyền.
- [ ] Không còn nền đỏ/vàng phủ dòng hay khung; màu chỉ ở pill, số âm, viền trái, tiến độ.
- [ ] Mọi sắp xếp ghi rõ tên trường; tiêu đề cột bấm đảo chiều được.
- [ ] Mọi `ScopeBadge` khóa đúng cho QL chi nhánh; Admin đổi CN thì toàn trang đổi theo.
- [ ] Thao tác nhiều bước nằm trong Drawer có footer cố định; không modal chồng modal.
- [ ] Giải thích nghiệp vụ nằm sau (i)/Popover, không là đoạn văn dài trên trang.
- [ ] Không có công thức toán ở FE; số liệu tính toán lấy từ trường Backend trả.
- [ ] Phím tắt chỉ `/` và `Esc` ở trang quản lý.
