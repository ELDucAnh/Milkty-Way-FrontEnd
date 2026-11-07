import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Badge from "../../components/common/Badge";
import { useToast } from "../../components/common/useToast";

export default function ProfilePage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("Nguyễn Hoàng Long");
  const [phone, setPhone] = useState("0903 123 456");
  const [address, setAddress] = useState("Số 2 Hải Triều, Phường Bến Nghé, Quận 1, TP.HCM");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || "HL";

  function handleSaveProfile(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (newPassword && newPassword.length < 8) {
      toast.warning("Mật khẩu mới phải có tối thiểu 8 ký tự!");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }
    toast.success("Đã cập nhật hồ sơ nhân sự thành công!", {
      title: "Hồ Sơ",
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
            <span className="current">Hồ sơ cá nhân</span>
          </nav>
          <h1 className="page-title">Hồ Sơ Nhân Sự &amp; Thông Tin Ca Trực</h1>
          <p className="page-subtitle">
            Thông tin tài khoản, phân công ca trực và lịch sử phiên làm việc.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => handleSaveProfile()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Lưu Thay Đổi
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="card text-center lg:col-span-1">
          <div className="w-24 h-24 text-[32px] mx-auto mb-4 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold shadow-md">
            {initials}
          </div>
          <h2 className="text-lg font-bold text-[var(--text)]">{fullName}</h2>
          <div className="text-[13px] text-[var(--primary)] font-semibold mt-1">
            Quản trị viên (Chủ Doanh Nghiệp)
          </div>
          <div className="text-xs text-[var(--muted)] mt-0.5">Mã NV: NV-ADMIN-01</div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mt-2 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Đang Trong Ca Trực Chiều
          </div>

          <div className="mt-5 pt-5 border-t border-[var(--border)]">
            <button
              type="button"
              className="btn btn-secondary btn-sm w-full justify-center"
              onClick={() =>
                toast.info("Vui lòng chọn tệp ảnh chân dung mới...", { title: "Ảnh Đại Diện" })
              }
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Đổi Ảnh Đại Diện
            </button>
          </div>

          <div className="text-left flex flex-col gap-2.5 mt-5 text-xs text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text)]">Chi Nhánh:</span>
              Trụ Sở Chính &amp; Giám sát CN05
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text)]">Email:</span>
              long.nh@MilktyWay.vn
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text)]">Hotline:</span>
              {phone}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text)]">Gia nhập:</span>
              Tháng 03/2024 (2 năm 7 tháng)
            </div>
          </div>
        </div>

        {/* Profile Form & Ca làm việc */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thông tin ca trực hiện tại */}
          <div className="card border border-emerald-200 bg-emerald-50/20">
            <div className="card-header border-b border-emerald-100 pb-3 mb-3 flex items-center justify-between">
              <h3 className="card-title text-emerald-900 m-0">Ca Làm Việc Hôm Nay (28/10/2026)</h3>
              <Badge variant="success">Ca 2 (14:00 - 22:30)</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                <span className="text-[var(--muted)] block">Thời gian mở ca:</span>
                <strong className="text-sm text-[var(--text)]">13:55 Hôm nay</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                <span className="text-[var(--muted)] block">Quỹ tiền mặt đầu ca:</span>
                <strong className="text-sm text-[var(--primary)]">1.500.000 ₫</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                <span className="text-[var(--muted)] block">Thu ngân cùng ca:</span>
                <strong className="text-sm text-[var(--text)]">Tuấn Anh (POS 1)</strong>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  toast.info("Đã mở biểu mẫu gửi yêu cầu đổi ca trực đến Admin", {
                    title: "Đổi Ca",
                  })
                }
              >
                Xin Đổi Ca Trực
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/sales/shifts")}
              >
                Đóng Ca &amp; Đối Soát Tiền Mặt
              </button>
            </div>
          </div>

          {/* Chi tiết hồ sơ */}
          <div className="card">
            <div className="card-header border-b border-[var(--border)] pb-3 mb-4">
              <h3 className="card-title">Cập Nhật Thông Tin Cá Nhân</h3>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Họ và Tên</label>
                  <input
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Số Điện Thoại Liên Lạc</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Địa Chỉ Thường Trú</label>
                  <input
                    type="text"
                    className="form-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Số CCCD / Định Danh</label>
                  <input
                    type="text"
                    className="form-input"
                    defaultValue="07919800xxxx"
                    readOnly
                  />
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4 mt-4">
                <h4 className="text-sm font-bold text-[var(--text)] mb-3">
                  Đổi Mật Khẩu Đăng Nhập
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Mật Khẩu Mới</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Tối thiểu 8 ký tự..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Xác Nhận Mật Khẩu</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Nhập lại mật khẩu mới..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Thiết bị đăng nhập gần đây */}
          <div className="card">
            <div className="card-header border-b border-[var(--border)] pb-3 mb-3 flex items-center justify-between">
              <h3 className="card-title m-0">Thiết Bị Đăng Nhập Gần Đây</h3>
              <span className="text-xs text-[var(--muted)]">Bảo mật tài khoản POS</span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    POS
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text)]">Máy POS Cảm Ứng — Quầy 1 CN05</div>
                    <div className="text-[var(--muted)]">IP: 192.168.1.105 · TP. Hồ Chí Minh</div>
                  </div>
                </div>
                <Badge variant="success">Đang hoạt động</Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    WEB
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text)]">Chrome trên Windows (Laptop điều hành)</div>
                    <div className="text-[var(--muted)]">Lần cuối: Hôm nay 10:24 · Quận 10</div>
                  </div>
                </div>
                <span className="text-[var(--muted)]">Trước đó</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

