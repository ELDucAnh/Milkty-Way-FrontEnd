import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/useToast";

export default function RegisterPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Thu Ngân Quầy POS");
  const [branch, setBranch] = useState("CN05 — Quận 10 (Sư Vạn Hạnh)");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.warning("Mật khẩu khởi tạo phải có tối thiểu 8 ký tự!");
      return;
    }
    if (!agreeTerms) {
      toast.warning("Vui lòng đồng ý với các điều khoản bảo mật!");
      return;
    }

    toast.success(
      "Đăng ký tài khoản thành công! Vui lòng liên hệ Quản lý chi nhánh duyệt quyền truy cập.",
      { title: "Thành Công" }
    );

    setTimeout(() => {
      navigate("/login");
    }, 1200);
  }

  return (
    <div className="w-full max-w-[500px] p-4">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="auth-logo-wrap inline-flex items-center gap-3">
          <div className="w-[44px] h-[44px] rounded-2xl bg-gradient-to-br from-[#22B573] to-[#16A34A] flex items-center justify-center shadow-[0_4px_14px_rgba(34,181,115,0.35)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="white" fillOpacity="0.2" />
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M12 22V12" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M3 7l9 5 9-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2.5" fill="white" stroke="white" strokeWidth="0.5" />
            </svg>
          </div>
          <div className="text-left border-l border-[var(--border)] pl-3">
            <div className="text-2xl font-bold text-[var(--text)] leading-[1.1] tracking-[-0.3px]">
              MilktyWay
            </div>
            <div className="text-[10px] text-[var(--primary)] font-semibold tracking-[0.8px] uppercase mt-0.5">
              Hệ Thống Quản Lý Chuỗi Trà Sữa
            </div>
          </div>
        </div>
      </div>

      <div className="auth-card shadow-xl">
        <div className="text-center mb-6">
          <h1 className="auth-title">Đăng Ký Tài Khoản Nhân Viên</h1>
          <p className="auth-subtitle">
            Đăng ký tài khoản nhân sự và phân công ca làm việc tại chi nhánh.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="reg-first">
                Họ &amp; Tên Đệm <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-first"
                type="text"
                className="form-input"
                placeholder="Nguyễn Văn"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="reg-last">
                Tên <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-last"
                type="text"
                className="form-input"
                placeholder="An"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="reg-email">
              Email Nội Bộ / Cá Nhân <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="an.nv@MilktyWay.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="reg-role">
                Vị Trí Công Tác <span className="text-red-500">*</span>
              </label>
              <select
                id="reg-role"
                className="form-input form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option>Thu Ngân Quầy POS</option>
                <option>Pha Chế (Barista)</option>
                <option>Nhân Viên Kho Chi Nhánh</option>
                <option>Quản Lý Chi Nhánh</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="reg-branch">
                Gán Chi Nhánh <span className="text-red-500">*</span>
              </label>
              <select
                id="reg-branch"
                className="form-input form-select"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                required
              >
                <option>CN01 — Quận 1 (Nguyễn Huệ)</option>
                <option>CN02 — Quận 3 (Võ Văn Tần)</option>
                <option>CN03 — Quận 5 (Trần Hưng Đạo)</option>
                <option>CN04 — Quận 7 (Phú Mỹ Hưng)</option>
                <option>CN05 — Quận 10 (Sư Vạn Hạnh)</option>
                <option>CN06 — Bình Thạnh (D2)</option>
                <option>CN07 — Gò Vấp (Phan Văn Trị)</option>
                <option>CN08 — Tân Bình (Lê Văn Sỹ)</option>
                <option>CN09 — TP. Thủ Đức (Võ Văn Ngân)</option>
                <option>CN10 — Phú Nhuận (Phan Xích Long)</option>
                <option>CN11 — Tân Phú (Tân Sơn Nhì)</option>
                <option>CN12 — Quận 6 (Hậu Giang)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="reg-phone">
              Số Điện Thoại Zalo / Hotline <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-phone"
              type="tel"
              className="form-input"
              placeholder="09xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label" htmlFor="reg-password">
              Mật Khẩu Khởi Tạo <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-password"
              type="password"
              className="form-input"
              placeholder="Tối thiểu 8 ký tự..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 accent-[#22B573] mt-0.5 cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs text-[var(--muted)] cursor-pointer">
              Tôi đồng ý tuân thủ quy chuẩn bảo mật công thức pha chế và quy định thu ngân MilktyWay.
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full justify-center mt-1">
            Hoàn Tất Đăng Ký Tài Khoản
          </button>
        </form>

        <div className="auth-divider text-center mt-4 pt-3 border-t border-[var(--border)]">
          <span className="text-[13px] text-[var(--muted)]">Đã có tài khoản nhân sự? </span>
          <Link to="/login" className="text-[13px] text-[#22B573] font-semibold no-underline hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}

