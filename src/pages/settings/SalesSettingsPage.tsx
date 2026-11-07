import { Link } from "react-router-dom";
import { useToast } from "../../components/common/useToast";

export default function SalesSettingsPage() {
  const toast = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Đã lưu cấu hình bán hàng & kênh online!", {
      title: "Đã Lưu",
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
            <span className="current">Cài đặt bán hàng</span>
          </nav>
          <h1 className="page-title">Cấu Hình Bán Hàng POS &amp; Kênh Online</h1>
          <p className="page-subtitle">
            Cấu hình quy trình bán hàng tại quầy, xử lý đơn trực tuyến và chính sách hội viên.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        {/* Đơn Hàng Online & Timeout Sự Cố */}
        <div className="card">
          <div className="card-header mb-4 pb-3 border-b border-[var(--border)]">
            <h3 className="card-title">Cấu Hình Đơn Hàng Trực Tuyến &amp; Xử Lý Mất Kết Nối</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Thời Gian Tự Động Hủy Đơn Online Khi Mất Kết Nối</label>
              <select className="form-input form-select" defaultValue="5m">
                <option value="5m">5 phút (Chuẩn đặc tả F&amp;B — Tránh trễ hẹn shipper)</option>
                <option value="3m">3 phút</option>
                <option value="10m">10 phút</option>
              </select>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                Nếu chi nhánh mất mạng hoặc không xác nhận sau thời gian này, đơn sẽ tự chuyển sang chi nhánh lân cận còn hàng.
              </div>
            </div>
            <div>
              <label className="form-label">Tự Động Nhận Đơn (Auto-Accept Delivery)</label>
              <select className="form-input form-select" defaultValue="auto">
                <option value="auto">Tự động nhận đơn và in phiếu pha chế (KOT)</option>
                <option value="manual">Thu ngân phải bấm xác nhận thủ công trên màn hình</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quy Chuẩn Bán Hàng Tại Quầy POS */}
        <div className="card">
          <div className="card-header mb-4 pb-3 border-b border-[var(--border)]">
            <h3 className="card-title">Cấu Hình Màn Hình Thu Ngân Touch POS</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Mức Đường &amp; Đá Mặc Định Cho Món Mới</label>
              <select className="form-input form-select" defaultValue="100">
                <option value="100">100% Đường · 100% Đá (Công thức chuẩn món)</option>
                <option value="70">70% Đường · 70% Đá (Ít ngọt)</option>
                <option value="50">50% Đường · 50% Đá</option>
              </select>
            </div>
            <div>
              <label className="form-label">Bắt Buộc Khai Báo Tiền Đầu Ca &amp; Đối Soát Cuối Ca</label>
              <select className="form-input form-select" defaultValue="yes">
                <option value="yes">Bắt buộc (Nhập quỹ tiền lẻ ban đầu trước khi mở bán)</option>
                <option value="no">Không bắt buộc</option>
              </select>
            </div>
            <div>
              <label className="form-label">Tỷ Lệ Tích Điểm Hội Viên Chuỗi (Loyalty)</label>
              <select className="form-input form-select" defaultValue="10k">
                <option value="10k">10.000 ₫ = 1 điểm (1% giá trị thanh toán)</option>
                <option value="20k">20.000 ₫ = 1 điểm</option>
              </select>
            </div>
            <div>
              <label className="form-label">Thời Hạn Giữ Hạng &amp; Reset Điểm Hội Viên</label>
              <select className="form-input form-select" defaultValue="12m">
                <option value="12m">12 Tháng kể từ ngày tích lũy (Chuẩn đặc tả mục 10)</option>
                <option value="endyear">Cuối năm tài chính (31/12 hàng năm)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="reset"
            className="btn btn-secondary"
            onClick={() => toast.info("Đã khôi phục về giá trị mặc định", { title: "Hủy Bỏ" })}
          >
            Hủy Bỏ
          </button>
          <button type="submit" className="btn btn-primary">
            Lưu Cấu Hình Bán Hàng
          </button>
        </div>
      </form>
    </div>
  );
}

