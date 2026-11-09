import { useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../components/common/useToast";
import { can, canVisit, isManager } from "../../utils/auth";
import type { Action, Role } from "../../utils/auth";

interface PermissionRow {
  id: string;
  name: string;
  owner: boolean;
  manager: boolean;
  cashier: boolean;
  warehouse: boolean;
  managerNote?: string;
}

type PermissionCheck = { route?: string; action?: Action };
interface PermissionSource { id: string; name: string; check: PermissionCheck; managerNote?: string; }

/** Mỗi dòng được dẫn xuất từ canVisit()/can() trong utils/auth.ts nên bảng luôn khớp quyền thực tế. */
const permissionSources: { section: string; rows: PermissionSource[] }[] = [
  {
    section: "1. Tài Khoản & Nhân Sự",
    rows: [
      { id: "user_manage", name: "Quản lý tài khoản & phân công nhân viên tại chi nhánh", check: { action: "user.manageBranch" }, managerNote: "(Chỉ CN mình)" },
      { id: "role_assign", name: "Phân quyền nhân viên", check: { action: "role.assign" }, managerNote: "(Chỉ Thu ngân / Kho)" },
      { id: "profile", name: "Xem, cập nhật hồ sơ cá nhân", check: { route: "/profile" } },
    ],
  },
  {
    section: "2. Chi Nhánh, Quầy POS & Ca Bán Hàng",
    rows: [
      { id: "pos_use", name: "Sử dụng quầy POS được phân công, thu tiền tại POS", check: { action: "pos.use" } },
      { id: "pos_shift", name: "Mở ca, đóng ca, chốt tiền & xem thống kê tiền đóng ca", check: { route: "/sales/shifts" } },
      { id: "branch_manage", name: "Thêm, sửa, ngừng hoạt động chi nhánh", check: { route: "/inventory/branches" } },
    ],
  },
  {
    section: "3. Thực Đơn",
    rows: [
      { id: "menu_view", name: "Xem thực đơn, sản phẩm, giá bán", check: { route: "/inventory/products" } },
      { id: "menu_edit", name: "Tạo, chỉnh sửa sản phẩm, size, topping, công thức", check: { action: "product.manage" } },
      { id: "menu_lock", name: "Khóa / mở bán món tại chi nhánh", check: { action: "product.lockAtBranch" }, managerNote: "(Chỉ CN mình)" },
      { id: "menu_shortage", name: "Báo món hết nguyên liệu cho quản lý", check: { action: "order.reportShortage" } },
    ],
  },
  {
    section: "4. Kho & Nguyên Liệu",
    rows: [
      { id: "wh_view", name: "Xem tồn kho, lô hàng, hạn sử dụng & cảnh báo hết hàng / cận hạn", check: { route: "/inventory/ingredients" } },
      { id: "wh_catalog", name: "Quản lý danh mục nguyên liệu & ngưỡng tồn an toàn", check: { action: "ingredient.manage" } },
      { id: "wh_po", name: "Lập phiếu mua nguyên liệu", check: { action: "purchase.create" } },
      { id: "wh_receive", name: "Nhận nguyên liệu theo phiếu nhập", check: { action: "purchase.receive" } },
      { id: "wh_batch", name: "Tạo mẻ sơ chế, ghi nhận thành phẩm", check: { action: "batch.manage" } },
      { id: "wh_transfer", name: "Xuất / nhận nguyên liệu kho → chi nhánh", check: { action: "transfer.manage" } },
      { id: "wh_count", name: "Kiểm kê, ghi nhận chênh lệch", check: { action: "stock.count" } },
      { id: "wh_approve", name: "Phê duyệt điều chỉnh tồn kho", check: { action: "stock.approveAdjustment" }, managerNote: "(Chỉ CN mình)" },
      { id: "wh_shift_supply", name: "Lập & phê duyệt yêu cầu cấp nguyên liệu đầu ca", check: { route: "/distribution/planning" } },
    ],
  },
  {
    section: "5. Đơn Hàng & Thanh Toán",
    rows: [
      { id: "order_create", name: "Tạo đơn hàng tại quầy POS", check: { action: "order.create" } },
      { id: "order_list", name: "Xem danh sách đơn hàng", check: { route: "/sales" }, managerNote: "(Chỉ CN mình)" },
      { id: "order_queue", name: "Xem hàng đợi pha chế, cập nhật trạng thái & bàn giao", check: { route: "/sales/preparation" } },
      { id: "order_complaint", name: "Tiếp nhận, xử lý khiếu nại", check: { action: "complaint.handle" } },
      { id: "pay_refund", name: "Duyệt, xử lý hoàn tiền", check: { action: "payment.refundReview" } },
      { id: "pay_view", name: "Xem giao dịch, đối soát thanh toán", check: { route: "/invoices" }, managerNote: "(Chỉ CN mình)" },
    ],
  },
  {
    section: "6. Ưu Đãi",
    rows: [
      { id: "promo_view", name: "Xem khuyến mãi đang áp dụng", check: { route: "/marketing/promotions" } },
      { id: "promo_manage", name: "Quản lý chương trình khuyến mãi", check: { action: "promotion.manage" } },
    ],
  },
  {
    section: "7. Báo Cáo & Cấu Hình",
    rows: [
      { id: "report_revenue", name: "Xem báo cáo doanh thu", check: { route: "/reports/sales-report" }, managerNote: "(Chỉ CN mình)" },
      { id: "report_inventory", name: "Xem báo cáo tồn kho, hao hụt", check: { route: "/reports/inventory-report" } },
      { id: "report_pnl", name: "Xem báo cáo hiệu quả sản phẩm / chi nhánh (P&L)", check: { route: "/reports/profit-loss" }, managerNote: "(Chỉ CN mình)" },
      { id: "sys_config", name: "Cấu hình tham số hệ thống, đồng bộ & offline", check: { route: "/settings/general" } },
    ],
  },
];

function allowed(check: PermissionCheck, role: Role): boolean {
  if (check.action) return can(check.action, role);
  return check.route ? canVisit(check.route, role) : false;
}

const defaultPermissions: { section: string; rows: PermissionRow[] }[] = permissionSources.map((sec) => ({
  section: sec.section,
  rows: sec.rows.map((row) => ({
    id: row.id,
    name: row.name,
    owner: allowed(row.check, "owner"),
    manager: allowed(row.check, "manager"),
    cashier: allowed(row.check, "cashier"),
    warehouse: allowed(row.check, "warehouse"),
    managerNote: allowed(row.check, "manager") ? row.managerNote : undefined,
  })),
}));

export default function RolesPage() {
  const toast = useToast();
  const [permissions, setPermissions] = useState(defaultPermissions);

  function togglePermission(
    sectionIdx: number,
    rowIdx: number,
    role: "manager" | "cashier" | "warehouse"
  ) {
    if (isManager() && (role === "manager" || !permissions[sectionIdx].rows[rowIdx].manager)) {
      toast.warning("Quản lý chi nhánh chỉ phân quyền cho Thu ngân / Nhân viên kho trong phạm vi quyền của mình.");
      return;
    }
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
                            disabled={isManager()}
                            onChange={() => togglePermission(secIdx, rowIdx, "manager")}
                            className="accent-[#22B573] cursor-pointer disabled:cursor-not-allowed"
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
                            disabled={isManager() && !row.manager}
                            onChange={() => togglePermission(secIdx, rowIdx, "cashier")}
                            className="accent-[#22B573] cursor-pointer disabled:cursor-not-allowed"
                            aria-label={`Quyền ${row.name} cho Thu ngân`}
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={row.warehouse}
                            disabled={isManager() && !row.manager}
                            onChange={() => togglePermission(secIdx, rowIdx, "warehouse")}
                            className="accent-[#22B573] cursor-pointer disabled:cursor-not-allowed"
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

