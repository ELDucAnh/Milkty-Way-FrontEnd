import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/useToast";
import TemplateChart from "../../components/sales/TemplateChart";
import {
  EmptyState,
  FilterBar,
  HighlightText,
  InfoTip,
  KpiStrip,
  ScopeBadge,
  SideDrawer,
  SortableTh,
  SortMenu,
  StatusPill,
  normalizeVi,
  usePageUiState,
  type PillTone,
  type SearchSuggestion,
  type SortOption,
} from "../../components/shared/ui-kit";
import { homePath, scopedBranch } from "../../utils/auth";
import { formatCurrency, getTodayISO } from "../shared/formatters";
import { useDemoState } from "../shared/useDemoState";

type SupplierSortKey =
  | "name-asc"
  | "name-desc"
  | "since-asc"
  | "since-desc"
  | "purchase-desc"
  | "purchase-asc";

const SORT_OPTIONS: SortOption<SupplierSortKey>[] = [
  { key: "name-asc", label: "Tên NCC A → Z", fieldLabel: "Tên nhà cung cấp" },
  { key: "name-desc", label: "Tên NCC Z → A", fieldLabel: "Tên nhà cung cấp" },
  {
    key: "since-asc",
    label: "Hợp tác lâu nhất → mới nhất",
    fieldLabel: "Ngày hợp tác (partnerSince)",
  },
  {
    key: "since-desc",
    label: "Hợp tác mới nhất → lâu nhất",
    fieldLabel: "Ngày hợp tác (partnerSince)",
  },
  {
    key: "purchase-desc",
    label: "Kim ngạch mua cao → thấp",
    fieldLabel: "Tổng nhập (VNĐ)",
  },
];

interface SupplierRecord {
  id: string;
  name: string;
  taxCode: string;
  province: string;
  address: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  partnerSince: string; // YYYY-MM-DD
  branchIds: string[]; // ["ALL"] or specific branch IDs
  orderCount: number;
  totalPurchase: number;
  debt: number;
  paymentTerm: string;
  foodSafetyStandard: string;
  status: "Đang giao dịch" | "Tạm ngưng nhập";
}

