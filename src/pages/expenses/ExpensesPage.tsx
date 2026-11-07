import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/common/Badge";
import type { BadgeVariant } from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import { useToast } from "../../components/common/useToast";

export interface ExpenseItem {
  id: string;
  branch: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  creator: string;
  approver: string;
  attachment: string;
  status: "Đã Duyệt Chi" | "Chờ Duyệt" | "Từ Chối";
  statusVariant: BadgeVariant;
}

const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: "PC-CN01-0021",
    branch: "CN01 — Q.1",
    category: "Mặt bằng",
    description: "Tiền thuê mặt bằng kỳ 2 Tháng 10/2026",
    amount: 35000000,
    date: "28/10/2026",
    creator: "Trần Thu Hà (QL)",
    approver: "BGD duyệt",
    attachment: "HD-VAT-892.pdf",
    status: "Đã Duyệt Chi",
    statusVariant: "success",
  },
  {
    id: "PC-CN05-0045",
    branch: "CN05 — Q.10",
    category: "Điện nước",
    description: "Hóa đơn điện máy lạnh & máy làm đá bi",
    amount: 6850000,
    date: "27/10/2026",
    creator: "Nguyễn Văn Long",
    approver: "Hà TT duyệt",
    attachment: "EVN-202610.pdf",
    status: "Đã Duyệt Chi",
    statusVariant: "success",
  },
  {
    id: "PC-CN06-0033",
    branch: "CN06 — Bình Thạnh",
    category: "Hủy cận date",
    description: "Hủy 15L sữa thanh trùng & 3kg trân châu 4h",
    amount: 1420000,
    date: "26/10/2026",
    creator: "Lê Quốc Tuấn",
    approver: "Chờ QL duyệt",
    attachment: "BB-HUY-1025.pdf",
    status: "Chờ Duyệt",
    statusVariant: "warning",
  },
  {
    id: "PC-CN02-0019",
    branch: "CN02 — Q.3",
    category: "Bảo trì máy",
    description: "Thay dao cắt máy dập màng nắp ly tự động",
    amount: 850000,
    date: "25/10/2026",
    creator: "Vũ Minh Khoa",
    approver: "BGD duyệt",
    attachment: "BK-SC-88.jpg",
    status: "Đã Duyệt Chi",
    statusVariant: "success",
  },
  {
    id: "PC-CN07-0012",
    branch: "CN07 — Gò Vấp",
    category: "Vật tư quầy",
    description: "Mua 5000 ống hút bọc giấy & túi chữ T khẩn cấp",
    amount: 2100000,
    date: "24/10/2026",
    creator: "Đặng Thị Mai",
    approver: "Chờ QL duyệt",
    attachment: "HD-BL-55.pdf",
    status: "Chờ Duyệt",
    statusVariant: "warning",
  },
];

const STORAGE_EXPENSES = "miltyway_expenses_v1";

