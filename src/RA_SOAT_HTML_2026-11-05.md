# Rà soát tám trang Sales với HTML nguồn

Nguồn chuẩn: D:/ooad/Milkty-Way-FrontEnd. Mã đối chiếu: C:/OOAD/src. Ngày báo cáo: 05/11/2026. Không tính khác biệt dịch thuật/tên ngôn ngữ; khác biệt cấu trúc, icon, CSS, trường dữ liệu, trạng thái nút và hành vi vẫn được ghi nhận.

## Phạm vi thực hiện

Chỉ chỉnh bố cục và hành vi trang SalesReturnsPage.tsx theo HTML nguồn. Với các trang khác chỉ bỏ lời chú thích phát triển thừa; không sửa những khác biệt nêu trong báo cáo. Không sửa layouts, shared, common, routes, CSS toàn cục hoặc bất kỳ file ngoài src nào trong lượt này.

Đã đọc lại quy định bảo tồn HTML/CSS, dùng Tailwind/component sẵn có và không tự thêm framework UI. Không cài thêm thư viện. HTML nguồn là dữ liệu đối chiếu, không phải quyền mở rộng phạm vi công việc.

## 1. DashboardPage — chưa giống hoàn toàn

Đã có đủ 11 tiêu đề vùng chính và 25 SVG trực tiếp giống số lượng trong dashboard.html; số lượng SVG không tự chứng minh từng icon đúng vị trí. Các khối dash-stat, dash-revenue, dash-metric, dash-stock và dash-purchase đã theo markup gốc. Biểu đồ hiện dùng Chart.js, không còn bản SVG đơn giản.

Còn khác:
- HTML dùng input ngày ẩn kèm nút chọn ngày; React dùng ô text dd/MM/yyyy. Khác giao diện và cách thao tác.
- React bọc nội dung max-w-[1400px], làm giới hạn chiều rộng ở màn hình lớn.
- Các nút Xem trong đơn gần đây và Đặt mua hiện báo toast; HTML là liên kết hóa đơn/đơn mua. Vùng nguyên liệu thiếu liên kết Xem tất cả sản phẩm.
- Dùng DataTable thay bảng nguyên bản nên phải xem thêm spacing/caption khi nghiệm thu trực quan.
- Cấu hình Chart.js chưa hoàn toàn trùng nguồn: một số font tooltip, màu dark mode, định dạng trục số khách và dash đường lưới được dùng chung trong component mới.
- KPI và biểu đồ vẫn là snapshot tách khỏi bộ lọc đơn. Đây là khác biệt hành vi dữ liệu, không phải khác biệt ngôn ngữ.

## 2. PosTerminalPage và PosCart — còn khác nhiều chi tiết

Đã có header ba thao tác, trạng thái quầy, grid món, khối tùy chọn tách riêng, giỏ hàng và 12 sản phẩm.

Còn khác:
- Thanh tìm kiếm mất SVG kính lúp và phím gợi ý /; React dùng label và form-input thay cấu trúc ô tìm kiếm có icon của HTML.
- Nhóm món đã đổi từ danh mục template cũ sang nhóm F&B; đây là thay đổi lựa chọn dữ liệu, không chỉ dịch ngôn ngữ.
- Card món dùng icon ly; renderer HTML dùng ảnh p.img. Dữ liệu sản phẩm gốc không cấp img, nên bản HTML có thể hiện ảnh hỏng; cần quyết định nguồn ảnh trước khi làm giống tuyệt đối.
- HTML có ba nút cuối tùy chọn: thêm món, khóa món online, khóa topping online. React chỉ có nút thêm vào giỏ; thiếu hai nút khóa.
- Size trong HTML có giá M/L ngay trong option; React không hiện giá trong option và khóa L với các món chưa có giá nguồn.
- Textarea ghi chú chưa giữ rows=2, placeholder và form-textarea như nguồn. Checkbox chưa giữ đầy đủ kích thước và màu accent nguồn.
- Khách hàng trong giỏ React chỉ có khách vãng lai; HTML còn các khách mẫu. Kích thước/select và các nút giỏ chưa hoàn toàn nguyên bản.
- Các chức năng tra hội viên, voucher, mở ngăn kéo và hoàn tất giao dịch chưa nối dữ liệu thật. Giỏ vẫn là state riêng trang.

