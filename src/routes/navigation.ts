export interface NavigationItem {
    path: string;
    label: string;
    group?: string;
}

export const navigationItems: readonly NavigationItem[] = [
    // Bán Hàng & POS
    { path: "/dashboard", label: "Bảng điều khiển kinh doanh tổng quan", group: "Tổng quan" },
    { path: "/sales/pos", label: "Điểm bán hàng tại quầy (POS)", group: "Bán hàng" },
    { path: "/sales", label: "Quản lý đơn hàng đa kênh", group: "Bán hàng" },
    { path: "/sales/returns", label: "Xử lý khiếu nại & Hoàn tiền", group: "Bán hàng" },
    { path: "/sales/shifts", label: "Quản lý ca làm việc & Bàn giao quỹ", group: "Bán hàng" },
    { path: "/sales/preparation", label: "Hàng đợi pha chế (KDS Barista)", group: "Bán hàng" },
    { path: "/customers", label: "Khách hàng thân thiết & Hội viên tích điểm", group: "Khách hàng" },
    { path: "/marketing/promotions", label: "Chương trình khuyến mãi & Voucher", group: "Bán hàng" },

    // Kho & Nguyên Liệu
    { path: "/inventory/products", label: "Danh sách món & Bảng giá chuỗi", group: "Kho hàng" },
    { path: "/inventory/products/new", label: "Thêm món mới & Định mức công thức BOM", group: "Kho hàng" },
    { path: "/inventory/ingredients", label: "Danh mục nguyên vật liệu & Định mức an toàn", group: "Kho hàng" },
    { path: "/inventory/categories", label: "Nhóm sản phẩm & Phân loại menu", group: "Kho hàng" },
    { path: "/inventory/branches", label: "Hệ thống 12 chi nhánh cửa hàng", group: "Kho hàng" },
    { path: "/inventory/units", label: "Đơn vị tính & Bảng quy đổi đại lượng", group: "Kho hàng" },
    { path: "/inventory/stock-adjustment", label: "Kiểm kê kho & Điều chỉnh hao hụt", group: "Kho hàng" },

    // Sản Xuất & Xưởng Trung Tâm
    { path: "/production/recipes", label: "Công thức pha chế & Định mức BOM", group: "Sản xuất" },
    { path: "/production/batches", label: "Lệnh sản xuất mẻ lớn tại xưởng trung tâm", group: "Sản xuất" },

    // Thu Mua & Nhập Xuất
    { path: "/purchases", label: "Danh sách đơn đặt hàng thu mua (PO)", group: "Nhập hàng" },
    { path: "/purchases/new", label: "Tạo đơn đặt mua nguyên liệu mới", group: "Nhập hàng" },
    { path: "/purchases/receipts", label: "Phiếu nhập kho & Nghiệm thu KCS lô hàng", group: "Nhập hàng" },
    { path: "/purchases/transfers", label: "Điều chuyển nguyên liệu cấp cứu liên chi nhánh", group: "Nhập hàng" },

    // Phân Phối & Vận Hành Quầy
    { path: "/distribution/planning", label: "Kế hoạch phân phối nguyên liệu 3 ca", group: "Phân phối" },
    { path: "/stores/ingredients", label: "Tồn kho nguyên liệu vận hành tại quầy bar", group: "Cửa hàng" },
    { path: "/stores/shift-reconciliation", label: "Đối soát nguyên liệu tiêu hao ca trực", group: "Cửa hàng" },

    // Tài Chính & Chi Phí
    { path: "/invoices", label: "Hóa đơn & Chứng từ thanh toán", group: "Tài chính" },
    { path: "/expenses", label: "Sổ theo dõi chi phí vận hành cửa hàng", group: "Tài chính" },
    { path: "/suppliers", label: "Danh bạ nhà cung cấp chính ngạch", group: "Đối tác" },

    // Báo Cáo
    { path: "/reports/sales-report", label: "Báo cáo doanh thu & Món bán chạy", group: "Báo cáo" },
    { path: "/reports/inventory-report", label: "Báo cáo tồn kho & Cảnh báo hạn dùng FEFO", group: "Báo cáo" },
    { path: "/reports/profit-loss", label: "Báo cáo Lãi / Lỗ & Phân tích điểm hòa vốn", group: "Báo cáo" },
    { path: "/reports/customer-report", label: "Báo cáo cơ cấu hội viên & Xếp hạng tích điểm", group: "Báo cáo" },
    { path: "/reports/purchase-report", label: "Báo cáo chi phí thu mua nguyên liệu", group: "Báo cáo" },
    { path: "/reports/supplier-report", label: "Đánh giá chất lượng nhà cung cấp (Scorecard)", group: "Báo cáo" },

    // Quản Trị & Cài Đặt
    { path: "/users", label: "Danh sách nhân viên & Trực ca", group: "Quản trị" },
    { path: "/users/roles", label: "Ma trận phân quyền 4 vai trò", group: "Quản trị" },
    { path: "/settings/general", label: "Cài đặt chung & Thông tin chuỗi MilktyWay", group: "Cài đặt" },
    { path: "/settings/inventory", label: "Cấu hình nguyên tắc kho & Xuất FEFO", group: "Cài đặt" },
    { path: "/settings/sales", label: "Cấu hình bán hàng POS & Kênh trực tuyến", group: "Cài đặt" },
    { path: "/settings/purchases", label: "Cấu hình tiêu chuẩn nghiệm thu thu mua", group: "Cài đặt" },
    { path: "/settings/notifications", label: "Cài đặt cảnh báo tự động & Kịch bản sự cố", group: "Cài đặt" },
    { path: "/settings/offline-sync", label: "Trung tâm giám sát đồng bộ ngoại tuyến", group: "Cài đặt" },
    { path: "/profile", label: "Hồ sơ cá nhân & Đổi mật khẩu", group: "Tài khoản" },
];
