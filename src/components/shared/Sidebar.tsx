import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
export interface SidebarProps { mobileOpen: boolean; collapsed?: boolean; onNavigate: () => void; }
export default function Sidebar({mobileOpen,onNavigate,collapsed = false}: SidebarProps) {
 const { pathname } = useLocation();
 const [expanded,setExpanded] = useState<Record<string,boolean>>({sales:true});
 useEffect(() => {
  const group = pathname.split("/")[1];
  setExpanded(current => ({ ...current, [group]: true }));
 }, [pathname]);
 return <aside id="sidebar" className={`${mobileOpen ? "mobile-open" : ""} ${collapsed ? "collapsed" : ""}`} aria-label="Thanh điều hướng chính">
<NavLink onClick={onNavigate} end to="/dashboard" id="sidebar-logo" className="flex items-center h-16 px-4 border-b" style={{"borderColor": "var(--border)", "flexShrink": "0", "textDecoration": "none", "transition": "background 0.15s"}}>
  <div className="flex items-center gap-3 min-w-0">
    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center" style={{"background": "linear-gradient(135deg,#22B573 0%,#16A34A 100%)", "borderRadius": "12px", "boxShadow": "0 2px 8px rgba(34,181,115,0.3)"}}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="white" fillOpacity="0.2"/>
        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M12 22V12" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M3 7l9 5 9-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="2.5" fill="white" stroke="white" strokeWidth="0.5"/>
      </svg>
    </div>
    <div className="sidebar-label" style={{"borderLeft": "1px solid var(--border)", "paddingLeft": "12px"}}>
      <div style={{"fontSize": "16px", "fontWeight": "700", "color": "var(--text)", "lineHeight": "1.1", "letterSpacing": "-0.3px"}}>MilktyWay</div>
      <div style={{"fontSize": "9.5px", "color": "var(--primary)", "fontWeight": "600", "letterSpacing": "0.8px", "textTransform": "uppercase", "marginTop": "2px"}}>Quản Lý Chuỗi Cửa Hàng</div>
    </div>
  </div>
</NavLink>

<nav id="sidebar-nav" className="flex-1 overflow-y-auto py-3 px-3" style={{"gap": "2px"}}>

  <div className="sidebar-section-label">CHÍNH</div>

  <NavLink onClick={onNavigate} end to="/dashboard" className="nav-item" data-page="dashboard">
    <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    <span className="sidebar-label flex-1">Bảng điều khiển</span>
  </NavLink>

  <div className="sidebar-section-label">KHO HÀNG & NGUYÊN LIỆU</div>

  
  <div className="submenu-group" data-submenu="inventory">
    <button className="nav-item submenu-toggle" type="button" aria-controls="submenu-inventory" data-page-group="inventory" onClick={() => setExpanded(current => ({ ...current, "inventory": !current["inventory"] }))} aria-expanded={!!expanded["inventory"]}>
      <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      <span className="sidebar-label flex-1 text-left">Kho hàng</span>
      <span className="nav-toggle-icon sidebar-label">
        <svg className="icon-plus" style={{ display: expanded["inventory"] ? "none" : "block" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <svg className="icon-minus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: expanded["inventory"] ? "block" : "none" }}><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </span>
    </button>
    <div className={`submenu ${expanded["inventory"] ? "open" : ""}`} id="submenu-inventory" inert={!expanded["inventory"]}>
      <NavLink onClick={onNavigate} end to="/inventory/products" className="submenu-item" data-page="products">Sản phẩm</NavLink>
      <NavLink onClick={onNavigate} end to="/inventory/ingredients" className="submenu-item" data-page="ingredients">Nguyên vật liệu</NavLink>
      <NavLink onClick={onNavigate} end to="/inventory/products/new" className="submenu-item" data-page="add-product">Thêm sản phẩm</NavLink>
      <NavLink onClick={onNavigate} end to="/inventory/categories" className="submenu-item" data-page="categories">Danh mục</NavLink>
      <NavLink onClick={onNavigate} end to="/inventory/branches" className="submenu-item" data-page="branches">Chi nhánh</NavLink>
      <NavLink onClick={onNavigate} end to="/inventory/units" className="submenu-item" data-page="units">Đơn vị tính</NavLink>
      <NavLink onClick={onNavigate} end to="/inventory/stock-adjustment" className="submenu-item" data-page="stock-adjustment">Điều chỉnh kho</NavLink>
    </div>
  </div>

  
  <div className="submenu-group" data-submenu="purchases">
    <button className="nav-item submenu-toggle" type="button" aria-controls="submenu-purchases" data-page-group="purchases" onClick={() => setExpanded(current => ({ ...current, "purchases": !current["purchases"] }))} aria-expanded={!!expanded["purchases"]}>
      <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <span className="sidebar-label flex-1 text-left">Nhập hàng</span>
      <span className="nav-toggle-icon sidebar-label">
        <svg className="icon-plus" style={{ display: expanded["purchases"] ? "none" : "block" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <svg className="icon-minus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: expanded["purchases"] ? "block" : "none" }}><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </span>
    </button>
    <div className={`submenu ${expanded["purchases"] ? "open" : ""}`} id="submenu-purchases" inert={!expanded["purchases"]}>
      <NavLink onClick={onNavigate} end to="/purchases" className="submenu-item" data-page="purchases">Tất cả đơn nhập</NavLink>
      <NavLink onClick={onNavigate} end to="/purchases/new" className="submenu-item" data-page="add-purchase">Tạo đơn nhập</NavLink>
      <NavLink onClick={onNavigate} end to="/purchases/receipts" className="submenu-item" data-page="receipts">Phiếu nhập kho</NavLink>
      <NavLink onClick={onNavigate} end to="/purchases/transfers" className="submenu-item" data-page="stock-transfers">Điều chuyển kho</NavLink>
    </div>
  </div>

  
  <div className="submenu-group" data-submenu="production">
    <button className="nav-item submenu-toggle" type="button" aria-controls="submenu-production" data-page-group="production" onClick={() => setExpanded(current => ({ ...current, "production": !current["production"] }))} aria-expanded={!!expanded["production"]}>
      <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19V5m0 14h16M8 15l3-4 3 2 5-7"/></svg>
      <span className="sidebar-label flex-1 text-left">Sản xuất & Pha chế</span>
      <span className="nav-toggle-icon sidebar-label"><svg className="icon-plus" style={{ display: expanded["production"] ? "none" : "block" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg><svg className="icon-minus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: expanded["production"] ? "block" : "none" }}><path d="M5 12h14"/></svg></span>
    </button>
    <div className={`submenu ${expanded["production"] ? "open" : ""}`} id="submenu-production" inert={!expanded["production"]}>
      <NavLink onClick={onNavigate} end to="/production/recipes" className="submenu-item" data-page="recipes">Công thức pha chế</NavLink>
      <NavLink onClick={onNavigate} end to="/production/batches" className="submenu-item" data-page="batches">Lô sản xuất</NavLink>
    </div>
  </div>

  <NavLink onClick={onNavigate} end to="/distribution/planning" className="nav-item" data-page="planning"><svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h13v11H3zM16 11h3l3 3v4h-6z"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="18.5" cy="18.5" r="1.5"/></svg><span className="sidebar-label flex-1">Kế hoạch phân phối</span></NavLink>

  
  <div className="submenu-group" data-submenu="stores">
    <button className="nav-item submenu-toggle" type="button" aria-controls="submenu-stores" data-page-group="stores" onClick={() => setExpanded(current => ({ ...current, "stores": !current["stores"] }))} aria-expanded={!!expanded["stores"]}><svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10h18l-2-6H5l-2 6ZM5 10v10h14V10M9 20v-6h6v6"/></svg><span className="sidebar-label flex-1 text-left">Cửa hàng chi nhánh</span><span className="nav-toggle-icon sidebar-label"><svg className="icon-plus" style={{ display: expanded["stores"] ? "none" : "block" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg><svg className="icon-minus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: expanded["stores"] ? "block" : "none" }}><path d="M5 12h14"/></svg></span></button>
    <div className={`submenu ${expanded["stores"] ? "open" : ""}`} id="submenu-stores" inert={!expanded["stores"]}>
      <NavLink onClick={onNavigate} end to="/stores/ingredients" className="submenu-item" data-page="store-ingredients">Nguyên liệu tại quán</NavLink>
      <NavLink onClick={onNavigate} end to="/stores/shift-reconciliation" className="submenu-item" data-page="shift-reconciliation">Đối soát ca trực</NavLink>
    </div>
  </div>

  
  <div className="submenu-group" data-submenu="sales">
    <button className="nav-item submenu-toggle" type="button" aria-controls="submenu-sales" data-page-group="sales" onClick={() => setExpanded(current => ({ ...current, "sales": !current["sales"] }))} aria-expanded={!!expanded["sales"]}>
      <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      <span className="sidebar-label flex-1 text-left">Bán hàng</span>
      <span className="nav-toggle-icon sidebar-label">
        <svg className="icon-plus" style={{ display: expanded["sales"] ? "none" : "block" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <svg className="icon-minus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: expanded["sales"] ? "block" : "none" }}><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </span>
    </button>
    <div className={`submenu ${expanded["sales"] ? "open" : ""}`} id="submenu-sales" inert={!expanded["sales"]}>
      <NavLink onClick={onNavigate} end to="/sales" className="submenu-item" data-page="sales">Tất cả đơn bán</NavLink>
      <NavLink onClick={onNavigate} end to="/sales/pos" className="submenu-item" data-page="add-sale">Điểm bán hàng (POS)</NavLink>
      <NavLink onClick={onNavigate} end to="/sales/shifts" className="submenu-item" data-page="shifts">Ca làm việc &amp; Bàn giao quỹ</NavLink>
      <NavLink onClick={onNavigate} end to="/sales/preparation" className="submenu-item" data-page="preparation">Hàng đợi pha chế (KDS)</NavLink>
      <NavLink onClick={onNavigate} end to="/sales/returns" className="submenu-item" data-page="sales-returns">Trả hàng bán</NavLink>
      <NavLink onClick={onNavigate} end to="/marketing/promotions" className="submenu-item" data-page="promotions">Khuyến mãi &amp; Voucher</NavLink>
    </div>
  </div>

  <NavLink onClick={onNavigate} end to="/invoices" className="nav-item" data-page="invoices">
    <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    <span className="sidebar-label flex-1">Hóa đơn</span>
  </NavLink>

  <div className="sidebar-section-label">KHÁCH HÀNG</div>

  <NavLink onClick={onNavigate} end to="/customers" className="nav-item" data-page="customers">
    <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    <span className="sidebar-label flex-1">Khách hàng</span>
  </NavLink>

  <NavLink onClick={onNavigate} end to="/suppliers" className="nav-item" data-page="suppliers">
    <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
    <span className="sidebar-label flex-1">Nhà cung cấp</span>
  </NavLink>

  <NavLink onClick={onNavigate} end to="/expenses" className="nav-item" data-page="expenses">
    <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    <span className="sidebar-label flex-1">Chi phí</span>
  </NavLink>

  <div className="sidebar-section-label">BÁO CÁO & PHÂN TÍCH</div>

  
  <div className="submenu-group" data-submenu="reports">
    <button className="nav-item submenu-toggle" type="button" aria-controls="submenu-reports" data-page-group="reports" onClick={() => setExpanded(current => ({ ...current, "reports": !current["reports"] }))} aria-expanded={!!expanded["reports"]}>
      <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      <span className="sidebar-label flex-1 text-left">Báo cáo</span>
      <span className="nav-toggle-icon sidebar-label">
        <svg className="icon-plus" style={{ display: expanded["reports"] ? "none" : "block" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <svg className="icon-minus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: expanded["reports"] ? "block" : "none" }}><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </span>
    </button>
    <div className={`submenu ${expanded["reports"] ? "open" : ""}`} id="submenu-reports" inert={!expanded["reports"]}>
      <NavLink onClick={onNavigate} end to="/reports/sales-report" className="submenu-item" data-page="sales-report">Báo cáo bán hàng</NavLink>
      <NavLink onClick={onNavigate} end to="/reports/purchase-report" className="submenu-item" data-page="purchase-report">Báo cáo nhập hàng</NavLink>
      <NavLink onClick={onNavigate} end to="/reports/inventory-report" className="submenu-item" data-page="inventory-report">Báo cáo tồn kho</NavLink>
      <NavLink onClick={onNavigate} end to="/reports/profit-loss" className="submenu-item" data-page="profit-loss">Lợi nhuận &amp; Lỗ</NavLink>
      <NavLink onClick={onNavigate} end to="/reports/customer-report" className="submenu-item" data-page="customer-report">Báo cáo khách hàng</NavLink>
      <NavLink onClick={onNavigate} end to="/reports/supplier-report" className="submenu-item" data-page="supplier-report">Báo cáo nhà cung cấp</NavLink>
    </div>
  </div>

  <div className="sidebar-section-label">QUẢN TRỊ HỆ THỐNG</div>

  
  <div className="submenu-group" data-submenu="users">
    <button className="nav-item submenu-toggle" type="button" aria-controls="submenu-users" data-page-group="users" onClick={() => setExpanded(current => ({ ...current, "users": !current["users"] }))} aria-expanded={!!expanded["users"]}>
      <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span className="sidebar-label flex-1 text-left">Người dùng</span>
      <span className="nav-toggle-icon sidebar-label">
        <svg className="icon-plus" style={{ display: expanded["users"] ? "none" : "block" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <svg className="icon-minus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: expanded["users"] ? "block" : "none" }}><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </span>
    </button>
    <div className={`submenu ${expanded["users"] ? "open" : ""}`} id="submenu-users" inert={!expanded["users"]}>
      <NavLink onClick={onNavigate} end to="/users" className="submenu-item" data-page="users-list">Tất cả người dùng</NavLink>
      <NavLink onClick={onNavigate} end to="/users/roles" className="submenu-item" data-page="roles">Vai trò &amp; Quyền hạn</NavLink>
    </div>
  </div>

  
  <div className="submenu-group" data-submenu="settings">
    <button className="nav-item submenu-toggle" type="button" aria-controls="submenu-settings" data-page-group="settings" onClick={() => setExpanded(current => ({ ...current, "settings": !current["settings"] }))} aria-expanded={!!expanded["settings"]}>
      <svg className="flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M2 12h2M20 12h2M6.34 5.34L4.93 4.93M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M18.66 6.34l-1.41 1.41M6.34 18.66l-1.41 1.41"/></svg>
      <span className="sidebar-label flex-1 text-left">Cài đặt</span>
      <span className="nav-toggle-icon sidebar-label">
        <svg className="icon-plus" style={{ display: expanded["settings"] ? "none" : "block" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <svg className="icon-minus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: expanded["settings"] ? "block" : "none" }}><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </span>
    </button>
    <div className={`submenu ${expanded["settings"] ? "open" : ""}`} id="submenu-settings" inert={!expanded["settings"]}>
      <NavLink onClick={onNavigate} end to="/settings/general" className="submenu-item" data-page="settings-general">Cài đặt chung</NavLink>
      <NavLink onClick={onNavigate} end to="/settings/inventory" className="submenu-item" data-page="settings-inventory">Cài đặt kho</NavLink>
      <NavLink onClick={onNavigate} end to="/settings/sales" className="submenu-item" data-page="settings-sales">Cài đặt bán hàng</NavLink>
      <NavLink onClick={onNavigate} end to="/settings/purchases" className="submenu-item" data-page="settings-purchases">Cài đặt nhập hàng</NavLink>
      <NavLink onClick={onNavigate} end to="/settings/notifications" className="submenu-item" data-page="settings-notifications">Thông báo</NavLink>
      <NavLink onClick={onNavigate} end to="/settings/offline-sync" className="submenu-item" data-page="settings-offline-sync">Đồng bộ &amp; Offline</NavLink>
    </div>
  </div>
</nav>


<div id="sidebar-user" className="p-3 border-t" style={{"borderColor": "var(--border)", "flexShrink": "0"}}>
  <NavLink onClick={onNavigate} end to="/profile" className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--background)] transition-colors" style={{"textDecoration": "none"}}>
    <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{"background": "var(--primary)"}}>HL</div>
    <div className="sidebar-label min-w-0">
      <div style={{"fontSize": "13px", "fontWeight": "600", "color": "var(--text)", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis"}}>Nguyễn Hoàng Long</div>
      <div style={{"fontSize": "11px", "color": "var(--muted)"}}>Quản trị viên</div>
    </div>
  </NavLink>
</div>
  </aside>;
}
