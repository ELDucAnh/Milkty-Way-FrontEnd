import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { canVisit, homePath, sessionUser } from "../../utils/auth";

export interface SidebarProps { mobileOpen: boolean; collapsed?: boolean; onNavigate: () => void; }

interface SidebarLink { to: string; label: string; page: string; }
interface SidebarGroup { key: string; label: string; icon: ReactNode; children: readonly SidebarLink[]; }
interface SidebarSingle extends SidebarLink { icon: ReactNode; }
type SidebarEntry = SidebarSingle | SidebarGroup;
interface SidebarSection { label?: string; entries: readonly SidebarEntry[]; }

const isGroup = (entry: SidebarEntry): entry is SidebarGroup => "children" in entry;

const icons = {
  dashboard: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>,
  inventory: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
  purchases: <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></>,
  production: <path d="M4 19V5m0 14h16M8 15l3-4 3 2 5-7" />,
  planning: <><path d="M3 7h13v11H3zM16 11h3l3 3v4h-6z" /><circle cx="7.5" cy="18.5" r="1.5" /><circle cx="18.5" cy="18.5" r="1.5" /></>,
  stores: <path d="M3 10h18l-2-6H5l-2 6ZM5 10v10h14V10M9 20v-6h6v6" />,
  sales: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  invoices: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>,
  marketing: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  customers: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  suppliers: <><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
  expenses: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>,
  reports: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
  users: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M2 12h2M20 12h2M6.34 5.34L4.93 4.93M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M18.66 6.34l-1.41 1.41M6.34 18.66l-1.41 1.41" /></>,
};

