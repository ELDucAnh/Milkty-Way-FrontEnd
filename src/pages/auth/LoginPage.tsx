import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/useToast";

export default function LoginPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState("manager");
  const [branch, setBranch] = useState("CN05");
  const [email, setEmail] = useState("ha.tt@MilktyWay.vn");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  function handleRoleChange(newRole: string) {
    setRole(newRole);
    if (newRole === "owner") {
      setEmail("admin@MilktyWay.vn");
    } else if (newRole === "manager") {
      setEmail("ha.tt@MilktyWay.vn");
    } else if (newRole === "cashier") {
      setEmail("anh.lqt@MilktyWay.vn");
    } else if (newRole === "warehouse") {
      setEmail("khoa.vm@MilktyWay.vn");
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.warning("Vui lòng nhập đầy đủ tài khoản và mật khẩu");
      return;
    }

    toast.success("Đăng nhập thành công! Đang chuyển hướng vào hệ thống...", {
      title: "Xác Thực Thành Công",
    });

    setTimeout(() => {
      navigate("/dashboard");
    }, 800);
  }

  return (
    <div className="w-full max-w-[480px] p-4">
      {/* Logo MilktyWay */}
      <div className="text-center mb-6">
        <div className="auth-logo-wrap inline-flex items-center gap-3">
          <div className="w-[46px] h-[46px] rounded-2xl bg-gradient-to-br from-[#22B573] to-[#16A34A] flex items-center justify-center shadow-[0_4px_14px_rgba(34,181,115,0.35)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="white" fillOpacity="0.2" />
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M12 22V12" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M3 7l9 5 9-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2.5" fill="white" stroke="white" strokeWidth="0.5" />
            </svg>
          </div>
          <div className="text-left border-l border-[var(--border)] pl-3">
            <div className="text-2xl font-extrabold text-[var(--text)] leading-[1.1] tracking-[-0.3px]">
              MilktyWay
            </div>
            <div className="text-[10px] text-[var(--primary)] font-bold tracking-[0.8px] uppercase mt-0.5">
              Hệ Thống Quản Lý Chuỗi Trà Sữa
            </div>
          </div>
        </div>
      </div>

      {/* Login Card */}
      <div className="auth-card shadow-xl">
        <div className="text-center mb-6">
          <h1 className="auth-title">Đăng Nhập Hệ Thống</h1>
          <p className="auth-subtitle">Đăng nhập để bắt đầu phiên làm việc.</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Vai Trò Nghiệp Vụ */}
          <div>
            <label className="form-label" htmlFor="login-role">
              Vai Trò Đăng Nhập <span className="text-red-500">*</span>
            </label>
            <select
              id="login-role"
              className="form-input form-select"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              <option value="owner">Chủ Doanh Nghiệp (Ban Giám Đốc — Toàn Chuỗi)</option>
              <option value="manager">Quản Lý Chi Nhánh (Store Manager)</option>
              <option value="cashier">Thu Ngân Bán Hàng (Counter POS)</option>
              <option value="warehouse">Nhân Viên Kho Chi Nhánh (Thủ Kho FEFO)</option>
            </select>
          </div>

          {/* Chi Nhánh Làm Việc */}
          <div style={{ opacity: role === "owner" ? 0.5 : 1 }}>
            <label className="form-label" htmlFor="login-branch">
              Chi Nhánh Công Tác <span className="text-red-500">*</span>
            </label>
            <select
              id="login-branch"
              className="form-input form-select"
              value={branch}
              disabled={role === "owner"}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="CN01">CN01 — Quận 1 (Nguyễn Huệ)</option>
              <option value="CN02">CN02 — Quận 3 (Võ Văn Tần)</option>
              <option value="CN03">CN03 — Quận 5 (Trần Hưng Đạo)</option>
              <option value="CN04">CN04 — Quận 7 (Phú Mỹ Hưng)</option>
              <option value="CN05">CN05 — Quận 10 (Sư Vạn Hạnh)</option>
              <option value="CN06">CN06 — Bình Thạnh (D2 / Nguyễn Gia Trí)</option>
              <option value="CN07">CN07 — Gò Vấp (Phan Văn Trị)</option>
              <option value="CN08">CN08 — Tân Bình (Lê Văn Sỹ)</option>
              <option value="CN09">CN09 — TP. Thủ Đức (Võ Văn Ngân)</option>
              <option value="CN10">CN10 — Phú Nhuận (Phan Xích Long)</option>
              <option value="CN11">CN11 — Tân Phú (Tân Sơn Nhì)</option>
              <option value="CN12">CN12 — Quận 6 (Hậu Giang)</option>
              <option value="KHO_TONG">Kho Tổng Trung Tâm (Bình Tân)</option>
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="login-email">
              Tài Khoản / Email Nội Bộ <span className="text-red-500">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="form-label mb-0" htmlFor="login-password">
                Mật Khẩu
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-[#22B573] no-underline font-medium hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className="form-input pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-[var(--muted)] p-0"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Hiển thị hoặc ẩn mật khẩu"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-[#22B573] cursor-pointer"
            />
            <label htmlFor="remember-me" className="text-[13px] text-[var(--text)] cursor-pointer">
              Ghi nhớ đăng nhập trên thiết bị này
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full justify-center mt-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Đăng Nhập Vào Hệ Thống
          </button>
        </form>

        <div className="auth-divider text-center mt-4 pt-3 border-t border-[var(--border)]">
          <span className="text-[13px] text-[var(--muted)]">Chưa có tài khoản nội bộ? </span>
          <Link to="/register" className="text-[13px] text-[#22B573] font-semibold no-underline hover:underline">
            Đăng ký tài khoản
          </Link>
        </div>
      </div>

      {/* Demo credentials cho 4 vai trò */}
      <div className="auth-demo-box mt-4 p-3 bg-white/80 dark:bg-zinc-800/80 rounded-xl border border-[var(--border)] text-xs shadow-sm">
        <div className="font-bold text-[var(--text)] mb-1">
          Tài Khoản Mẫu Cho 4 Vai Trò Nghiệp Vụ:
        </div>
        <div className="text-[var(--muted)] space-y-0.5">
          <div>• <strong>Chủ Doanh Nghiệp:</strong> admin@MilktyWay.vn (Toàn chuỗi)</div>
          <div>• <strong>Quản Lý CN:</strong> ha.tt@MilktyWay.vn (CN05 Sư Vạn Hạnh)</div>
          <div>• <strong>Thu Ngân POS:</strong> anh.lqt@MilktyWay.vn (POS Bán Quầy)</div>
          <div>• <strong>Thủ Kho FEFO:</strong> khoa.vm@MilktyWay.vn (Kho Chi Nhánh)</div>
          <div className="text-emerald-600 font-semibold mt-1">
            Mật khẩu thử nghiệm: <strong>123456</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

