import { Link } from "react-router-dom";
import { useToast } from "../../components/common/useToast";

export default function InventorySettingsPage() {
  const toast = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Đã lưu cấu hình kho và quy tắc FEFO thành công!", {
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
            <span className="current">Cài đặt kho</span>
          </nav>
          <h1 className="page-title">Cấu Hình Quản Lý Kho &amp; Quy Tắc Xuất FEFO</h1>
          <p className="page-subtitle">
            Cấu hình định mức tồn an toàn, nguyên tắc xuất kho FEFO và hao hụt pha chế.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        {/* Quy tắc FEFO & Xuất kho */}
        <div className="card">
          <div className="card-header mb-4 pb-3 border-b border-[var(--border)]">
            <h3 className="card-title">Quy Chuẩn Xuất Kho FEFO (First-Expired, First-Out)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="fefo-enforcement">
                Cơ Chế Bắt Buộc Xuất Lô Theo Hạn Dùng (FEFO)
              </label>
              <select id="fefo-enforcement" className="form-input form-select" defaultValue="force">
                <option value="force">Bắt buộc 100% (Hệ thống tự động chọn Lô có EXP gần nhất)</option>
                <option value="warn">Cảnh báo nhắc nhở (Cho phép thủ kho chọn lô khác nếu có lý do)</option>
              </select>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                Đảm bảo nguyên vật liệu sắp hết hạn được sử dụng trước, chống ứ đọng hủy hàng.
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="exp-warning-days">
                Thời Gian Bắt Đầu Cảnh Báo Cận Date (Ngày)
              </label>
              <input
                id="exp-warning-days"
                type="number"
                className="form-input"
                defaultValue={7}
                min={1}
                max={30}
              />
              <div className="text-[11px] text-[var(--muted)] mt-1">
                Lô hàng có hạn dùng dưới số ngày này sẽ được tô đỏ trên dashboard toàn chuỗi.
              </div>
            </div>
            <div className="col-span-full">
              <label className="form-label">
                Quy Định Hủy Trân Châu Đã Nấu Chín Quá Thời Gian
              </label>
              <select className="form-input form-select" defaultValue="4h">
                <option value="4h">Hủy bắt buộc sau 4 giờ (Đảm bảo độ dẻo dai và ATVSTP)</option>
                <option value="6h">Cho phép lưu tối đa 6 giờ trong nồi ủ ấm 60°C</option>
              </select>
            </div>
          </div>
        </div>

        {/* Định mức hao hụt & Kiểm kê mù */}
        <div className="card">
          <div className="card-header mb-4 pb-3 border-b border-[var(--border)]">
            <h3 className="card-title">Định Mức Hao Hụt Pha Chế &amp; Kiểm Kê Mù (Blind Audit)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tỷ Lệ Hao Hụt Pha Chế Cho Phép Tối Đa (%)</label>
              <input
                type="number"
                className="form-input"
                defaultValue={2.5}
                step={0.1}
                min={0}
                max={10}
              />
              <div className="text-[11px] text-[var(--muted)] mt-1">
                Bao gồm bám dính bình lắc, ca đong và hao hụt đá tan (Mặc định 2.5%).
              </div>
            </div>
            <div>
              <label className="form-label">Chế Độ Kiểm Kê Kho Chi Nhánh</label>
              <select className="form-input form-select" defaultValue="blind">
                <option value="blind">Kiểm kê mù (Blind Count — Ẩn số tồn hệ thống khi nhân viên đếm)</option>
                <option value="open">Kiểm kê mở (Hiển thị số tồn hệ thống đối chiếu trực tiếp)</option>
              </select>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                Kiểm kê mù giúp ngăn chặn việc nhân viên điền số khống mà không đếm thực tế.
              </div>
            </div>
            <div>
              <label className="form-label">Tần Suất Kiểm Kê Bắt Buộc</label>
              <select className="form-input form-select" defaultValue="weekly">
                <option value="weekly">Hàng tuần (Chủ nhật cuối ca tối)</option>
                <option value="daily">Hàng ngày sau khi đóng ca bán</option>
                <option value="biweekly">2 tuần 1 lần</option>
              </select>
            </div>
            <div>
              <label className="form-label">Thẩm Quyền Phê Duyệt Biên Bản Hủy Hàng</label>
              <select className="form-input form-select" defaultValue="manager">
                <option value="manager">Quản lý chi nhánh (Đơn dưới 2 triệu) / Giám đốc (&gt; 2 triệu)</option>
                <option value="director">Chỉ Giám Đốc điều hành</option>
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
            Lưu Cấu Hình Kho
          </button>
        </div>
      </form>
    </div>
  );
}

