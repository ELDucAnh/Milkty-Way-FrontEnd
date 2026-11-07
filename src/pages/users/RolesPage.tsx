import { useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../components/common/useToast";

interface PermissionRow {
  id: string;
  name: string;
  owner: boolean;
  manager: boolean;
  cashier: boolean;
  warehouse: boolean;
  managerNote?: string;
}

const defaultPermissions: { section: string; rows: PermissionRow[] }[] = [
  {
    section: "1. Phân Hệ Bán Hàng POS & Thu Ngân",
    rows: [
      {
        id: "pos_shift",
        name: "Mở ca / Đóng ca bán hàng & Khởi tạo quỹ tiền mặt",
        owner: true,
        manager: true,
        cashier: true,
        warehouse: false,
      },
      {
        id: "pos_order",
        name: "Thực hiện bán hàng POS, chọn món, chọn Đường/Đá/Topping",
        owner: true,
        manager: true,
        cashier: true,
        warehouse: false,
      },
      {
        id: "pos_offline",
        name: "Chế độ bán Offline khi mất mạng (Lưu LocalStorage)",
        owner: true,
        manager: true,
        cashier: true,
        warehouse: false,
      },
      {
        id: "pos_discount",
        name: "Áp dụng chiết khấu đặc biệt > 15% hoặc hủy đơn sau in bill",
        owner: true,
        manager: true,
        cashier: false,
        warehouse: false,
      },
      {
        id: "pos_lock_item",
        name: "Tạm khóa món trên Menu khi chi nhánh hết nguyên liệu",
        owner: true,
        manager: true,
        cashier: false,
        warehouse: false,
      },
    ],
  },
  {
    section: "2. Quản Lý Kho & Nguyên Vật Liệu (FEFO)",
    rows: [
      {
        id: "wh_batch",
        name: "Nhập nguyên liệu theo Lô & Hạn sử dụng (Batch / EXP)",
        owner: true,
        manager: true,
        cashier: false,
        warehouse: true,
      },
      {
        id: "wh_blind_audit",
        name: "Thực hiện kiểm kê mù (Blind Count) định kỳ",
        owner: true,
        manager: true,
        cashier: false,
        warehouse: true,
      },
      {
        id: "wh_damage_approval",
        name: "Duyệt biên bản hủy hỏng, hao hụt nguyên liệu cận date",
        owner: true,
        manager: true,
        cashier: false,
        warehouse: false,
      },
      {
        id: "wh_transfer",
        name: "Đề xuất và xác nhận nhận điều chuyển kho cấp cứu giữa các CN",
        owner: true,
        manager: true,
        cashier: false,
        warehouse: true,
      },
    ],
  },
  {
    section: "3. Báo Cáo Tài Chính & Cấu Hình Hệ Thống",
    rows: [
      {
        id: "report_revenue",
        name: "Xem Báo cáo Doanh thu & Báo cáo Hòa vốn 12 Chi nhánh",
        owner: true,
        manager: true,
        cashier: false,
        warehouse: false,
        managerNote: "(Chỉ xem CN mình)",
      },
      {
        id: "report_pnl",
        name: "Xem Báo cáo P&L tổng thể toàn chuỗi & Cảnh báo trượt 4 tuần",
        owner: true,
        manager: false,
        cashier: false,
        warehouse: false,
      },
      {
        id: "sys_config",
        name: "Cấu hình tham số hệ thống, máy in K80, kết nối mạng & đồng bộ",
        owner: true,
        manager: true,
        cashier: false,
        warehouse: false,
      },
    ],
  },
];

export default function RolesPage() {
  const toast = useToast();
  const [permissions, setPermissions] = useState(defaultPermissions);

  function togglePermission(
    sectionIdx: number,
    rowIdx: number,
    role: "manager" | "cashier" | "warehouse"
  ) {
    setPermissions((prev) => {
      const cloned = JSON.parse(JSON.stringify(prev));
      cloned[sectionIdx].rows[rowIdx][role] = !cloned[sectionIdx].rows[rowIdx][role];
      return cloned;
    });
  }

  function handleResetDefault() {
    setPermissions(defaultPermissions);
    toast.info("Đã hoàn tác về cấu hình mặc định ban đầu", { title: "Hoàn Tác" });
  }

  function handleSave() {
    toast.success("Đã cập nhật chính sách phân quyền cho toàn hệ thống chuỗi!", {
      title: "Đã Lưu Phân Quyền",
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
            <Link to="/users">Người dùng</Link>
            <span className="sep">/</span>
            <span className="current">Vai trò &amp; Quyền hạn</span>
          </nav>
          <h1 className="page-title">Ma Trận Phân Quyền 4 Vai Trò Nghiệp Vụ</h1>
          <p className="page-subtitle">
            Thiết lập ma trận phân quyền và phạm vi truy cập dữ liệu theo vai trò nghiệp vụ.
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/users" className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Danh Sách Nhân Viên
          </Link>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Lưu Thay Đổi
          </button>
        </div>
      </div>

      {/* 4 Roles Overview Cards */}
      <section aria-label="4 vai trò cốt lõi">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="card border-[var(--primary)] bg-[var(--primary-light)]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[15px] font-bold text-[var(--text)]">1. Chủ Doanh Nghiệp</span>
              <span className="badge badge-success">Toàn quyền</span>
            </div>
            <div className="stat-sub-label mb-3">
              Toàn quyền cấu hình 12 chi nhánh, xem báo cáo P&amp;L hòa vốn, duyệt đơn mua lớn và quản lý nhân sự.
            </div>
            <div className="text-[11px] font-bold text-[var(--primary)]">
              2 Tài khoản (Ban Giám Đốc)
            </div>
          </div>

          <div className="card border-blue-400 bg-blue-50/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[15px] font-bold text-[var(--text)]">2. Quản Lý Chi Nhánh</span>
              <span className="badge badge-info">Theo Chi Nhánh</span>
            </div>
            <div className="stat-sub-label mb-3">
              Quản lý ca bán hàng tại CN, duyệt biên bản hủy hỏng, đối soát tiền mặt cuối ca, khóa món tạm thời khi hết nguyên liệu.
            </div>
            <div className="text-[11px] font-bold text-blue-600">
              12 Quản lý (Mỗi CN 1 người)
            </div>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[15px] font-bold text-[var(--text)]">3. Thu Ngân Quầy POS</span>
              <span className="badge badge-warning">Tại Quầy</span>
            </div>
            <div className="stat-sub-label mb-3">
              Bán hàng Touch POS, chọn option size/đường/đá/topping, tích điểm SĐT hội viên, chế độ bán Offline khi mất mạng.
            </div>
            <div className="text-[11px] font-bold text-amber-600">
              32 Nhân viên ca thu ngân
            </div>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[15px] font-bold text-[var(--text)]">4. Nhân Viên Kho CN</span>
              <span className="badge badge-gray">Kho &amp; FEFO</span>
            </div>
            <div className="stat-sub-label mb-3">
              Nhập nguyên liệu theo Lô &amp; HSD (FEFO), kiểm kê mù định kỳ, xuất hao hụt, nhận điều chuyển kho khẩn cấp.
            </div>
            <div className="text-[11px] font-bold text-slate-600">
              18 Nhân viên thủ kho
            </div>
          </div>
        </div>
      </section>

      {/* Permission Matrix Table */}
      <section aria-label="Ma trận phân quyền chi tiết">
        <div className="card p-0 overflow-hidden">
          <div className="card-header pt-4 px-5 pb-3 border-b border-[var(--border)] flex justify-between items-center flex-wrap gap-2.5">
            <div>
              <h3 className="card-title m-0">Ma Trận Thẩm Quyền Chi Tiết (Role-Based Access Control)</h3>
              <div className="stat-sub-label mt-0.5">
                Tích chọn các quyền hạn thao tác được cấp cho từng vai trò nghiệp vụ
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetDefault}>
                Đặt Lại Mặc Định
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 280 }}>Phân Hệ / Chức Năng Nghiệp Vụ</th>
                  <th className="text-center" style={{ width: 140 }}>
                    Chủ Doanh Nghiệp
                  </th>
                  <th className="text-center" style={{ width: 140 }}>
                    Quản Lý Chi Nhánh
                  </th>
                  <th className="text-center" style={{ width: 140 }}>
                    Thu Ngân POS
                  </th>
                  <th className="text-center" style={{ width: 140 }}>
                    Nhân Viên Kho
                  </th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((sec, secIdx) => (
                  <Fragment key={sec.section}>
                    <tr className="bg-[var(--background)]">
                      <td colSpan={5} className="font-extrabold text-[var(--text)] text-xs uppercase tracking-wide">
                        {sec.section}
                      </td>
                    </tr>
                    {sec.rows.map((row, rowIdx) => (
                      <tr key={row.id}>
                        <td className="pl-6 font-medium text-[var(--text)]">{row.name}</td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={row.owner}
                            disabled
                            className="accent-[#22B573] cursor-not-allowed"
                            aria-label={`Quyền ${row.name} cho Chủ doanh nghiệp`}
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={row.manager}
                            onChange={() => togglePermission(secIdx, rowIdx, "manager")}
                            className="accent-[#22B573] cursor-pointer"
                            aria-label={`Quyền ${row.name} cho Quản lý chi nhánh`}
                          />
                          {row.managerNote && (
                            <span className="text-[11px] text-[var(--muted)] block">
                              {row.managerNote}
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={row.cashier}
                            onChange={() => togglePermission(secIdx, rowIdx, "cashier")}
                            className="accent-[#22B573] cursor-pointer"
                            aria-label={`Quyền ${row.name} cho Thu ngân`}
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={row.warehouse}
                            onChange={() => togglePermission(secIdx, rowIdx, "warehouse")}
                            className="accent-[#22B573] cursor-pointer"
                            aria-label={`Quyền ${row.name} cho Nhân viên kho`}
                          />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

