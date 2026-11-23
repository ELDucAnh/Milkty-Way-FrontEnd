import { loginByEmail, homePath } from "../../utils/auth";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/useToast";

export default function LoginPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("long.nh@milktyway.vn");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  function handleQuickSelect(targetEmail: string) {
    setEmail(targetEmail);
    setPassword("123456");
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const matchedRole = loginByEmail(email, password, rememberMe);
    if (!matchedRole) {
      toast.warning("Tài khoản email hoặc mật khẩu chưa đúng.");
      return;
    }

    toast.success("Đăng nhập thành công! Đang chuyển hướng vào hệ thống...", {
      title: "Xác Thực Thành Công",
    });

    navigate(homePath(matchedRole), { replace: true });
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
          <p className="auth-subtitle">Nhập tài khoản nội bộ để bắt đầu phiên làm việc.</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
              placeholder="ten.nv@milktyway.vn"
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

      {/* Demo credentials cho các vai trò */}
      <div className="auth-demo-box mt-4 p-3 bg-white/80 dark:bg-zinc-800/80 rounded-xl border border-[var(--border)] text-xs shadow-sm">
        <div className="font-bold text-[var(--text)] mb-1.5">
          Chọn nhanh tài khoản mẫu (Tự động nhận diện vai trò &amp; chi nhánh):
        </div>
        <div className="text-[var(--muted)] space-y-1">
          {[
            { role: "Chủ Doanh Nghiệp", email: "long.nh@milktyway.vn", note: "Toàn chuỗi" },
            { role: "Quản Lý CN", email: "ha.tt@milktyway.vn", note: "CN05 Hàng Xanh" },
            { role: "Thu Ngân POS", email: "anh.lqt@milktyway.vn", note: "CN01 POS Quầy 1" },
            { role: "Thủ Kho FEFO", email: "khoa.vm@milktyway.vn", note: "Kho Tổng & Điều Phối CN" },
          ].map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => handleQuickSelect(acc.email)}
              className="block w-full text-left rounded-md px-1.5 py-0.5 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
            >
              • <strong>{acc.role}:</strong> <span className="text-[var(--primary)] underline">{acc.email}</span> ({acc.note})
            </button>
          ))}
          <div className="text-emerald-600 font-semibold mt-1">
            Mật khẩu thử nghiệm: <strong>123456</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