const SECTIONS: readonly SidebarSection[] = [
  { label: "CHÍNH", entries: [{ to: "/dashboard", label: "Bảng điều khiển", page: "dashboard", icon: icons.dashboard }] },
  {
    label: "KHO HÀNG & NGUYÊN LIỆU",
    entries: [
      {
        key: "inventory", label: "Kho hàng", icon: icons.inventory, children: [
          { to: "/inventory/products", label: "Sản phẩm", page: "products" },
          { to: "/inventory/ingredients", label: "Nguyên vật liệu", page: "ingredients" },
          { to: "/inventory/products/new", label: "Thêm sản phẩm", page: "add-product" },
          { to: "/inventory/categories", label: "Danh mục", page: "categories" },
          { to: "/inventory/branches", label: "Chi nhánh", page: "branches" },
          { to: "/inventory/units", label: "Đơn vị tính", page: "units" },
          { to: "/inventory/stock-adjustment", label: "Điều chỉnh kho", page: "stock-adjustment" },
        ]
      },
      {
        key: "purchases", label: "Nhập hàng", icon: icons.purchases, children: [
          { to: "/purchases", label: "Tất cả đơn nhập", page: "purchases" },
          { to: "/purchases/new", label: "Tạo đơn nhập", page: "add-purchase" },
          { to: "/purchases/receipts", label: "Phiếu nhập kho", page: "receipts" },
          { to: "/purchases/transfers", label: "Điều chuyển kho", page: "stock-transfers" },
        ]
      },
      {
        key: "production", label: "Sản xuất & Pha chế", icon: icons.production, children: [
          { to: "/production/recipes", label: "Công thức pha chế", page: "recipes" },
          { to: "/production/batches", label: "Lô sản xuất", page: "batches" },
        ]
      },
      { to: "/distribution/planning", label: "Kế hoạch phân phối", page: "planning", icon: icons.planning },
      {
        key: "stores", label: "Cửa hàng chi nhánh", icon: icons.stores, children: [
          { to: "/stores/ingredients", label: "Nguyên liệu tại quán", page: "store-ingredients" },
          { to: "/stores/shift-reconciliation", label: "Đối soát ca trực", page: "shift-reconciliation" },
        ]
      },
      {
        key: "sales", label: "Bán hàng", icon: icons.sales, children: [
          { to: "/sales", label: "Tất cả đơn bán", page: "sales" },
          { to: "/sales/pos", label: "Điểm bán hàng (POS)", page: "add-sale" },
          { to: "/sales/shifts", label: "Ca làm việc & Bàn giao quỹ", page: "shifts" },
          { to: "/sales/preparation", label: "Hàng đợi pha chế (KDS)", page: "preparation" },
          { to: "/sales/returns", label: "Trả hàng bán", page: "sales-returns" },
        ]
      },
      { to: "/invoices", label: "Hóa đơn", page: "invoices", icon: icons.invoices },
    ],
  },
  {
    label: "MARKETING & KHUYẾN MÃI",
    entries: [
      {
        key: "marketing", label: "Marketing", icon: icons.marketing, children: [
          { to: "/marketing/promotions", label: "Chương trình khuyến mãi", page: "promotions" },
          { to: "/marketing/branch-promotions", label: "Áp dụng theo chi nhánh", page: "branch-promotions" },
        ]
      },
    ],
  },
  { label: "KHÁCH HÀNG", entries: [{ to: "/customers", label: "Khách hàng", page: "customers", icon: icons.customers }] },
  {
    label: "ĐỐI TÁC & TÀI CHÍNH",
    entries: [
      { to: "/suppliers", label: "Nhà cung cấp", page: "suppliers", icon: icons.suppliers },
      { to: "/expenses", label: "Chi phí", page: "expenses", icon: icons.expenses },
    ],
  },
  {
    label: "BÁO CÁO & PHÂN TÍCH",
    entries: [
      {
        key: "reports", label: "Báo cáo", icon: icons.reports, children: [
          { to: "/reports/sales-report", label: "Báo cáo bán hàng", page: "sales-report" },
          { to: "/reports/purchase-report", label: "Báo cáo nhập hàng", page: "purchase-report" },
          { to: "/reports/inventory-report", label: "Báo cáo tồn kho", page: "inventory-report" },
          { to: "/reports/profit-loss", label: "Lợi nhuận & Lỗ", page: "profit-loss" },
          { to: "/reports/customer-report", label: "Báo cáo khách hàng", page: "customer-report" },
          { to: "/reports/supplier-report", label: "Báo cáo nhà cung cấp", page: "supplier-report" },
        ]
      },
    ],
  },
  {
    label: "QUẢN TRỊ HỆ THỐNG",
    entries: [
      {
        key: "users", label: "Người dùng", icon: icons.users, children: [
          { to: "/users", label: "Tất cả người dùng", page: "users-list" },
          { to: "/users/roles", label: "Vai trò & Quyền hạn", page: "roles" },
        ]
      },
      {
        key: "settings", label: "Cài đặt", icon: icons.settings, children: [
          { to: "/settings/general", label: "Cài đặt chung", page: "settings-general" },
          { to: "/settings/inventory", label: "Cài đặt kho", page: "settings-inventory" },
          { to: "/settings/sales", label: "Cài đặt bán hàng", page: "settings-sales" },
          { to: "/settings/purchases", label: "Cài đặt nhập hàng", page: "settings-purchases" },
          { to: "/settings/notifications", label: "Thông báo", page: "settings-notifications" },
          { to: "/settings/offline-sync", label: "Đồng bộ & Offline", page: "settings-offline-sync" },
        ]
      },
    ],
  },
];

