import { cashierCanVisit, cashierName, isCashier } from "../../utils/auth";
import { useState } from "react";
import { Link } from "react-router-dom";
import avatar from "../../../assets/img/avator/1.jpg";
import { navigationItems } from "../../routes/navigation";
import Modal from "../common/Modal";

export interface HeaderProps {
  mobileOpen: boolean;
  isDark: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
}

interface NotificationItemData {
  id: string;
  title: string;
  message: string;
  time: string;
  category: "all" | "inventory" | "sales" | "shifts";
  unread: boolean;
  tone: "warning" | "success" | "info" | "danger" | "primary";
}

const INITIAL_NOTIFICATIONS: NotificationItemData[] = [
  {
    id: "notif-1",
    title: "Cảnh Báo Tồn Kho Thấp & Cận Date FEFO",
    message: "Cốt hồng trà đặc tại CN05 chỉ còn 1,2 lít (dưới ngưỡng an toàn ca chiều)",
    time: "5 phút trước",
    category: "inventory",
    unread: true,
    tone: "warning",
  },
  {
    id: "notif-2",
    title: "Đơn Hàng Mới Tại Quầy",
    message: "HD-CN01-003815 vừa lập thành công: 285.000 ₫ (Khách VIP Diamond).",
    time: "18 phút trước",
    category: "sales",
    unread: true,
    tone: "success",
  },
  {
    id: "notif-3",
    title: "Thanh Toán Thành Công",
    message: "Đã nhận 450.000 ₫ qua Chuyển khoản QR tại Quầy POS 01.",
    time: "1 giờ trước",
    category: "sales",
    unread: true,
    tone: "info",
  },
  {
    id: "notif-4",
    title: "Phiếu Nhập Kho Chờ Phê Duyệt",
    message: "PNK-202610-008 chờ thủ kho xác nhận kiểm nhận 50kg Trân châu hoàng kim.",
    time: "2 giờ trước",
    category: "inventory",
    unread: true,
    tone: "danger",
  },
  {
    id: "notif-5",
    title: "Điều Chuyển Nguyên Liệu Khẩn Cấp",
    message: "Đã cấp phát 20kg Trân châu hoàng kim từ Khu chế biến sang CN10.",
    time: "Hôm qua",
    category: "inventory",
    unread: false,
    tone: "primary",
  },
  {
    id: "notif-6",
    title: "Bàn Giao Ca Thành Công",
    message: "Ca sáng CN01 đã bàn giao két 2.098.000 ₫ cho ca chiều, tiền mặt khớp 100%.",
    time: "Hôm qua",
    category: "shifts",
    unread: false,
    tone: "success",
  },
  {
    id: "notif-7",
    title: "Phê Duyệt Đổi Trả / Hoàn Tiền",
    message: "Yêu cầu hoàn tiền HT-0002 (45.000 ₫) đã được Quản lý duyệt hoàn tiền mặt.",
    time: "2 ngày trước",
    category: "sales",
    unread: false,
    tone: "info",
  },
  {
    id: "notif-8",
    title: "Đối Soát Tiêu Hao Ca Trực",
    message: "Biên bản đối soát ca tối CN06 ghi nhận khớp 100% định mức BOM.",
    time: "3 ngày trước",
    category: "shifts",
    unread: false,
    tone: "primary",
  },
];

