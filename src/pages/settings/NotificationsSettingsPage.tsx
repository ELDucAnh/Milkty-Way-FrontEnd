import { Link } from "react-router-dom";
import { useToast } from "../../components/common/useToast";

export default function NotificationsSettingsPage() {
  const toast = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Đã lưu cấu hình thông báo và cảnh báo sự cố!", {
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
            <span className="current">Thông báo</span>
          </nav>
          <h1 className="page-title">Cấu Hình Cảnh Báo Tự Động &amp; Kịch Bản Sự Cố</h1>
          <p className="page-subtitle">
            Cấu hình kênh cảnh báo tự động cho sự cố kết nối, tồn kho và điểm hòa vốn.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        {/* Cảnh báo FEFO & Kho Hàng */}
        <div className="card">
          <div className="card-header mb-4 pb-3 border-b border-[var(--border)]">
            <h3 className="card-title">Cảnh Báo Hạn Sử Dụng FEFO &amp; Tồn An Toàn</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[var(--border)]">
              <div>
                <div className="font-bold text-[var(--text)] text-sm">
                  Cảnh Báo Lô Hàng Cận Date (Trước 7 ngày và 48 giờ)
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  Tự động đẩy thông báo chuông và popup nhắc nhở thủ kho / barista ưu tiên xuất lô FEFO.
                </div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 accent-[#22B573] cursor-pointer mt-1"
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[var(--border)]">
              <div>
                <div className="font-bold text-[var(--text)] text-sm">
                  Cảnh Báo Nguyên Liệu Dưới Tồn An Toàn (Safety Stock Alert)
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  Phát tín hiệu khi sữa tươi &lt; 15 hộp, trà lá &lt; 5kg, ly nắp &lt; 500 cái để kịp tạo phiếu điều chuyển cấp cứu.
                </div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 accent-[#22B573] cursor-pointer mt-1"
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[var(--border)]">
              <div>
                <div className="font-bold text-[var(--text)] text-sm">
                  Nhắc Nhở Hủy Trân Châu Đã Nấu Quá 4 Giờ
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  Chuông báo trên màn hình Barista khi nồi trân châu đạt mốc 3h45 để chuẩn bị nấu nồi mới hoặc hủy hạt thừa.
                </div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 accent-[#22B573] cursor-pointer mt-1"
              />
            </div>
          </div>
        </div>

        {/* Cảnh Báo Vận Hành & Tài Chính Đặc Tả Mục 11 */}
        <div className="card">
          <div className="card-header mb-4 pb-3 border-b border-[var(--border)]">
            <h3 className="card-title">Cảnh Báo Sự Cố Mạng POS &amp; Điểm Hòa Vốn</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-red-200 bg-red-50/20">
              <div>
                <div className="font-bold text-red-700 text-sm">
                  Cảnh Báo Chi Nhánh Dưới Điểm Hòa Vốn (Mục 11 Đặc Tả)
                </div>
                <div className="text-xs text-red-600 mt-0.5">
                  Gửi email khẩn cấp đến Chủ Doanh Nghiệp khi doanh thu chi nhánh thấp hơn điểm hòa vốn liên tục 4 tuần hoặc 3 tháng.
                </div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 accent-red-600 cursor-pointer mt-1"
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[var(--border)]">
              <div>
                <div className="font-bold text-[var(--text)] text-sm">
                  Cảnh Báo Mất Mạng POS &amp; Kích Hoạt Chế Độ Bán Offline
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  Tự động phát thông báo màu vàng trên màn hình thu ngân: "Đang bán Offline — Dữ liệu lưu an toàn trên máy".
                </div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 accent-[#22B573] cursor-pointer mt-1"
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[var(--border)]">
              <div>
                <div className="font-bold text-[var(--text)] text-sm">
                  Cảnh Báo Đơn Online Quá 3 Phút Chưa Xác Nhận
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  Phát âm thanh chuông lớn cảnh báo thu ngân trước khi đơn bị hệ thống tự động hủy hoặc chuyển chi nhánh khác (ở mốc 5 phút).
                </div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 accent-[#22B573] cursor-pointer mt-1"
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
            Lưu Cấu Hình Cảnh Báo
          </button>
        </div>
      </form>
    </div>
  );
}

