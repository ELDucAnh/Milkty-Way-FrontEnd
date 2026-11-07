import { Link } from "react-router-dom";
import { useToast } from "../../components/common/useToast";

export default function GeneralSettingsPage() {
  const toast = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Đã lưu cấu hình doanh nghiệp MilktyWay thành công!", {
      title: "Đã Cập Nhật",
    });
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/dashboard">Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/settings/general">Cài đặt</Link>
            <span className="sep">/</span>
            <span className="current">Cài đặt chung</span>
          </nav>
          <h1 className="page-title">Thông Tin Doanh Nghiệp &amp; Cài Đặt Chung</h1>
          <p className="page-subtitle">
            Cấu hình nhận diện thương hiệu, thông tin pháp lý và quy chuẩn in hóa đơn.
          </p>
        </div>
      </div>

      {/* General Settings Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <div className="card">
          <div className="card-header mb-4 pb-3 border-b border-[var(--border)]">
            <h3 className="card-title">Hồ Sơ Thương Hiệu Chuỗi Trà Sữa</h3>
          </div>

          <div className="flex items-center gap-5 mb-5">
            <div className="w-[72px] h-[72px] rounded-[18px] bg-gradient-to-br from-[#22B573] to-[#16A34A] flex items-center justify-center text-white text-3xl font-extrabold shrink-0 shadow-md">
              MW
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">
                Logo Thương Hiệu MilktyWay
              </div>
              <div className="text-xs text-[var(--muted)] mt-0.5">
                Khổ PNG trong suốt, SVG hoặc JPG (Hiển thị trên đầu bill K80 &amp; Màn hình POS)
              </div>
              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    toast.info("Chọn tệp logo thương hiệu mới...", { title: "Tải Tệp" })
                  }
                >
                  Đổi Logo
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-[var(--danger)]"
                  onClick={() =>
                    toast.info("Đã khôi phục logo mặc định", { title: "Khôi Phục" })
                  }
                >
                  Mặc Định
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="company-name">
                Tên Doanh Nghiệp Pháp Lý <span className="text-red-500">*</span>
              </label>
              <input
                id="company-name"
                type="text"
                className="form-input"
                defaultValue="Công Ty Cổ Phần Trà Sữa MilktyWay Việt Nam"
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="tax-vat">
                Mã Số Thuế Doanh Nghiệp (MST)
              </label>
              <input
                id="tax-vat"
                type="text"
                className="form-input"
                defaultValue="0317892345"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="support-email">
                Email Chăm Sóc Khách Hàng <span className="text-red-500">*</span>
              </label>
              <input
                id="support-email"
                type="email"
                className="form-input"
                defaultValue="cskh@MilktyWay.vn"
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="business-phone">
                Hotline Tổng Đài Toàn Chuỗi <span className="text-red-500">*</span>
              </label>
              <input
                id="business-phone"
                type="text"
                className="form-input"
                defaultValue="1900 8866 · (028) 3822 9999"
                required
              />
            </div>
            <div className="col-span-full">
              <label className="form-label" htmlFor="hq-address">
                Trụ Sở Điều Hành Chính
              </label>
              <input
                id="hq-address"
                type="text"
                className="form-input"
                defaultValue="Tầng 18, Tòa nhà Bitexco Financial Tower, Số 2 Hải Triều, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh"
              />
            </div>
            <div className="col-span-full">
              <label className="form-label">Quy Mô Chuỗi Cửa Hàng Hiện Tại</label>
              <input
                type="text"
                className="form-input"
                defaultValue="12 Chi Nhánh Trực Tiếp Vận Hành tại TP.HCM + 1 Kho Tổng Trung Tâm (Bình Tân)"
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header mb-4 pb-3 border-b border-[var(--border)]">
            <h3 className="card-title">Định Dạng Tiền Tệ &amp; Bản Địa Hóa</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="base-currency">
                Đơn Vị Tiền Tệ Mặc Định
              </label>
              <select id="base-currency" className="form-input form-select" defaultValue="vnd">
                <option value="vnd">VNĐ (₫) — Việt Nam Đồng</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="date-format">
                Định Dạng Ngày Tháng &amp; Hạn Dùng FEFO
              </label>
              <select id="date-format" className="form-input form-select" defaultValue="dmy">
                <option value="dmy">DD/MM/YYYY (Chuẩn Việt Nam: 28/10/2026)</option>
                <option value="ymd">YYYY-MM-DD (ISO)</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="timezone">
                Múi Giờ Hệ Thống
              </label>
              <select id="timezone" className="form-input form-select" defaultValue="gmt7">
                <option value="gmt7">GMT+7 (Asia/Ho_Chi_Minh — Giờ chuẩn Việt Nam)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Quy Định Làm Tròn Tiền Bán Lẻ POS</label>
              <select className="form-input form-select" defaultValue="1000">
                <option value="1000">Làm tròn đến 1.000 ₫ (Không dùng tiền lẻ xu)</option>
                <option value="500">Làm tròn đến 500 ₫</option>
                <option value="0">Không làm tròn (Chính xác tuyệt đối)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cấu Hình Máy In Bill K80/K57 */}
        <div className="card">
          <div className="card-header mb-4 pb-3 border-b border-[var(--border)]">
            <h3 className="card-title">Cấu Hình Máy In Hóa Đơn &amp; Phiếu Pha Chế (K80 / K57)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Khổ Giấy In Mặc Định Tại Quầy</label>
              <select className="form-input form-select" defaultValue="k80">
                <option value="k80">Khổ K80 (Khổ rộng 80mm — Tiêu chuẩn quán trà sữa)</option>
                <option value="k57">Khổ K57 (Khổ nhỏ 57mm — Máy POS cầm tay)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Chế Độ In Hóa Đơn Khi Thanh Toán</label>
              <select className="form-input form-select" defaultValue="auto">
                <option value="auto">Tự động in bill K80 ngay khi hoàn tất đơn</option>
                <option value="ask">Hỏi thu ngân trước khi in</option>
                <option value="ereceipt">Chỉ xuất hóa đơn điện tử / E-Receipt</option>
              </select>
            </div>
            <div className="col-span-full">
              <label className="form-label">Nội Dung Chân Hóa Đơn (Footer Bill)</label>
              <input
                type="text"
                className="form-input"
                defaultValue="Cảm ơn Quý khách! Pass Wifi: MilktyWay2026 · Quét mã QR để tích điểm & nhận voucher 20%"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => toast.info("Đã hủy thay đổi chưa lưu", { title: "Hủy" })}
          >
            Hủy Bỏ
          </button>
          <button type="submit" className="btn btn-primary">
            Lưu Cấu Hình
          </button>
        </div>
      </form>
    </div>
  );
}