export default function ExpensesPage() {
  const toast = useToast();
  const [expenses, setExpensesState] = useState<ExpenseItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_EXPENSES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_EXPENSES;
  });

  function setExpenses(next: ExpenseItem[]) {
    setExpensesState(next);
    try {
      localStorage.setItem(STORAGE_EXPENSES, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [newBranch, setNewBranch] = useState("CN01 — Quận 1");
  const [newCategory, setNewCategory] = useState("Điện nước");
  const [newAmount, setNewAmount] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.creator.toLowerCase().includes(q);

      const matchBranch = !selectedBranch || item.branch.includes(selectedBranch);
      const matchCat = !selectedCategory || item.category.includes(selectedCategory);

      return matchSearch && matchBranch && matchCat;
    });
  }, [expenses, search, selectedBranch, selectedCategory]);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || Number(newAmount) <= 0) {
      toast.warning("Vui lòng nhập số tiền chi hợp lệ.", { title: "Cảnh Báo" });
      return;
    }

    const branchCode = newBranch.slice(0, 4);
    const newExpense: ExpenseItem = {
      id: `PC-${branchCode}-${Math.floor(Math.random() * 9000 + 1000)}`,
      branch: newBranch,
      category: newCategory,
      description: newDescription || "Chi vận hành cửa hàng",
      amount: Number(newAmount),
      date: new Date().toLocaleDateString("vi-VN"),
      creator: "Nguyễn Hoàng Long",
      approver: "Chờ duyệt",
      attachment: "phieu-chi.pdf",
      status: "Chờ Duyệt",
      statusVariant: "warning",
    };

    setExpenses([newExpense, ...expenses]);
    setModalOpen(false);
    setNewAmount("");
    setNewDescription("");
    toast.success("Đã lập phiếu chi thành công và gửi phê duyệt!", { title: "Thành Công" });
  };

  const handleApproveExpense = (id: string) => {
    const next = expenses.map((exp) =>
      exp.id === id
        ? { ...exp, status: "Đã Duyệt Chi" as const, statusVariant: "success" as BadgeVariant, approver: "BGD duyệt" }
        : exp
    );
    setExpenses(next);
    toast.success(`Đã phê duyệt phiếu chi ${id}!`, { title: "Duyệt Chi" });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/dashboard">Trang chủ</Link>
            <span className="sep">/</span>
            <span className="current">Chi phí</span>
          </nav>
          <h1 className="page-title">Sổ Theo Dõi Chi Phí Vận Hành</h1>
          <p className="page-subtitle">
            Theo dõi và kiểm soát chi phí vận hành, mặt bằng và chi phí định kỳ toàn hệ thống.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => toast.info("Đang xuất sổ chi tiết chi phí (Excel)...", { title: "Xuất Dữ Liệu" })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Xuất Excel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Lập Phiếu Chi
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <section aria-label="Thống kê chi phí">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Tổng Chi Tháng Này"
            value="412.850.000 ₫"
            subLabel="Toàn chuỗi 12 chi nhánh TP.HCM"
            tone="danger"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            }
          />
          <StatCard
            label="Tiền Thuê Mặt Bằng"
            value="185.000.000 ₫"
            subLabel="Chiếm 44.8% tổng chi phí"
            tone="info"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            }
          />
          <StatCard
            label="Lương Nhân Sự Ca"
            value="158.400.000 ₫"
            subLabel="Thu ngân, Barista &amp; Quản lý"
            tone="primary"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
          />
          <StatCard
            label="Điện Nước &amp; Hủy Hàng"
            value="69.450.000 ₫"
            subLabel="Máy đá, tủ đông &amp; hủy cận date"
            tone="warning"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Filter Bar */}
      <div className="filter-bar mb-5 flex flex-wrap gap-3">
        <div className="search-box flex-1 min-w-[220px]">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="form-input"
            placeholder="Tìm kiếm phiếu chi, nội dung chi, người lập..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input form-select w-auto"
          aria-label="Lọc theo chi nhánh"
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
        >
          <option value="">Tất cả 12 Chi Nhánh</option>
          <option value="CN01">CN01 — Quận 1 (Nguyễn Huệ)</option>
          <option value="CN02">CN02 — Quận 3 (Võ Văn Tần)</option>
          <option value="CN05">CN05 — Quận 10 (Sư Vạn Hạnh)</option>
          <option value="CN06">CN06 — Bình Thạnh (D2)</option>
          <option value="CN07">CN07 — Gò Vấp (Phan Văn Trị)</option>
        </select>
        <select
          className="form-input form-select w-auto"
          aria-label="Lọc danh mục chi"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Tất cả danh mục chi</option>
          <option value="Mặt bằng">Tiền thuê mặt bằng</option>
          <option value="Lương">Lương &amp; Thưởng ca Barista</option>
          <option value="Điện nước">Tiền điện &amp; Nước làm đá</option>
          <option value="Bảo trì máy">Bảo trì máy dập nắp &amp; tủ lạnh</option>
          <option value="Hủy cận date">Hủy nguyên liệu cận date</option>
          <option value="Vật tư quầy">Vật tư quầy &amp; Bao bì</option>
        </select>
      </div>

      {/* Expense Table */}
      <section aria-label="Bảng sổ chi phí">
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Phiếu Chi</th>
                  <th>Chi Nhánh</th>
                  <th>Danh Mục</th>
                  <th>Diễn Giải Nội Dung</th>
                  <th className="text-right">Số Tiền Chi</th>
                  <th>Ngày Chi</th>
                  <th>Người Lập</th>
                  <th>Phê Duyệt</th>
                  <th>Chứng Từ</th>
                  <th>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-[var(--muted)]">
                      Không tìm thấy khoản chi phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="font-mono font-bold text-[var(--text)]">{exp.id}</td>
                      <td>{exp.branch}</td>
                      <td>
                        <span className="font-medium text-[var(--text)]">{exp.category}</span>
                      </td>
                      <td className="text-xs max-w-xs">{exp.description}</td>
                      <td className="text-right font-bold text-[var(--danger)]">
                        {exp.amount.toLocaleString("vi-VN")} ₫
                      </td>
                      <td className="text-xs text-[var(--muted)]">{exp.date}</td>
                      <td className="text-xs">{exp.creator}</td>
                      <td className="text-xs text-[var(--muted)]">{exp.approver}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-[var(--primary)] text-xs flex items-center gap-1"
                          onClick={() => toast.info(`Đang mở xem chứng từ ${exp.attachment}`, { title: "Tệp Đính Kèm" })}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          {exp.attachment}
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Badge variant={exp.statusVariant}>{exp.status}</Badge>
                          {exp.status === "Chờ Duyệt" && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm text-xs"
                              onClick={() => handleApproveExpense(exp.id)}
                            >
                              Duyệt chi
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
            <div className="text-[13px] text-[var(--muted)]">
              Hiển thị 1–{filteredExpenses.length} khoản chi gần nhất
            </div>
          </div>
        </div>
      </section>

      {/* Modal Lập Phiếu Chi Mới */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Lập Phiếu Chi Vận Hành Mới"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCreateExpense}>
              Xác Nhận Lập Phiếu
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="expense-branch">
              Chi Nhánh Áp Dụng <span className="text-red-500">*</span>
            </label>
            <select
              id="expense-branch"
              className="form-input form-select"
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
            >
              <option value="CN01 — Quận 1">CN01 — Quận 1 (Nguyễn Huệ)</option>
              <option value="CN02 — Quận 3">CN02 — Quận 3 (Võ Văn Tần)</option>
              <option value="CN05 — Quận 10">CN05 — Quận 10 (Sư Vạn Hạnh)</option>
              <option value="CN06 — Bình Thạnh">CN06 — Bình Thạnh (D2)</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="expense-cat">
              Danh Mục Khoản Chi <span className="text-red-500">*</span>
            </label>
            <select
              id="expense-cat"
              className="form-input form-select"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              <option value="Điện nước">Tiền điện &amp; Nước làm đá</option>
              <option value="Mặt bằng">Tiền thuê mặt bằng</option>
              <option value="Lương">Lương &amp; Thưởng ca Barista</option>
              <option value="Bảo trì máy">Bảo trì máy móc / tủ lạnh</option>
              <option value="Vật tư quầy">Vật tư / bao bì ly nắp</option>
              <option value="Hủy cận date">Hủy hàng cận date</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="expense-amount">
              Số Tiền Chi (VNĐ) <span className="text-red-500">*</span>
            </label>
            <input
              id="expense-amount"
              type="number"
              className="form-input"
              placeholder="Ví dụ: 1500000"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="expense-desc">
              Diễn Giải Chi Tiết
            </label>
            <textarea
              id="expense-desc"
              className="form-input"
              rows={3}
              placeholder="Nhập nội dung chi tiêu, mục đích..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