## 3. SalesListPage — chưa giống hoàn toàn

Đã có KPI, bộ lọc sáu tiêu chí + tìm kiếm, bảng trạng thái và nút Xem KOT kích thước btn-sm.

Còn khác:
- Thiếu nút Xuất dữ liệu và icon của nút Tạo đơn mới.
- Bốn KPI đều dùng SalesStatIcon giống nhau; HTML có icon riêng cho từng KPI.
- Thiếu tiêu đề Bộ lọc đơn hàng. Grid React là md:grid-cols-3 và control không giữ toàn bộ h-11/form-select của HTML.
- Bộ lọc Thanh toán/Pha chế có thứ tự khác nguồn; kiểu input tìm kiếm cũng khác.
- Có dòng tổng số đơn/tổng tiền thêm ngoài HTML. Chỉ bỏ chữ giải thích mẫu, chưa xóa hoặc đổi bố cục dòng này.
- Phân trang DataTable tính theo một dòng thật thay footer/phân trang tĩnh của HTML.
- Xem KOT mở modal trong React thay điều hướng như nguồn. Đây là thay đổi hành vi cần quyết định, chưa sửa lượt này.

## 4. SalesReturnsPage — đã sửa theo nguồn

Trước sửa: thiếu bốn KPI, thiếu hai icon, gộp bộ lọc vào bảng, có phân trang thêm, lịch sử không đúng tiêu đề, form ẩn trường số tiền khi chọn hướng xử lý khác, nút gửi bật và tự tạo dữ liệu.

Sau sửa:
- Khôi phục bốn card với số liệu gốc: 12 yêu cầu; 620 VND đã hoàn; 15 đơn vị nhập lại; 1 chờ duyệt. Không tự suy diễn/sửa số liệu nguồn dù chưa phù hợp nghiệp vụ F&B hoàn toàn.
- Khôi phục SVG dấu cộng và kính lúp, breadcrumb và khối thao tác đúng vị trí.
- Bộ lọc riêng card mb-5 p-4, ô tìm h-[38px], dropdown có thứ tự Đã duyệt/Chờ duyệt/Từ chối.
- Bảng riêng card p-0 overflow-hidden, đúng 10 cột và HT-0001; bỏ phân trang tự thêm.
- Lịch sử riêng card mt-4, đúng yêu cầu HT-0001 và ba cột.
- Dùng Modal chung; body gap-3.5, đủ năm trường, số tiền luôn hiện min=0 step=1000 placeholder=45000, textarea rows=3; footer Hủy rồi Gửi yêu cầu duyệt.
- Nút Gửi yêu cầu duyệt disabled đúng HTML. Bỏ hành vi tự thêm yêu cầu/ghi lịch sử trước đây để giữ phạm vi chuyển giao diện nguồn; không có thao tác hoàn tiền thật.
- Tìm kiếm/lọc chạy bằng React state và có empty state; Modal vẫn có Escape/focus theo component chung.

Giới hạn: wrapper main chung React là p-4 md:p-6, HTML trang này là p-6; không sửa MainLayout vì ngoài phạm vi page. Modal dùng component chung nên shell có thể khác chi tiết nút đóng/font so với app.js. Không khẳng định pixel-perfect.

## 5. ShiftsPage — gần về bố cục, khác thao tác

Hai grid form grid-cols-1 sm:grid-cols-2 và bảy cột bảng khớp nguồn. Có ba vùng mở ca/danh sách ca/đóng ca.

