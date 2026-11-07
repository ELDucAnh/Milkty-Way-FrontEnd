import { Link } from "react-router-dom";
import { useToast } from "../../components/common/useToast";

export default function PurchasesSettingsPage() {
  const toast = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Đã lưu cấu hình thu mua & điều chuyển kho thành công!", {
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
            <span className="current">Cài đặt nhập hàng</span>
          </nav>
          <h1 className="page-title">Cấu Hình Thu Mua &amp; Điều Chuyển Cấp Cứu</h1>
          <p className="page-subtitle">
            Cấu hình tiêu chuẩn kiểm nghiệm nguyên liệu và quy trình điều chuyển nội bộ.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        {/* Nghiệm thu đầu vào & HSD tối thiểu */}
        <div className="card">
          <div className="card-header mb-4 pb-3 border-b border-[var(--border)]">
            <h3 className="card-title">Tiêu Chuẩn Nghiệm Thu Nguyên Liệu Đầu Vào (ATVSTP &amp; HSD)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Hạn Dùng Tối Thiểu Khi Nhận Nguyên Liệu Khô / Bột Sữa / Trà
              </label>
              <select className="form-input form-select" defaultValue="70">
                <option value="70">Tối thiểu 70% tổng thời hạn sử dụng ghi trên bao bì</option>
                <option value="80">Tối thiểu 80%</option>
                <option value="6m">Tối thiểu 6 tháng</option>
              </select>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                Từ chối nhận hàng nếu nhà cung cấp giao lô hàng cận date không đạt chuẩn.
              </div>
            </div>
            <div>
              <label className="form-label">
                Hạn Dùng Tối Thiểu Đối Với Sữa Tươi Thanh Trùng &amp; Trái Cây
              </label>
              <select className="form-input form-select" defaultValue="10d">
                <option value="10d">Tối thiểu 10 ngày (Sữa thanh trùng 100% Vinamilk/IDP)</option>
                <option value="7d">Tối thiểu 7 ngày</option>
              </select>
            </div>
            <div className="col-span-full">
              <label className="form-label">
                Bắt Buộc Chụp Ảnh Phiếu Kiểm Nghiệm &amp; Mã Lô (Lot Number)
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="require-batch-cert"
                  defaultChecked
                  className="w-4 h-4 accent-[#22B573] cursor-pointer"
                />
                <label
                  htmlFor="require-batch-cert"
                  className="text-xs text-[var(--text)] cursor-pointer"
                >
                  Bắt buộc thủ kho nhập số Lô và tải ảnh kiểm định ATVSTP khi bấm hoàn tất phiếu nhập hàng PO.
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Điều Chuyển Kho Cấp Cứu Giữa 12 Chi Nhánh */}
        <div className="card">
          <div className="card-header mb-4 pb-3 border-b border-[var(--border)]">
            <h3 className="card-title">Quy Chuẩn Điều Chuyển Nguyên Liệu Khẩn Cấp (Stock Transfers)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Quy Trình Duyệt Chuyển Kho Cấp Cứu</label>
              <select className="form-input form-select" defaultValue="3steps">
                <option value="3steps">
                  3 Bước: Yêu cầu → Đang vận chuyển → Xác nhận nhận (Giữ nguyên Lô &amp; EXP)
                </option>
                <option value="auto">Tự động xuất ngay khi Quản lý gửi yêu cầu</option>
              </select>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                Hệ thống bảo toàn đúng mã Lô và hạn sử dụng FEFO sang kho chi nhánh mới.
              </div>
            </div>
            <div>
              <label className="form-label">Bán Kính Ưu Tiên Gợi Ý Chi Nhánh Điều Chuyển</label>
              <select className="form-input form-select" defaultValue="5km">
                <option value="5km">Dưới 5 km (Thời gian xe máy vận chuyển &lt; 20 phút)</option>
                <option value="10km">Dưới 10 km</option>
                <option value="all">Toàn bộ 12 chi nhánh trong TP.HCM</option>
              </select>
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
            Lưu Cấu Hình Mua Hàng
          </button>
        </div>
      </form>
    </div>
  );
}

