import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/common/Badge";
import { useToast } from "../../components/common/useToast";

interface OfflineOrder {
  id: string;
  pos: string;
  time: string;
  items: string;
  total: number;
  paymentMethod: string;
  synced: boolean;
}

const initialOfflineOrders: OfflineOrder[] = [
  {
    id: "OFF-CN05-20261028-001",
    pos: "CN05 — POS 01",
    time: "28/10 20:48:12",
    items: "2x Trà Sữa TC Hoàng Kim (L) + 1x Oolong Nướng (M)",
    total: 145000,
    paymentMethod: "Tiền mặt tại quầy",
    synced: false,
  },
  {
    id: "OFF-CN05-20261028-002",
    pos: "CN05 — POS 01",
    time: "28/10 20:50:04",
    items: "1x Sữa Tươi Trân Châu Đường Đen (L, 50% Đá)",
    total: 55000,
    paymentMethod: "Tiền mặt tại quầy",
    synced: false,
  },
  {
    id: "OFF-CN05-20261028-003",
    pos: "CN05 — POS 02",
    time: "28/10 20:51:30",
    items: "3x Trà Đào Cam Sả Tươi (L, 70% Đường)",
    total: 135000,
    paymentMethod: "Tiền mặt tại quầy",
    synced: false,
  },
  {
    id: "OFF-CN07-20261028-001",
    pos: "CN07 — POS 01",
    time: "28/10 20:58:19",
    items: "2x Lục Trà Nhài Mãng Cầu Đắk Lắk (L)",
    total: 100000,
    paymentMethod: "Tiền mặt tại quầy",
    synced: false,
  },
];

