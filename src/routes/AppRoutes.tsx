import { useEffect } from "react";
import { canVisit, checkLogin, homePath, logout } from "../utils/auth";
import { useLocation, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import NotFoundPage from "../pages/NotFoundPage";

// Sales & POS
import DashboardPage from "../pages/sales/DashboardPage";
import PosTerminalPage from "../pages/sales/PosTerminalPage";
import SalesListPage from "../pages/sales/SalesListPage";
import SalesReturnsPage from "../pages/sales/SalesReturnsPage";
import ShiftsPage from "../pages/sales/ShiftsPage";
import PreparationQueuePage from "../pages/sales/PreparationQueuePage";
import CustomersPage from "../pages/sales/CustomersPage";
import PromotionsPage from "../pages/sales/PromotionsPage";
import BranchPromotionsPage from "../pages/sales/BranchPromotionsPage";

// Inventory
import ProductsPage from "../pages/inventory/ProductsPage";
import IngredientsPage from "../pages/inventory/IngredientsPage";
import AddProductPage from "../pages/inventory/AddProductPage";
import ProductDetailsPage from "../pages/inventory/ProductDetailsPage";
import CategoriesPage from "../pages/inventory/CategoriesPage";
import BranchesPage from "../pages/inventory/BranchesPage";
import UnitsPage from "../pages/inventory/UnitsPage";
import StockAdjustmentPage from "../pages/inventory/StockAdjustmentPage";

// Production
import RecipesPage from "../pages/production/RecipesPage";
import BatchesPage from "../pages/production/BatchesPage";

// Purchases
import PurchasesPage from "../pages/purchases/PurchasesPage";
import AddPurchasePage from "../pages/purchases/AddPurchasePage";
import StockTransfersPage from "../pages/purchases/StockTransfersPage";
import ReceiptsPage from "../pages/purchases/ReceiptsPage";

// Distribution & Stores
import DistributionPlanningPage from "../pages/distribution/DistributionPlanningPage";
import StoreIngredientsPage from "../pages/stores/StoreIngredientsPage";
import ShiftReconciliationPage from "../pages/stores/ShiftReconciliationPage";

// Invoices & Expenses (Người 3)
import InvoicesPage from "../pages/invoices/InvoicesPage";
import InvoiceDetailsPage from "../pages/invoices/InvoiceDetailsPage";
import ExpensesPage from "../pages/expenses/ExpensesPage";

// Suppliers (Người 3)
import SuppliersPage from "../pages/suppliers/SuppliersPage";

// Users & Roles (Người 3)
import UsersPage from "../pages/users/UsersPage";
import RolesPage from "../pages/users/RolesPage";

// Settings (Người 3)
import GeneralSettingsPage from "../pages/settings/GeneralSettingsPage";
import InventorySettingsPage from "../pages/settings/InventorySettingsPage";
import SalesSettingsPage from "../pages/settings/SalesSettingsPage";
import PurchasesSettingsPage from "../pages/settings/PurchasesSettingsPage";
import NotificationsSettingsPage from "../pages/settings/NotificationsSettingsPage";
import OfflineSyncPage from "../pages/settings/OfflineSyncPage";

// Reports (Người 3)
import SalesReportPage from "../pages/reports/SalesReportPage";
import InventoryReportPage from "../pages/reports/InventoryReportPage";
import ProfitLossPage from "../pages/reports/ProfitLossPage";
import CustomerReportPage from "../pages/reports/CustomerReportPage";
import PurchaseReportPage from "../pages/reports/PurchaseReportPage";
import SupplierReportPage from "../pages/reports/SupplierReportPage";

// Auth & Profile (Người 3)
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import ProfilePage from "../pages/auth/ProfilePage";

export default function AppRoutes() {
  const role = checkLogin();
  const { pathname } = useLocation();
  useEffect(() => { if (pathname === "/logout") logout(); }, [pathname]);
  if (role && !canVisit(pathname, role)) return <Navigate to={homePath(role)} replace />;
  return (
    <Routes>
      {/* Auth Layout - Không header, không sidebar */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pages/login" element={<Navigate to="/login" replace />} />
        <Route path="/logout" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pages/register" element={<Navigate to="/register" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/pages/forgot-password" element={<Navigate to="/forgot-password" replace />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/pages/reset-password" element={<Navigate to="/reset-password" replace />} />
      </Route>

      {/* Main Layout - Header & Sidebar tĩnh cố định, inner fade-in */}
      <Route element={role ? <MainLayout /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to={homePath(role)} replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Bán Hàng & POS */}
        <Route path="/sales" element={<SalesListPage />} />
        <Route path="/sales/pos" element={<PosTerminalPage />} />
        <Route path="/sales/returns" element={<SalesReturnsPage />} />
        <Route path="/sales/shifts" element={<ShiftsPage />} />
        <Route path="/sales/preparation" element={<PreparationQueuePage />} />
        <Route path="/sales/promotions" element={<Navigate to="/marketing/promotions" replace />} />
        <Route path="/customers" element={<CustomersPage />} />
        {/* Marketing & Khuyến Mãi */}
        <Route path="/marketing" element={<Navigate to="/marketing/promotions" replace />} />
        <Route path="/marketing/promotions" element={<PromotionsPage />} />
        <Route path="/marketing/branch-promotions" element={<BranchPromotionsPage />} />

        {/* Kho & Nguyên Liệu */}
        <Route path="/inventory" element={<Navigate to="/inventory/products" replace />} />
        <Route path="/inventory/products" element={<ProductsPage />} />
        <Route path="/inventory/products/new" element={<AddProductPage />} />
        <Route path="/inventory/products/:id" element={<ProductDetailsPage />} />
        <Route path="/inventory/add-product" element={<Navigate to="/inventory/products/new" replace />} />
        <Route path="/inventory/branches" element={<BranchesPage />} />
        <Route path="/inventory/categories" element={<CategoriesPage />} />
        <Route path="/inventory/ingredients" element={<IngredientsPage />} />
        <Route path="/inventory/stock-adjustment" element={<StockAdjustmentPage />} />
        <Route path="/inventory/units" element={<UnitsPage />} />

        {/* Sản Xuất & Công Thức */}
        <Route path="/production" element={<Navigate to="/production/recipes" replace />} />
        <Route path="/production/recipes" element={<RecipesPage />} />
        <Route path="/production/batches" element={<BatchesPage />} />

        {/* Nhập Hàng */}
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/purchases/new" element={<AddPurchasePage />} />
        <Route path="/purchases/add-purchase" element={<Navigate to="/purchases/new" replace />} />
        <Route path="/purchases/transfers" element={<StockTransfersPage />} />
        <Route path="/purchases/receipts" element={<ReceiptsPage />} />
        <Route path="/purchases/purchases" element={<Navigate to="/purchases" replace />} />
        <Route path="/purchases/stock-transfers" element={<Navigate to="/purchases/transfers" replace />} />

        {/* Phân Phối & Cửa Hàng Chi Nhánh */}
        <Route path="/distribution" element={<Navigate to="/distribution/planning" replace />} />
        <Route path="/distribution/planning" element={<DistributionPlanningPage />} />
        <Route path="/stores" element={<Navigate to="/stores/ingredients" replace />} />
        <Route path="/stores/ingredients" element={<StoreIngredientsPage />} />
        <Route path="/stores/shift-reconciliation" element={<ShiftReconciliationPage />} />

        {/* Hóa Đơn & Chi Tiết Hóa Đơn (Hỗ trợ cả route /invoices và alias /invoices/invoices) */}
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailsPage />} />
        <Route path="/invoices/invoice-details" element={<InvoiceDetailsPage />} />

        {/* Chi Phí (Hỗ trợ cả /expenses và /expenses/expenses) */}
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/expenses" element={<ExpensesPage />} />

        {/* Nhà Cung Cấp (Hỗ trợ cả /suppliers và /suppliers/suppliers) */}
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/suppliers/suppliers" element={<SuppliersPage />} />

        {/* Nhân Viên & Phân Quyền (Hỗ trợ cả /users và /users/users) */}
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/users" element={<UsersPage />} />
        <Route path="/users/roles" element={<RolesPage />} />

        {/* Báo Cáo & Phân Tích */}
        <Route path="/reports" element={<Navigate to="/reports/sales-report" replace />} />
        <Route path="/reports/sales-report" element={<SalesReportPage />} />
        <Route path="/reports/inventory-report" element={<InventoryReportPage />} />
        <Route path="/reports/profit-loss" element={<ProfitLossPage />} />
        <Route path="/reports/customer-report" element={<CustomerReportPage />} />
        <Route path="/reports/purchase-report" element={<PurchaseReportPage />} />
        <Route path="/reports/supplier-report" element={<SupplierReportPage />} />

        {/* Cài Đặt Hệ Thống */}
        <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
        <Route path="/settings/general" element={<GeneralSettingsPage />} />
        <Route path="/settings/inventory" element={<InventorySettingsPage />} />
        <Route path="/settings/sales" element={<SalesSettingsPage />} />
        <Route path="/settings/purchases" element={<PurchasesSettingsPage />} />
        <Route path="/settings/notifications" element={<NotificationsSettingsPage />} />
        <Route path="/settings/offline-sync" element={<OfflineSyncPage />} />

        {/* Hồ Sơ Cá Nhân (Hỗ trợ cả /profile và alias /pages/profile) */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/pages/profile" element={<ProfilePage />} />

        {/* 404 Trang không tìm thấy */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