function NavIcon({ children, className = "flex-shrink-0" }: { children: ReactNode; className?: string }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export default function Sidebar({ mobileOpen, onNavigate, collapsed = false }: SidebarProps) {
  const user = sessionUser();
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ sales: true });
  useEffect(() => {
    const group = pathname.split("/")[1];
    setExpanded(current => ({ ...current, [group]: true }));
  }, [pathname]);

  const visibleSections = SECTIONS.map(section => ({
    ...section,
    entries: section.entries.flatMap((entry): SidebarEntry[] => {
      if (!isGroup(entry)) return canVisit(entry.to) ? [entry] : [];
      const children = entry.children.filter(child => canVisit(child.to));
      return children.length ? [{ ...entry, children }] : [];
    }),
  })).filter(section => section.entries.length > 0);

  return <aside id="sidebar" className={`${mobileOpen ? "mobile-open" : ""} ${collapsed ? "collapsed" : ""}`} aria-label="Thanh điều hướng chính">
    <NavLink onClick={onNavigate} end to={homePath()} id="sidebar-logo" className="flex items-center h-16 px-4 border-b" style={{ "borderColor": "var(--border)", "flexShrink": "0", "textDecoration": "none", "transition": "background 0.15s" }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center" style={{ "background": "linear-gradient(135deg,#22B573 0%,#16A34A 100%)", "borderRadius": "12px", "boxShadow": "0 2px 8px rgba(34,181,115,0.3)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="white" fillOpacity="0.2" />
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M12 22V12" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M3 7l9 5 9-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2.5" fill="white" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>
        <div className="sidebar-label" style={{ "borderLeft": "1px solid var(--border)", "paddingLeft": "12px" }}>
          <div style={{ "fontSize": "16px", "fontWeight": "700", "color": "var(--text)", "lineHeight": "1.1", "letterSpacing": "-0.3px" }}>MilktyWay</div>
          <div style={{ "fontSize": "9.5px", "color": "var(--primary)", "fontWeight": "600", "letterSpacing": "0.8px", "textTransform": "uppercase", "marginTop": "2px" }}>Quản Lý Chuỗi Cửa Hàng</div>
        </div>
      </div>
    </NavLink>

    <nav id="sidebar-nav" className="flex-1 overflow-y-auto py-3 px-3" style={{ "gap": "2px" }}>
      {visibleSections.map(section => <div key={section.label}>
        {section.label && <div className="sidebar-section-label">{section.label}</div>}
        {section.entries.map(entry => isGroup(entry) ? (
          <div className="submenu-group" data-submenu={entry.key} key={entry.key}>
            <button className="nav-item submenu-toggle" type="button" aria-controls={`submenu-${entry.key}`} data-page-group={entry.key} onClick={() => setExpanded(current => ({ ...current, [entry.key]: !current[entry.key] }))} aria-expanded={!!expanded[entry.key]}>
              <NavIcon>{entry.icon}</NavIcon>
              <span className="sidebar-label flex-1 text-left">{entry.label}</span>
              <span className="nav-toggle-icon sidebar-label">
                <svg className="icon-plus" style={{ display: expanded[entry.key] ? "none" : "block" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <svg className="icon-minus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: expanded[entry.key] ? "block" : "none" }}><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </span>
            </button>
            <div className={`submenu ${expanded[entry.key] ? "open" : ""}`} id={`submenu-${entry.key}`} inert={!expanded[entry.key]}>
              {entry.children.map(child => <NavLink key={child.to} onClick={onNavigate} end to={child.to} className="submenu-item" data-page={child.page}>{child.label}</NavLink>)}
            </div>
          </div>
        ) : (
          <NavLink key={entry.to} onClick={onNavigate} end to={entry.to} className="nav-item" data-page={entry.page}>
            <NavIcon>{entry.icon}</NavIcon>
            <span className="sidebar-label flex-1">{entry.label}</span>
          </NavLink>
        ))}
      </div>)}
    </nav>

    <div id="sidebar-user" className="p-3 border-t" style={{ "borderColor": "var(--border)", "flexShrink": "0" }}>
      <NavLink onClick={onNavigate} end to="/profile" className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--background)] transition-colors" style={{ "textDecoration": "none" }}>
        <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ "background": "var(--primary)" }}>{user.name.split(" ").slice(-2).map(part => part[0]).join("").toUpperCase()}</div>
        <div className="sidebar-label min-w-0">
          <div style={{ "fontSize": "13px", "fontWeight": "600", "color": "var(--text)", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis" }}>{user.name}</div>
          <div style={{ "fontSize": "11px", "color": "var(--muted)" }}>{user.roleLabel}</div>
        </div>
      </NavLink>
    </div>
  </aside>;
}
