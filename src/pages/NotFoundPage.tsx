import { Link, useNavigate } from "react-router-dom";
import { homePath } from "../utils/auth";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="max-w-[520px] w-full text-center">
        <div className="text-[110px] font-black text-[var(--primary)] leading-none mb-0 opacity-30 select-none">
          404
        </div>
        <div className="auth-card -mt-4 relative z-[1] px-7 py-8 shadow-xl text-center">
          <div className="stat-icon icon-bg-primary w-[68px] h-[68px] rounded-[20px] mx-auto mb-4 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h1 className="auth-title text-[24px] mb-2">Không Tìm Thấy Trang</h1>
          <p className="auth-subtitle leading-relaxed mb-6 text-xs text-[var(--muted)]">
            Đường dẫn bạn yêu cầu không tồn tại hoặc đã được thay đổi trong hệ thống điều hành.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to={homePath()} className="btn btn-primary btn-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Về Trang Tổng Quan
            </Link>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => navigate(-1)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Quay Lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