const INITIAL_SUPPLIERS: SupplierRecord[] = [
  {
    id: "NCC-001",
    name: "Công ty TNHH Trà Lộc Phát Bảo Lộc",
    taxCode: "0312456789",
    province: "Lâm Đồng",
    address: "KCN Lộc Sơn, TP. Bảo Lộc, Lâm Đồng",
    initials: "LP",
    avatarBg: "bg-emerald-50 dark:bg-emerald-950/40",
    avatarColor: "text-emerald-700 dark:text-emerald-300",
    category: "Trà lá & Cà phê",
    contactPerson: "Nguyễn Văn Phát",
    phone: "0903 412 888",
    email: "kinhdoanh@tralocphat.vn",
    partnerSince: "2020-04-15",
    branchIds: ["ALL"],
    orderCount: 148,
    totalPurchase: 1420000000,
    debt: 42000000,
    paymentTerm: "Gối đầu 30 ngày",
    foodSafetyStandard: "ISO 22000 & VietGAP",
    status: "Đang giao dịch",
  },
  {
    id: "NCC-002",
    name: "CP Gia Thịnh Phát (GTP Nguyên liệu Trà Sữa)",
    taxCode: "0309876123",
    province: "TP.HCM",
    address: "Lô C2, KCN Tân Bình, TP.HCM",
    initials: "GT",
    avatarBg: "bg-sky-50 dark:bg-sky-950/40",
    avatarColor: "text-sky-700 dark:text-sky-300",
    category: "Bột sữa & Topping trân châu",
    contactPerson: "Trần Gia Thịnh",
    phone: "0908 552 100",
    email: "sales@gtpnguyenlieu.vn",
    partnerSince: "2021-08-10",
    branchIds: ["ALL"],
    orderCount: 124,
    totalPurchase: 1185000000,
    debt: 0,
    paymentTerm: "Gối đầu 15 ngày",
    foodSafetyStandard: "HACCP & ATVSTP",
    status: "Đang giao dịch",
  },
  {
    id: "NCC-003",
    name: "Bao Bì Xanh Sài Gòn",
    taxCode: "0315220987",
    province: "Bình Dương",
    address: "VSIP 1, Thuận An, Bình Dương",
    initials: "BB",
    avatarBg: "bg-indigo-50 dark:bg-indigo-950/40",
    avatarColor: "text-indigo-700 dark:text-indigo-300",
    category: "Bao bì ly nắp & Vật tư",
    contactPerson: "Lê Minh Hoàng",
    phone: "0934 778 900",
    email: "baogia@baobixanhsg.com",
    partnerSince: "2022-05-01",
    branchIds: ["ALL"],
    orderCount: 92,
    totalPurchase: 645000000,
    debt: 18500000,
    paymentTerm: "Gối đầu 30 ngày",
    foodSafetyStandard: "QCVN 12-1 Bao bì thực phẩm",
    status: "Đang giao dịch",
  },
  {
    id: "NCC-004",
    name: "Đường Biên Hòa F&B & Hương Liệu Việt",
    taxCode: "0301122334",
    province: "Đồng Nai",
    address: "KCN Biên Hòa II, Đồng Nai",
    initials: "BH",
    avatarBg: "bg-amber-50 dark:bg-amber-950/40",
    avatarColor: "text-amber-700 dark:text-amber-300",
    category: "Sữa tươi & Kem béo",
    contactPerson: "Phạm Thị Thu Hương",
    phone: "0912 340 555",
    email: "b2b@huonglieuviet.vn",
    partnerSince: "2023-02-20",
    branchIds: ["CN01", "CN05", "CN08", "CN02"],
    orderCount: 68,
    totalPurchase: 530000000,
    debt: 12000000,
    paymentTerm: "Gối đầu 15 ngày",
    foodSafetyStandard: "ISO 22000",
    status: "Đang giao dịch",
  },
  {
    id: "NCC-005",
    name: "HTX Nông Sản & Trái Cây Tươi Đà Lạt GAP",
    taxCode: "5801234999",
    province: "Lâm Đồng",
    address: "Phường 8, TP. Đà Lạt, Lâm Đồng",
    initials: "DL",
    avatarBg: "bg-emerald-50 dark:bg-emerald-950/40",
    avatarColor: "text-emerald-700 dark:text-emerald-300",
    category: "Trái cây tươi & Nông sản",
    contactPerson: "Đoàn Văn Lâm",
    phone: "0977 882 331",
    email: "dalatgap@htxnongsan.vn",
    partnerSince: "2024-06-12",
    branchIds: ["CN01", "CN05", "CN03"],
    orderCount: 41,
    totalPurchase: 312000000,
    debt: 0,
    paymentTerm: "Thanh toán ngay khi nhận hàng (COD)",
    foodSafetyStandard: "VietGAP Tươi Sạch",
    status: "Đang giao dịch",
  },
  {
    id: "NCC-006",
    name: "Thiết Bị Quầy Bar Á Châu (Barista Pro)",
    taxCode: "0316998811",
    province: "TP.HCM",
    address: "180 Điện Biên Phủ, Bình Thạnh, TP.HCM",
    initials: "AC",
    avatarBg: "bg-slate-100 dark:bg-slate-800",
    avatarColor: "text-slate-700 dark:text-slate-300",
    category: "Thiết bị Barista quầy bar",
    contactPerson: "Võ Tấn Dũng",
    phone: "0909 777 444",
    email: "support@baristapro.vn",
    partnerSince: "2026-04-05",
    branchIds: ["CN05", "CN06"],
    orderCount: 14,
    totalPurchase: 195000000,
    debt: 0,
    paymentTerm: "Gối đầu 45 ngày",
    foodSafetyStandard: "CO/CQ Chính hãng",
    status: "Đang giao dịch",
  },
  {
    id: "NCC-007",
    name: "Công ty Syrup Nhập Khẩu Phương Nam",
    taxCode: "0314002211",
    province: "TP.HCM",
    address: "Quận 7, TP.HCM",
    initials: "PN",
    avatarBg: "bg-rose-50 dark:bg-rose-950/40",
    avatarColor: "text-rose-700 dark:text-rose-300",
    category: "Sữa tươi & Kem béo",
    contactPerson: "Ngô Minh Tuấn",
    phone: "0919 661 234",
    email: "tuan@syrupphuongnam.vn",
    partnerSince: "2021-11-18",
    branchIds: ["CN02", "CN08"],
    orderCount: 29,
    totalPurchase: 168000000,
    debt: 8500000,
    paymentTerm: "Gối đầu 15 ngày",
    foodSafetyStandard: "Đang chờ gia hạn hồ sơ kiểm định",
    status: "Tạm ngưng nhập",
  },
];