export default function OfflineSyncPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [offlineOrders, setOfflineOrders] = useState<OfflineOrder[]>(initialOfflineOrders);
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingCount = offlineOrders.filter((o) => !o.synced).length;

  function getBranchPendingCount(branchCode: string) {
    return offlineOrders.filter((o) => !o.synced && o.pos.includes(branchCode)).length;
  }

  function forceSyncAll() {
    setIsSyncing(true);
    toast.info("Đang bắt đầu ép đồng bộ toàn bộ đơn ngoại tuyến lên máy chủ...", {
      title: "Đồng Bộ",
    });

    setTimeout(() => {
      setOfflineOrders((prev) => prev.map((o) => ({ ...o, synced: true })));
      setIsSyncing(false);
      toast.success(
        "Tất cả 4 đơn hàng offline đã được đồng bộ an toàn và đối soát không trùng lặp!",
        { title: "Thành Công" }
      );
    }, 1000);
  }

  function syncSingleOrder(orderId: string) {
    toast.info(`Đang đẩy đơn ${orderId} lên máy chủ...`, { title: "Đồng Bộ" });
    setTimeout(() => {
      setOfflineOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, synced: true } : o))
      );
      toast.success(
        `Đơn ${orderId} đã được tích hợp vào doanh thu ca thành công!`,
        { title: "Đã Sync" }
      );
    }, 600);
  }

  function syncBranch(branchCode: string) {
    toast.info(`Đang kết nối đồng bộ dữ liệu cho chi nhánh ${branchCode}...`, {
      title: "Đồng Bộ",
    });
    setTimeout(() => {
      setOfflineOrders((prev) =>
        prev.map((o) => (o.pos.includes(branchCode) ? { ...o, synced: true } : o))
      );
      toast.success(`Đã đồng bộ xong dữ liệu cho ${branchCode}!`, {
        title: "Hoàn Tất",
      });
    }, 800);
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
            <span className="current">Đồng bộ &amp; Offline</span>
          </nav>
          <h1 className="page-title">Trung Tâm Giám Sát Đồng Bộ &amp; Đối Soát Offline</h1>
          <p className="page-subtitle">
            Giám sát hàng đợi đồng bộ đơn hàng ngoại tuyến, xử lý xung đột và đối soát ca.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              toast.info("Đang kiểm tra nhật ký kết nối mạng 12 chi nhánh...", {
                title: "Kiểm Tra",
              })
            }
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <polyline points="23 20 23 14 17 14" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            Làm Mới Trạng Thái
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={forceSyncAll}
            disabled={isSyncing || pendingCount === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isSyncing ? "Đang đồng bộ..." : "Ép Đồng Bộ Ngay (Force Sync)"}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className="card mb-6 border-l-4 border-l-emerald-500 bg-emerald-50/20 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <div className="font-bold text-emerald-900 text-sm">
                Máy Chủ Đám Mây Đang Trực Tuyến (Cloud Gateway Online)
              </div>
              <div className="text-xs text-emerald-700">
                WebSocket Ping: <strong>24ms</strong> · Giao thức bảo mật: <strong>TLS 1.3 / HMAC-SHA256</strong> chống trùng lặp mã đơn.
              </div>
            </div>
          </div>
          <span className="badge badge-success">11/12 Chi Nhánh Kết Nối Hoàn Hảo</span>
        </div>
      </div>

      {/* Stats Grid */}
      <section aria-label="Thống kê đồng bộ">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Đơn Đã Đồng Bộ Hôm Nay"
            value="2.845 Đơn"
            valueClassName="text-[var(--primary)]"
            subLabel="100% khớp doanh thu thực"
            tone="primary"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
          <StatCard
            label="Đơn Đang Chờ Sync (Offline Queue)"
            value={`${pendingCount} Đơn`}
            valueClassName="text-[var(--warning)]"
            subLabel="Lưu an toàn trên LocalStorage POS"
            tone="warning"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <StatCard
            label="Máy POS Hoạt Động"
            value="24 Máy"
            subLabel="2 máy/chi nhánh trên 12 điểm"
            tone="info"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
            }
          />
          <StatCard
            label="Cần Đối Soát Ca Thủ Công"
            value="1 Ca"
            valueClassName="text-[var(--danger)]"
            subLabel="CN05 có chênh lệch 10.000 ₫"
            tone="danger"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Bảng Trạng Thái Kết Nối 12 Chi Nhánh */}
      <div className="card p-0 overflow-hidden mb-6">
        <div className="py-3 px-5 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[var(--text)] mb-0">
            Tình Trạng Kết Nối Mạng &amp; Hàng Đợi Đồng Bộ 12 Chi Nhánh
          </h3>
          <span className="text-xs text-[var(--muted)]">Tự động ping mỗi 30 giây</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã &amp; Tên Chi Nhánh</th>
                <th>Số Máy POS</th>
                <th className="text-center">Trạng Thái Mạng</th>
                <th className="text-center">Số Đơn Chờ Sync</th>
                <th className="text-right">Doanh Thu Đã Sync Hôm Nay</th>
                <th>Lần Đồng Bộ Gần Nhất</th>
                <th className="text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold text-[var(--text)]">CN01 — Quận 1 (Nguyễn Huệ)</td>
                <td>2 POS</td>
                <td className="text-center">
                  <Badge variant="success">Online (Cáp quang)</Badge>
                </td>
                <td className="text-center font-bold text-emerald-600">
                  {getBranchPendingCount("CN01")} đơn
                </td>
                <td className="text-right font-bold text-[var(--text)]">18.450.000 ₫</td>
                <td className="text-xs text-[var(--muted)]">28/10 21:04:15</td>
                <td className="text-center">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      toast.info("Đường truyền CN01 ổn định 100%", { title: "Kiểm Tra" })
                    }
                  >
                    Kiểm Tra
                  </button>
                </td>
              </tr>
              <tr className={getBranchPendingCount("CN05") > 0 ? "bg-amber-50/40" : ""}>
                <td className="font-bold text-amber-900">CN05 — Quận 10 (Sư Vạn Hạnh)</td>
                <td>2 POS</td>
                <td className="text-center">
                  <Badge variant={getBranchPendingCount("CN05") > 0 ? "warning" : "success"}>
                    {getBranchPendingCount("CN05") > 0 ? "Mạng Chập Chờn (4G dự phòng)" : "Đã đồng bộ xong"}
                  </Badge>
                </td>
                <td
                  className={`text-center font-bold ${
                    getBranchPendingCount("CN05") > 0 ? "text-amber-700" : "text-emerald-600"
                  }`}
                >
                  {getBranchPendingCount("CN05") > 0
                    ? `${getBranchPendingCount("CN05")} đơn offline`
                    : "0 đơn"}
                </td>
                <td className="text-right font-bold text-[var(--text)]">14.280.000 ₫</td>
                <td className="text-xs text-[var(--muted)]">28/10 20:52:10</td>
                <td className="text-center">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={getBranchPendingCount("CN05") === 0}
                    onClick={() => syncBranch("CN05")}
                  >
                    {getBranchPendingCount("CN05") > 0 ? "Đồng Bộ Ngay" : "Đã Đồng Bộ"}
                  </button>
                </td>
              </tr>
              <tr>
                <td className="font-bold text-[var(--text)]">CN06 — Bình Thạnh (D2)</td>
                <td>2 POS</td>
                <td className="text-center">
                  <Badge variant="success">Online (Cáp quang)</Badge>
                </td>
                <td className="text-center font-bold text-emerald-600">
                  {getBranchPendingCount("CN06")} đơn
                </td>
                <td className="text-right font-bold text-[var(--text)]">16.120.000 ₫</td>
                <td className="text-xs text-[var(--muted)]">28/10 21:02:40</td>
                <td className="text-center">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      toast.info("Đường truyền CN06 ổn định", { title: "Kiểm Tra" })
                    }
                  >
                    Kiểm Tra
                  </button>
                </td>
              </tr>
              <tr>
                <td className="font-bold text-[var(--text)]">CN07 — Gò Vấp (Phan Văn Trị)</td>
                <td>2 POS</td>
                <td className="text-center">
                  <Badge variant="success">Online (Cáp quang)</Badge>
                </td>
                <td
                  className={`text-center font-bold ${
                    getBranchPendingCount("CN07") > 0 ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {getBranchPendingCount("CN07") > 0
                    ? `${getBranchPendingCount("CN07")} đơn offline`
                    : "0 đơn"}
                </td>
                <td className="text-right font-bold text-[var(--text)]">12.850.000 ₫</td>
                <td className="text-xs text-[var(--muted)]">28/10 20:59:00</td>
                <td className="text-center">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={getBranchPendingCount("CN07") === 0}
                    onClick={() => syncBranch("CN07")}
                  >
                    {getBranchPendingCount("CN07") > 0 ? "Đồng Bộ Ngay" : "Đã Đồng Bộ"}
                  </button>
                </td>
              </tr>
              <tr>
                <td className="font-bold text-[var(--text)]">CN02 — Quận 3 (Võ Văn Tần)</td>
                <td>2 POS</td>
                <td className="text-center">
                  <Badge variant="success">Online (Cáp quang)</Badge>
                </td>
                <td className="text-center font-bold text-emerald-600">
                  {getBranchPendingCount("CN02")} đơn
                </td>
                <td className="text-right font-bold text-[var(--text)]">15.400.000 ₫</td>
                <td className="text-xs text-[var(--muted)]">28/10 21:03:50</td>
                <td className="text-center">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      toast.info("Đường truyền CN02 ổn định", { title: "Kiểm Tra" })
                    }
                  >
                    Kiểm Tra
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Hàng Đợi Đơn Hàng Offline */}
      <div className="card p-0 overflow-hidden mb-6">
        <div className="py-3 px-5 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-0">
              Danh Sách Đơn Hàng Tạo Ngoại Tuyến (Offline Queue)
            </h3>
            <Badge variant="warning">Cơ chế bảo toàn ID không trùng lặp</Badge>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              toast.info("Đã tải lại danh sách đơn hàng offline từ LocalStorage", {
                title: "Cập Nhật",
              })
            }
          >
            Quét Hàng Đợi
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã Đơn Offline</th>
                <th>Chi Nhánh &amp; Máy POS</th>
                <th>Thời Gian Ghi Nhận</th>
                <th>Chi Tiết Món &amp; Topping</th>
                <th className="text-right">Tổng Tiền (VNĐ)</th>
                <th>Hình Thức TT</th>
                <th className="text-center">Trạng Thái Hàng Đợi</th>
                <th className="text-center">Xử Lý</th>
              </tr>
            </thead>
            <tbody>
              {offlineOrders.map((order) => (
                <tr key={order.id}>
                  <td className="font-mono text-xs font-bold text-amber-700">
                    {order.id}
                  </td>
                  <td>
                    <Badge variant="info">{order.pos}</Badge>
                  </td>
                  <td className="text-xs">{order.time}</td>
                  <td className="text-xs">{order.items}</td>
                  <td className="text-right font-bold">
                    {order.total.toLocaleString("vi-VN")} ₫
                  </td>
                  <td>
                    <Badge variant="gray">{order.paymentMethod}</Badge>
                  </td>
                  <td className="text-center">
                    <Badge variant={order.synced ? "success" : "warning"}>
                      {order.synced ? "Đã đồng bộ lên Cloud" : "Chờ kết nối đẩy lên"}
                    </Badge>
                  </td>
                  <td className="text-center">
                    {order.synced ? (
                      <span className="text-xs text-emerald-600 font-semibold">Đã đồng bộ</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => syncSingleOrder(order.id)}
                      >
                        Sync Đơn Này
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Đối Soát Ca Thu Ngân Cuối Ca */}
      <div className="card p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-1">
              Cơ Chế Đối Soát Doanh Thu Ca &amp; Chống Thất Thoát
            </h3>
            <p className="text-xs text-[var(--muted)] max-w-2xl">
              Khi xảy ra mất mạng hoặc chuyển đổi máy POS, Quản lý chi nhánh có trách nhiệm mở màn hình đối soát này để đối chiếu: Tổng tiền mặt thu ngân giao nộp = Tiền đầu ca + Đơn online thanh toán + Đơn offline lưu thiết bị - Tiền chi khẩn cấp.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/sales/shifts")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Lập Biên Bản Đối Soát Ca
          </button>
        </div>
      </div>
    </div>
  );
}