export default function Header({
  mobileOpen,
  isDark,
  onToggleSidebar,
  onToggleTheme,
}: HeaderProps) {
  const cashier = isCashier();
  const [notifications, setNotifications] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "inventory" | "sales" | "shifts">("all");
  const [notificationsList, setNotificationsList] = useState<NotificationItemData[]>(cashier ? [] : INITIAL_NOTIFICATIONS);
  const [userOpen, setUserOpen] = useState(false);
  const [query, setQuery] = useState("");

  const unreadCount = notificationsList.filter((n) => n.unread).length;

  const filteredNotifications = notificationsList.filter((n) => {
    if (activeTab === "all") return true;
    return n.category === activeTab;
  });

  function handleMarkAllAsRead() {
    setNotificationsList((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  function handleClearRead() {
    setNotificationsList((prev) => prev.filter((n) => n.unread));
  }

  function handleToggleRead(id: string) {
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    );
  }

  return (
    <header id="app-header" data-theme={isDark ? "dark" : "light"}>
      <button
        onClick={onToggleSidebar}
        aria-expanded={mobileOpen}
        id="sidebar-toggle-btn"
        className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
        style={{
          color: "var(--muted)",
          border: "none",
          background: "none",
          cursor: "pointer",
          flexShrink: "0",
        }}
        aria-label="Mở hoặc đóng thanh điều hướng"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="flex-1 max-w-md relative search-box" id="global-search-box">
        <svg
          className="search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          aria-label="Tìm kiếm toàn hệ thống"
          onChange={(e) => setQuery(e.target.value)}
          value={query}
          id="global-search-input"
          type="text"
          placeholder="Tìm kiếm món, hội viên, hóa đơn, nguyên liệu..."
          className="form-input"
          style={{ height: "40px", fontSize: "13px", background: "var(--background)" }}
          autoComplete="off"
        />
        {query && (
          <div className="global-search-dropdown" style={{ display: "block" }}>
            {navigationItems.filter(item => !cashier || cashierCanVisit(item.path))
              .filter((item) =>
                item.label.toLocaleLowerCase("vi-VN").includes(query.toLocaleLowerCase("vi-VN"))
              )
              .map((item) => (
                <Link
                  key={item.path}
                  className="dropdown-item"
                  to={item.path}
                  onClick={() => setQuery("")}
                >
                  {item.label}
                </Link>
              ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onToggleTheme}
          id="dark-mode-btn"
          className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
          style={{ color: "var(--muted)", border: "none", background: "none", cursor: "pointer" }}
          aria-label="Chuyển chế độ sáng hoặc tối"
        >
          <svg
            id="dark-mode-icon-moon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: isDark ? "none" : "block" }}
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <svg
            id="dark-mode-icon-sun"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: isDark ? "block" : "none" }}
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </button>

        {/* Dropdown Chuông Thông Báo */}
        <div className="relative" id="notification-dropdown-wrapper">
          <button
            onClick={() => {
              setNotifications((v) => !v);
              setUserOpen(false);
            }}
            id="notification-btn"
            className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors relative"
            style={{ color: "var(--muted)", border: "none", background: "none", cursor: "pointer" }}
            aria-label="Thông báo"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full"
                style={{ background: "#EF4444" }}
              ></span>
            )}
          </button>
          <div
            id="notification-dropdown"
            className="dropdown-menu"
            style={{
              display: notifications ? "block" : "none",
              right: 0,
              width: "min(340px, 90vw)",
              maxHeight: 440,
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--text)" }}>
                Thông báo
              </span>
              {unreadCount > 0 ? (
                <span className="badge badge-danger">{unreadCount} Mới</span>
              ) : (
                <span className="badge badge-success">Đã đọc hết</span>
              )}
            </div>
            <div style={{ overflowY: "auto", maxHeight: "320px" }}>
              {notificationsList.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className={`notification-item ${item.unread ? "unread" : ""}`}
                  onClick={() => handleToggleRead(item.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    className={`stat-icon icon-bg-${item.tone} flex-shrink-0`}
                    style={{ width: "36px", height: "36px", borderRadius: "10px" }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                      {item.message}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                      {item.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid var(--border)",
                textAlign: "center",
              }}
            >
              {/* Mở Popup Modal riêng chứ không redirect sang trang cài đặt cảnh báo */}
              <button
                type="button"
                onClick={() => {
                  setNotifications(false);
                  setShowAllModal(true);
                }}
                className="w-full text-center text-xs font-semibold text-[var(--primary)] hover:underline bg-transparent border-0 cursor-pointer py-1"
              >
                Xem tất cả thông báo ({notificationsList.length}) →
              </button>
            </div>
          </div>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" id="user-dropdown-wrapper">
          <button
            onClick={() => {
              setUserOpen((v) => !v);
              setNotifications(false);
            }}
            id="user-menu-btn"
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--background)] transition-colors"
            style={{ border: "none", background: "none", cursor: "pointer" }}
          >
            <img
              src={avatar}
              alt={cashier ? cashierName() : "Nguyễn Hoàng Long"}
              className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ objectFit: "cover" }}
            />
            <div className="text-left hidden sm:block">
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "var(--text)",
                  lineHeight: "1.2",
                }}
              >
                {cashier ? cashierName() : "Nguyễn Hoàng Long"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>{cashier ? "Nhân viên POS" : "Quản trị viên"}</div>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--muted)" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div
            id="user-dropdown"
            className="dropdown-menu"
            style={{ display: userOpen ? "block" : "none", right: 0, minWidth: 200 }}
          >
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>
                {cashier ? cashierName() : "Nguyễn Hoàng Long"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>{cashier ? "anh.lqt@MilktyWay.vn" : "long.nh@MilktyWay.vn"}</div>
            </div>
            <Link
              to="/profile"
              onClick={() => setUserOpen(false)}
              className="dropdown-item"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Hồ sơ cá nhân
            </Link>
            {!cashier && (<Link
              to="/settings/general"
              onClick={() => setUserOpen(false)}
              className="dropdown-item"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M2 12h2M20 12h2M6.34 5.34L4.93 4.93M19.07 19.07l-1.41-1.41M12 2v2M12 20v2" />
              </svg>
              Cài đặt hệ thống
            </Link>)}
            <div className="dropdown-divider"></div>
            <Link
              to="/logout"
              onClick={() => setUserOpen(false)}
              className="dropdown-item danger"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Đăng xuất
            </Link>
          </div>
        </div>
      </div>

      {/* Modal Popup Trung Tâm Thông Báo Độc Lập */}
      <Modal
        open={showAllModal}
        title="Trung Tâm Thông Báo Toàn Hệ Thống"
        size="xl"
        onClose={() => setShowAllModal(false)}
        footer={
          <div className="flex justify-between items-center w-full flex-wrap gap-3">
            {!cashier && (<Link
              to="/settings/notifications"
              onClick={() => setShowAllModal(false)}
              className="text-xs text-[var(--muted)] hover:text-[var(--primary)] flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M2 12h2M20 12h2M6.34 5.34L4.93 4.93M19.07 19.07l-1.41-1.41M12 2v2M12 20v2" />
              </svg>
              Cấu hình kịch bản sự cố tự động
            </Link>)}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAllModal(false)}
            >
              Đóng
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Header Actions & Filter Tabs */}
          <div className="flex justify-between items-center flex-wrap gap-2.5 pb-2 border-b border-[var(--border)]">
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "all" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveTab("all")}
              >
                Tất cả ({notificationsList.length})
              </button>
              {!cashier && (<button
                type="button"
                className={`btn btn-sm ${activeTab === "inventory" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveTab("inventory")}
              >
                Kho &amp; Hạn FEFO (
                {notificationsList.filter((n) => n.category === "inventory").length})
              </button>)}
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "sales" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveTab("sales")}
              >
                Bán hàng &amp; POS (
                {notificationsList.filter((n) => n.category === "sales").length})
              </button>
              {!cashier && (<button
                type="button"
                className={`btn btn-sm ${activeTab === "shifts" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveTab("shifts")}
              >
                Ca trực &amp; Phê duyệt (
                {notificationsList.filter((n) => n.category === "shifts").length})
              </button>)}
            </div>

            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleMarkAllAsRead}
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm !text-[var(--danger)]"
                onClick={handleClearRead}
              >
                Xóa thông báo cũ
              </button>
            </div>
          </div>

          {/* Danh sách thông báo dạng Card */}
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-10 text-[var(--muted)] text-sm">
                Không có thông báo nào trong mục này.
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleRead(item.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    item.unread
                      ? "bg-[rgba(34,181,115,0.04)] border-[var(--primary)] shadow-sm"
                      : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--background)]"
                  }`}
                >
                  <div
                    className={`stat-icon icon-bg-${item.tone} flex-shrink-0 mt-0.5`}
                    style={{ width: "40px", height: "40px", borderRadius: "12px" }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[var(--text)] m-0 truncate">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.unread && (
                          <span className="w-2 h-2 rounded-full bg-[var(--danger)]" title="Chưa đọc"></span>
                        )}
                        <span className="text-xs text-[var(--muted)]">{item.time}</span>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--body-text)] mt-1 mb-0 leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex gap-2 items-center mt-2">
                      <span className="badge badge-gray text-[10px]">
                        {item.category === "inventory"
                          ? "Kho hàng & FEFO"
                          : item.category === "sales"
                            ? "Bán hàng POS"
                            : item.category === "shifts"
                              ? "Vận hành ca"
                              : "Hệ thống"}
                      </span>
                      <span className="text-[11px] text-[var(--primary)] hover:underline">
                        {item.unread ? "Nhấp để đánh dấu đã đọc" : "Đã đọc"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </header>
  );
}