function computeTenure(partnerSince: string, todayISO: string) {
  const start = new Date(`${partnerSince}T00:00:00Z`);
  const end = new Date(`${todayISO}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      monthYear: partnerSince,
      durationLabel: "Đang cập nhật",
      tierLabel: "Mới",
      tierTone: "neutral" as PillTone,
    };
  }
  const totalMonths = Math.max(
    0,
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth()),
  );
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const monthYear = `${String(start.getUTCMonth() + 1).padStart(2, "0")}/${start.getUTCFullYear()}`;
  const durationLabel =
    years > 0
      ? months > 0
        ? `${years} năm ${months} tháng`
        : `${years} năm`
      : `${Math.max(1, months)} tháng`;

  let tierLabel = "Đối tác mới (<1 năm)";
  let tierTone: PillTone = "info";
  if (totalMonths >= 36) {
    tierLabel = "Lâu năm (>3 năm)";
    tierTone = "success";
  } else if (totalMonths >= 12) {
    tierLabel = "Ổn định (1–3 năm)";
    tierTone = "neutral";
  }
  return { monthYear, durationLabel, tierLabel, tierTone };
}

export default function SuppliersPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data] = useDemoState();
  const branchScope = scopedBranch();
  const today = getTodayISO();

  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(INITIAL_SUPPLIERS);

  const [ui, setUi] = usePageUiState<{
    branch: string;
    search: string;
    category: string;
    status: string;
    sortBy: SupplierSortKey;
    density: "normal" | "compact";
    showChart: boolean;
  }>("mw_ui_suppliers_v1", {
    branch: branchScope ?? "ALL",
    search: "",
    category: "",
    status: "",
    sortBy: "name-asc",
    density: "normal",
    showChart: false,
  });

  const activeBranch = branchScope ?? ui.branch;
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(
    null,
  );
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  // Add form
  const [newForm, setNewForm] = useState({
    name: "",
    taxCode: "",
    category: "Trà lá & Cà phê",
    contactPerson: "",
    phone: "",
    email: "",
    province: "TP.HCM",
    address: "",
    partnerSince: today,
    paymentTerm: "Gối đầu 30 ngày",
    foodSafetyStandard: "Đã thẩm định đạt chuẩn",
  });

  const branchScale = activeBranch === "ALL" ? 1 : 0.14;

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const q = normalizeVi(ui.search.trim());
    if (!q) return [];
    return suppliers
      .filter((s) =>
        normalizeVi(`${s.id} ${s.name} ${s.category}`).includes(q),
      )
      .slice(0, 8)
      .map((s) => ({
        id: s.id,
        group: "Nhà cung cấp",
        label: s.name,
        subLabel: `${s.id} · ${s.category}`,
        onSelect: () => setUi((p) => ({ ...p, search: s.name })),
      }));
  }, [suppliers, ui.search, setUi]);

  const filteredSuppliers = useMemo(() => {
    const q = normalizeVi(ui.search.trim());
    const rows = suppliers.filter((s) => {
      if (
        activeBranch !== "ALL" &&
        !s.branchIds.includes("ALL") &&
        !s.branchIds.includes(activeBranch)
      ) {
        return false;
      }
      if (ui.category && s.category !== ui.category) return false;
      if (ui.status && s.status !== ui.status) return false;
      if (q) {
        const blob = normalizeVi(
          `${s.id} ${s.name} ${s.taxCode} ${s.contactPerson} ${s.phone} ${s.category} ${s.province}`,
        );
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    rows.sort((a, b) => {
      if (ui.sortBy === "name-asc") return a.name.localeCompare(b.name, "vi");
      if (ui.sortBy === "name-desc") return b.name.localeCompare(a.name, "vi");
      if (ui.sortBy === "since-asc")
        return a.partnerSince.localeCompare(b.partnerSince);
      if (ui.sortBy === "since-desc")
        return b.partnerSince.localeCompare(a.partnerSince);
      if (ui.sortBy === "purchase-asc")
        return a.totalPurchase - b.totalPurchase;
      return b.totalPurchase - a.totalPurchase;
    });
    return rows;
  }, [suppliers, activeBranch, ui.category, ui.status, ui.search, ui.sortBy]);

  const kpiStats = useMemo(() => {
    const activeCount = filteredSuppliers.filter(
      (s) => s.status === "Đang giao dịch",
    ).length;
    const totalPurchase = filteredSuppliers.reduce(
      (acc, s) => acc + Math.round(s.totalPurchase * branchScale),
      0,
    );
    const totalDebt = filteredSuppliers.reduce(
      (acc, s) => acc + Math.round(s.debt * branchScale),
      0,
    );
    return {
      total: filteredSuppliers.length,
      activeCount,
      totalPurchase,
      totalDebt,
    };
  }, [filteredSuppliers, branchScale]);

  const chartData = useMemo(() => {
    const top = [...filteredSuppliers]
      .sort((a, b) => b.totalPurchase - a.totalPurchase)
      .slice(0, 6);
    return {
      labels: top.map((s) => s.initials + " · " + s.id),
      values: top.map((s) =>
        Number(((s.totalPurchase * branchScale) / 1000000).toFixed(1)),
      ),
    };
  }, [filteredSuppliers, branchScale]);

  function handleAddSupplier(e: FormEvent) {
    e.preventDefault();
    if (!newForm.name.trim() || !newForm.contactPerson.trim()) return;
    const seq = String(suppliers.length + 1).padStart(3, "0");
    const words = newForm.name.trim().split(/\s+/);
    const initials = words
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
    const record: SupplierRecord = {
      id: `NCC-${seq}`,
      name: newForm.name.trim(),
      taxCode: newForm.taxCode.trim() || "0318000999",
      province: newForm.province.trim() || "TP.HCM",
      address: newForm.address.trim() || "Kho giao nhận chuẩn",
      initials: initials || "NC",
      avatarBg: "bg-sky-50 dark:bg-sky-950/40",
      avatarColor: "text-sky-700 dark:text-sky-300",
      category: newForm.category,
      contactPerson: newForm.contactPerson.trim(),
      phone: newForm.phone.trim(),
      email: newForm.email.trim() || "contact@supplier.vn",
      partnerSince: newForm.partnerSince || today,
      branchIds: [activeBranch === "ALL" ? "ALL" : activeBranch],
      orderCount: 0,
      totalPurchase: 0,
      debt: 0,
      paymentTerm: newForm.paymentTerm,
      foodSafetyStandard: newForm.foodSafetyStandard,
      status: "Đang giao dịch",
    };
    setSuppliers((cur) => [record, ...cur]);
    setShowAddDrawer(false);
    setNewForm({
      name: "",
      taxCode: "",
      category: "Trà lá & Cà phê",
      contactPerson: "",
      phone: "",
      email: "",
      province: "TP.HCM",
      address: "",
      partnerSince: today,
      paymentTerm: "Gối đầu 30 ngày",
      foodSafetyStandard: "Đã thẩm định đạt chuẩn",
    });
    toast.success(`Đã thêm nhà cung cấp đối tác ${record.name}.`);
  }

  return (
    <div>
      <div className="page-header !mb-4">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <span>Kho tổng &amp; Thu mua</span>
            <span className="sep">/</span>
            <span className="current">Nhà cung cấp</span>
          </nav>
          <h1 className="page-title">Nhà cung cấp nguyên liệu</h1>
          <p className="page-subtitle">
            Quản lý đối tác cung ứng, thời gian hợp tác lâu năm, kim ngạch mua hàng và công nợ từng chi nhánh.
          </p>
        </div>

        <div className="page-header-actions flex-wrap">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              setUi((p) => ({ ...p, showChart: !p.showChart }))
            }
          >
            {ui.showChart ? "Ẩn biểu đồ" : "Biểu đồ kim ngạch"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddDrawer(true)}
          >
            + Thêm Nhà Cung Cấp
          </button>
        </div>
      </div>

      {/* Scope Bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <ScopeBadge
          branchScope={branchScope}
          value={activeBranch}
          onChange={(next) => setUi((p) => ({ ...p, branch: next }))}
          stores={data.stores}
          allLabel="Toàn chuỗi (Kho Tổng)"
        />
        <InfoTip
          title="Thâm niên & phạm vi nhà cung cấp"
          summary="Theo dõi mốc bắt đầu hợp tác (partnerSince), thâm niên cung ứng và lọc nhà cung cấp phục vụ theo từng chi nhánh hoặc Kho Tổng."
        />
      </div>

      <KpiStrip
        items={[
          {
            key: "total",
            label: "NCC trong phạm vi",
            value: String(kpiStats.total),
            subLabel: "Đối tác được lọc",
            icon: "truck",
            tone: "primary",
          },
          {
            key: "active",
            label: "Đang giao dịch ổn định",
            value: String(kpiStats.activeCount),
            subLabel: "Hồ sơ ATVSTP đạt chuẩn",
            icon: "document-check",
            tone: "success",
            valueTone: "success",
          },
          {
            key: "purchase",
            label: "Tổng kim ngạch nhập",
            value: formatCurrency(kpiStats.totalPurchase),
            subLabel: activeBranch === "ALL" ? "Toàn chuỗi" : `Ước tính tại ${activeBranch}`,
            icon: "currency",
            tone: "info",
          },
          {
            key: "debt",
            label: "Công nợ phải trả",
            value: formatCurrency(kpiStats.totalDebt),
            subLabel: "Theo kỳ hạn thanh toán",
            icon: "balance",
            tone: kpiStats.totalDebt > 0 ? "warning" : "primary",
            valueTone: kpiStats.totalDebt > 0 ? "warning" : "default",
          },
        ]}
      />

      {ui.showChart && (
        <section className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[var(--heading-color)]">
              Top nhà cung cấp theo kim ngạch nhập ({activeBranch === "ALL" ? "Toàn chuỗi" : activeBranch})
            </h2>
            <span className="text-xs text-[var(--muted)]">Đơn vị: Triệu đồng</span>
          </div>
          <div className="h-[220px]">
            <TemplateChart
              labels={chartData.labels}
              values={chartData.values}
              bars
              seriesLabel="Kim ngạch nhập"
              unitSuffix="Tr.đ"
            />
          </div>
        </section>
      )}

      <FilterBar
        search={ui.search}
        onSearchChange={(next) => setUi((p) => ({ ...p, search: next }))}
        searchPlaceholder="Tìm tên NCC, mã NCC, MST, người liên hệ hoặc SĐT..."
        suggestions={suggestions}
        density={ui.density}
        onToggleDensity={() =>
          setUi((p) => ({
            ...p,
            density: p.density === "compact" ? "normal" : "compact",
          }))
        }
        onClearAll={() =>
          setUi((p) => ({
            ...p,
            search: "",
            category: "",
            status: "",
            sortBy: "name-asc",
          }))
        }
        filters={
          <>
            <select
              aria-label="Lọc nhóm hàng"
              value={ui.category}
              onChange={(e) => setUi((p) => ({ ...p, category: e.target.value }))}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--text)]"
            >
              <option value="">Tất cả nhóm hàng</option>
              <option value="Trà lá & Cà phê">Trà lá &amp; Cà phê</option>
              <option value="Bột sữa & Topping trân châu">Bột sữa &amp; Topping trân châu</option>
              <option value="Sữa tươi & Kem béo">Sữa tươi &amp; Kem béo</option>
              <option value="Bao bì ly nắp & Vật tư">Bao bì ly nắp &amp; Vật tư</option>
              <option value="Trái cây tươi & Nông sản">Trái cây tươi &amp; Nông sản</option>
              <option value="Thiết bị Barista quầy bar">Thiết bị Barista quầy bar</option>
            </select>
            <select
              aria-label="Lọc trạng thái"
              value={ui.status}
              onChange={(e) => setUi((p) => ({ ...p, status: e.target.value }))}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--text)]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Đang giao dịch">Đang giao dịch</option>
              <option value="Tạm ngưng nhập">Tạm ngưng nhập</option>
            </select>
          </>
        }
        sortMenu={
          <SortMenu
            options={SORT_OPTIONS}
            value={ui.sortBy}
            onChange={(next) => setUi((p) => ({ ...p, sortBy: next }))}
          />
        }
      />

      <section className="card p-0 overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <EmptyState
            title="Không tìm thấy nhà cung cấp nào phù hợp điều kiện lọc."
            actionLabel="Xóa bộ lọc"
            onAction={() =>
              setUi((p) => ({ ...p, search: "", category: "", status: "" }))
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table
              className={`data-table ${ui.density === "compact" ? "text-xs" : ""}`}
            >
              <thead>
                <tr>
                  <SortableTh
                    label="Nhà cung cấp"
                    fieldHint="supplier.name"
                    ascKey="name-asc"
                    descKey="name-desc"
                    currentSort={ui.sortBy}
                    onSort={(next) =>
                      setUi((p) => ({ ...p, sortBy: next as SupplierSortKey }))
                    }
                  />
                  <th>Nhóm hàng &amp; Liên hệ</th>
                  <SortableTh
                    label="Hợp tác từ bao lâu"
                    fieldHint="supplier.partnerSince"
                    ascKey="since-asc"
                    descKey="since-desc"
                    currentSort={ui.sortBy}
                    onSort={(next) =>
                      setUi((p) => ({ ...p, sortBy: next as SupplierSortKey }))
                    }
                  />
                  <SortableTh
                    label="Tổng nhập &amp; Công nợ"
                    fieldHint="supplier.totalPurchase"
                    ascKey="purchase-asc"
                    descKey="purchase-desc"
                    currentSort={ui.sortBy}
                    onSort={(next) =>
                      setUi((p) => ({ ...p, sortBy: next as SupplierSortKey }))
                    }
                    align="right"
                  />
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => {
                  const tenure = computeTenure(supplier.partnerSince, today);
                  const scaledPurchase = Math.round(supplier.totalPurchase * branchScale);
                  const scaledDebt = Math.round(supplier.debt * branchScale);
                  return (
                    <tr key={supplier.id}>
                      <td>
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl ${supplier.avatarBg} ${supplier.avatarColor} font-bold text-xs flex items-center justify-center shrink-0 border border-current/15`}
                          >
                            {supplier.initials}
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--text)] leading-tight">
                              <HighlightText text={supplier.name} query={ui.search} />
                            </div>
                            <div className="text-[11px] text-[var(--muted)] mt-0.5">
                              {supplier.id} · MST {supplier.taxCode} · {supplier.province}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="font-medium text-xs text-[var(--text)]">
                          {supplier.category}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] mt-0.5">
                          {supplier.contactPerson} · {supplier.phone}
                        </div>
                      </td>

                      <td>
                        <div className="text-xs font-semibold text-[var(--heading-color)]">
                          Từ {tenure.monthYear} · {tenure.durationLabel}
                        </div>
                        <div className="mt-1">
                          <StatusPill label={tenure.tierLabel} tone={tenure.tierTone} />
                        </div>
                      </td>

                      <td className="text-right tabular-nums">
                        <div className="font-semibold text-[var(--text)]">
                          {formatCurrency(scaledPurchase)}
                        </div>
                        <div
                          className={`text-[11px] ${scaledDebt > 0
                            ? "text-amber-600 dark:text-amber-400 font-medium"
                            : "text-[var(--muted)]"
                            }`}
                        >
                          Nợ: {formatCurrency(scaledDebt)} ({supplier.orderCount} lô)
                        </div>
                      </td>

                      <td>
                        <StatusPill
                          label={supplier.status}
                          tone={supplier.status === "Đang giao dịch" ? "success" : "danger"}
                        />
                      </td>

                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedSupplier(supplier)}
                        >
                          Hồ sơ NCC
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SideDrawer 1: Supplier Details */}
      <SideDrawer
        isOpen={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        title={selectedSupplier?.name ?? "Hồ sơ đối tác"}
        subtitle={
          selectedSupplier
            ? `${selectedSupplier.id} · MST ${selectedSupplier.taxCode} · Đối tác từ ${computeTenure(selectedSupplier.partnerSince, today).monthYear}`
            : ""
        }
        widthClass="max-w-[540px]"
        footer={
          selectedSupplier && (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const s = selectedSupplier;
                  setSelectedSupplier(null);
                  navigate("/purchases/new");
                  toast.info(`Bắt đầu lập đơn PO với ${s.name}`);
                }}
              >
                + Lập đơn mua PO với NCC này
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedSupplier(null)}
              >
                Đóng
              </button>
            </div>
          )
        }
      >
        {selectedSupplier && (() => {
          const tenure = computeTenure(selectedSupplier.partnerSince, today);
          return (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[var(--muted)]">Thời gian hợp tác</div>
                  <div className="text-sm font-bold text-[var(--heading-color)] mt-0.5">
                    Từ {tenure.monthYear} ({tenure.durationLabel})
                  </div>
                </div>
                <StatusPill label={tenure.tierLabel} tone={tenure.tierTone} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--border)] p-3 space-y-1.5">
                  <div className="font-semibold text-[var(--heading-color)]">
                    Liên hệ &amp; Địa chỉ kho
                  </div>
                  <div>Người phụ trách: <strong>{selectedSupplier.contactPerson}</strong></div>
                  <div>Hotline: <strong className="font-mono">{selectedSupplier.phone}</strong></div>
                  <div>Email: <span className="text-sky-600">{selectedSupplier.email}</span></div>
                  <div>Địa chỉ: {selectedSupplier.address}</div>
                </div>

                <div className="rounded-xl border border-[var(--border)] p-3 space-y-1.5">
                  <div className="font-semibold text-[var(--heading-color)]">
                    Điều khoản &amp; ATVSTP
                  </div>
                  <div>Kỳ hạn TT: <strong>{selectedSupplier.paymentTerm}</strong></div>
                  <div>Chuẩn ATVSTP: <strong>{selectedSupplier.foodSafetyStandard}</strong></div>
                  <div>
                    Phạm vi cung ứng:{" "}
                    <strong>
                      {selectedSupplier.branchIds.includes("ALL")
                        ? "Kho Tổng (Toàn chuỗi)"
                        : selectedSupplier.branchIds.join(", ")}
                    </strong>
                  </div>
                  <div>Số lô đã giao: <strong>{selectedSupplier.orderCount} lô</strong></div>
                </div>
              </div>
            </div>
          );
        })()}
      </SideDrawer>

      {/* SideDrawer 2: Add Supplier */}
      <SideDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        title="Thêm Nhà Cung Cấp Mới"
        widthClass="max-w-[500px]"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddDrawer(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="add-supplier-form"
              className="btn btn-primary"
            >
              Lưu Nhà Cung Cấp
            </button>
          </div>
        }
      >
        <form
          id="add-supplier-form"
          onSubmit={handleAddSupplier}
          className="space-y-3 text-xs"
        >
          <div>
            <label className="form-label" htmlFor="sup-name">
              Tên Doanh Nghiệp / Nhà Cung Cấp *
            </label>
            <input
              id="sup-name"
              type="text"
              className="form-input"
              value={newForm.name}
              onChange={(e) => setNewForm((c) => ({ ...c, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="sup-mst">Mã số thuế</label>
              <input
                id="sup-mst"
                className="form-input"
                value={newForm.taxCode}
                onChange={(e) => setNewForm((c) => ({ ...c, taxCode: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="sup-since">Bắt đầu hợp tác từ *</label>
              <input
                id="sup-since"
                type="date"
                className="form-input"
                value={newForm.partnerSince}
                onChange={(e) =>
                  setNewForm((c) => ({ ...c, partnerSince: e.target.value }))
                }
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="sup-cat">Nhóm hàng</label>
              <select
                id="sup-cat"
                className="form-input form-select"
                value={newForm.category}
                onChange={(e) => setNewForm((c) => ({ ...c, category: e.target.value }))}
              >
                <option value="Trà lá & Cà phê">Trà lá &amp; Cà phê</option>
                <option value="Bột sữa & Topping trân châu">Bột sữa &amp; Topping trân châu</option>
                <option value="Sữa tươi & Kem béo">Sữa tươi &amp; Kem béo</option>
                <option value="Bao bì ly nắp & Vật tư">Bao bì ly nắp &amp; Vật tư</option>
                <option value="Trái cây tươi & Nông sản">Trái cây tươi &amp; Nông sản</option>
                <option value="Thiết bị Barista quầy bar">Thiết bị Barista quầy bar</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="sup-prov">Tỉnh / Thành phố</label>
              <input
                id="sup-prov"
                className="form-input"
                value={newForm.province}
                onChange={(e) => setNewForm((c) => ({ ...c, province: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="sup-contact">Người liên hệ *</label>
              <input
                id="sup-contact"
                className="form-input"
                value={newForm.contactPerson}
                onChange={(e) =>
                  setNewForm((c) => ({ ...c, contactPerson: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="sup-phone">Hotline *</label>
              <input
                id="sup-phone"
                className="form-input"
                value={newForm.phone}
                onChange={(e) => setNewForm((c) => ({ ...c, phone: e.target.value }))}
                required
              />
            </div>
          </div>
        </form>
      </SideDrawer>
    </div>
  );
}