Còn khác: DataTable thêm phân trang; React có chọn ca và dialog xác nhận, state mở/yêu cầu đóng ca cùng kiểm tra hợp lệ; HTML nút mở ca chỉ báo toast và nút đóng ca có trạng thái khóa. Các trạng thái readonly/disabled và nội dung ô tiền dự kiến có thể khác theo state. HTML nguồn không có SVG trực tiếp trên trang nên không kết luận trang này thiếu icon chỉ vì không có SVG.

## 6. PreparationQueuePage — gần về bố cục và cột

Grid bộ lọc và tám cột khớp HTML. Có badge kênh/trạng thái, món/tùy chọn, nút pha chế và báo thiếu.

Còn khác: DataTable thêm footer phân trang, dùng card/table wrapper khác chi tiết; React chuyển trạng thái bằng state và ẩn/thay nút theo ready, trong khi HTML là snapshot. Thời gian chờ vẫn cố định theo dữ liệu mẫu, chưa tính thời gian thực. Chưa tự sửa những khác biệt này.

## 7. CustomersPage — sai khác lớn

Có hội viên HV-0001 và tám cột danh sách, nhưng:
- Thiếu toàn bộ grid bốn KPI ở đầu HTML.
- Bộ lọc React hai cột, thiếu tiêu đề Bộ lọc hội viên và nút Áp dụng/Xóa bộ lọc; lọc ngay khi nhập.
- HTML đặt lịch sử giao dịch ngay bên dưới bảng; React đặt trong modal khi bấm Lịch sử.
- Lịch sử HTML có sáu cột; React còn bốn cột, tiền/số dư gộp vào mô tả thay cột riêng.
- Liên kết hóa đơn trong lịch sử thành text; phân trang và form thêm khách không giữ đầy đủ markup gốc.

## 8. PromotionsPage — gần nhất về cấu trúc

Grid bộ lọc, grid hai cột form, các nhóm trường và năm cột bảng khớp nguồn. Còn khác: React thêm nút Về danh sách; DataTable thêm phân trang mặc định; có kiểm tra dữ liệu và lưu nháp bằng state thay các handler HTML; cần đối chiếu kiểu date/input khi làm lại lịch chọn ngày. Không tự sửa các điểm này.

## 9. CSS và giới hạn đối chiếu

So sánh theo dòng (bỏ khác biệt CRLF) cho thấy app.css C:/OOAD khác nguồn D: ở .btn: có thêm justify-content:center và text-align:center. Hai dòng này có thể làm căn nội dung nút khác HTML nguồn. Không sửa ngoài src; nếu muốn đồng nhất sau này, tìm selector .btn trong C:/OOAD/assets/css/app.css và đối chiếu hai khai báo với nguồn trước khi chỉnh.

Các file dashboard.js và pos.js ở C: và D: giống nội dung theo dòng; khác byte do cách xuống dòng. Không coi đây là khác logic.

## 10. Ghi chú đã dọn và kiểm tra

Đã bỏ các đoạn hiển thị giải thích snapshot HTML, nguồn dữ liệu, phiên mô phỏng, chờ liên kết kho, KPI chưa phân rã; rút gọn toast thành kết quả thao tác. Phạm vi file: DashboardPage, SalesListPage, CustomersPage, PreparationQueuePage, PromotionsPage, ShiftsPage và PosCart. Giữ các trạng thái nghiệp vụ/empty state và thông báo chức năng chưa kết nối khi người dùng bấm, tránh thông báo giả rằng đã thu tiền hay gửi máy chủ.

TypeScript và Vite build không ghi đầu ra đã đạt. Trình duyệt tích hợp không kết nối được localhost (refused rồi timeout sau khi khởi chạy server), nên chưa nghiệm thu hình ảnh mới. Các nhận xét trên dựa trên mã HTML/TSX, CSS và hành vi event; không tuyên bố độ giống theo phần trăm.
