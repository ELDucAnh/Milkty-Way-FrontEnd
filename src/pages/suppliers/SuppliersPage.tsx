import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import { useToast } from "../../components/common/useToast";

interface Supplier {
  id: string;
  name: string;
  taxCode: string;
  province: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  category: string;
  categoryTone: "success" | "info" | "warning" | "gray" | "purple";
  contactPerson: string;
  phone: string;
  email: string;
  orderCount: number;
  totalPurchase: number;
  debt: number;
  paymentTerm: string;
  status: "Đang giao dịch" | "Tạm ngưng nhập";
  foodSafetyStandard: string;
}

const mockSuppliers: Supplier[] = [
  {
    id: "NCC-01",
    name: "Công ty TNHH Trà Lộc Phát Bảo Lộc",
    taxCode: "5801239845",
    province: "Lâm Đồng",
    initials: "LP",
    avatarBg: "bg-emerald-50",
    avatarColor: "text-emerald-700",
    category: "Trà lá & Oolong",
    categoryTone: "success",
    contactPerson: "Anh Nguyễn Văn Lộc",
    phone: "0908 123 456",
    email: "locphattea@gmail.com",
    orderCount: 18,
    totalPurchase: 215400000,
    debt: 0,
    paymentTerm: "Gối đầu 15 ngày",
    status: "Đang giao dịch",
    foodSafetyStandard: "Đạt chuẩn ISO 22000",
  },
  {
    id: "NCC-02",
    name: "Công ty Cổ Phần Gia Thịnh Phát (GTP)",
    taxCode: "0303891223",
    province: "TP.HCM",
    initials: "GTP",
    avatarBg: "bg-amber-50",
    avatarColor: "text-amber-700",
    category: "Topping & Bột sữa",
    categoryTone: "info",
    contactPerson: "Chị Mai Phương",
    phone: "0912 345 678",
    email: "order@gtp.com.vn",
    orderCount: 24,
    totalPurchase: 186200000,
    debt: 42500000,
    paymentTerm: "Gối đầu 30 ngày",
    status: "Đang giao dịch",
    foodSafetyStandard: "HACCP & ATVSTP",
  },
  {
    id: "NCC-03",
    name: "Công ty Cổ Phần Sữa Vinamilk (F&B Division)",
    taxCode: "0300588569",
    province: "TP.HCM",
    initials: "VNM",
    avatarBg: "bg-blue-50",
    avatarColor: "text-blue-700",
    category: "Sữa thanh trùng & Sữa đặc",
    categoryTone: "info",
    contactPerson: "Anh Lê Hoàng Nam",
    phone: "028 5415 5555",
    email: "fnb@vinamilk.com.vn",
    orderCount: 30,
    totalPurchase: 142800000,
    debt: 28400000,
    paymentTerm: "Gối đầu 15 ngày",
    status: "Đang giao dịch",
    foodSafetyStandard: "ISO 22000 & Global GAP",
  },
  {
    id: "NCC-04",
    name: "Công ty TNHH Bao Bì Xanh Sài Gòn",
    taxCode: "0314567890",
    province: "Bình Tân",
    initials: "BBX",
    avatarBg: "bg-purple-50",
    avatarColor: "text-purple-700",
    category: "Ly nhựa, màng ép & túi chữ T",
    categoryTone: "gray",
    contactPerson: "Chị Trần Bích Ngọc",
    phone: "0938 999 888",
    email: "sales@baobixanh.vn",
    orderCount: 15,
    totalPurchase: 74600000,
    debt: 47350000,
    paymentTerm: "Gối đầu 45 ngày",
    status: "Đang giao dịch",
    foodSafetyStandard: "Kiểm nghiệm Quatest 3",
  },
  {
    id: "NCC-05",
    name: "HTX Nông Sản Sạch Đà Lạt GAP",
    taxCode: "5800987654",
    province: "Đà Lạt",
    initials: "DLG",
    avatarBg: "bg-orange-50",
    avatarColor: "text-orange-700",
    category: "Trái cây tươi, chanh dây, dâu",
    categoryTone: "warning",
    contactPerson: "Anh Bùi Tiến Dũng",
    phone: "0977 444 333",
    email: "dalatgap@coop.vn",
    orderCount: 36,
    totalPurchase: 65500000,
    debt: 0,
    paymentTerm: "Thanh toán ngay theo chuyến",
    status: "Đang giao dịch",
    foodSafetyStandard: "VietGAP số 182/2025",
  },
];

export default function SuppliersPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form state
  const [newName, setNewName] = useState("");
  const [newTaxCode, setNewTaxCode] = useState("");
  const [newCategory, setNewCategory] = useState("Trà lá & Cà phê");
  const [newContact, setNewContact] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPaymentTerm, setNewPaymentTerm] = useState("Gối đầu 15 ngày");
  const [newFoodSafety, setNewFoodSafety] = useState("Đã thẩm định đạt chuẩn");

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.taxCode.includes(q) ||
        item.phone.includes(q) ||
        item.contactPerson.toLowerCase().includes(q);

      const matchCategory = !selectedCategory || item.category.includes(selectedCategory);
      const matchStatus = !selectedStatus || item.status === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [suppliers, search, selectedCategory, selectedStatus]);

  function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      toast.warning("Vui lòng nhập tên nhà cung cấp");
      return;
    }

    const newSupplier: Supplier = {
      id: `NCC-${String(suppliers.length + 1).padStart(2, "0")}`,
      name: newName.trim(),
      taxCode: newTaxCode.trim() || "Chưa cập nhật",
      province: newAddress.trim() || "TP.HCM",
      initials: newName
        .split(" ")
        .slice(-2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "NCC",
      avatarBg: "bg-emerald-50",
      avatarColor: "text-emerald-700",
      category: newCategory,
      categoryTone: "success",
      contactPerson: newContact.trim() || "Chưa cập nhật",
      phone: newPhone.trim() || "Chưa cập nhật",
      email: newEmail.trim() || "Chưa cập nhật",
      orderCount: 0,
      totalPurchase: 0,
      debt: 0,
      paymentTerm: newPaymentTerm,
      status: "Đang giao dịch",
      foodSafetyStandard: newFoodSafety,
    };

    setSuppliers([newSupplier, ...suppliers]);
    setShowAddModal(false);
    // Reset form
    setNewName("");
    setNewTaxCode("");
    setNewContact("");
    setNewPhone("");
    setNewEmail("");
    setNewAddress("");

    toast.success("Đã thêm nhà cung cấp mới vào hệ thống chuỗi MilktyWay!", {
      title: "Thành Công",
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
            <span className="current">Nhà cung cấp</span>
          </nav>
          <h1 className="page-title">Nhà Cung Cấp Nguyên Vật Liệu</h1>
          <p className="page-subtitle">
            Quản lý danh sách đối tác cung ứng và theo dõi chứng nhận an toàn thực phẩm.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              toast.info("Đang xuất danh sách nhà cung cấp F&B (Excel)...", {
                title: "Xuất Dữ Liệu",
              })
            }
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Xuất Excel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm Nhà Cung Cấp
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <section aria-label="Thống kê nhà cung cấp">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Tổng Nhà Cung Cấp"
            value="18 Đơn vị"
            subLabel="Thuộc 6 nhóm nguyên liệu F&B"
            tone="info"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            }
          />
          <StatCard
            label="Nhập Hàng Tháng Này"
            value="684.500.000 đ"
            subLabel="42 đợt giao kho tổng & CN"
            tone="primary"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            }
          />
          <StatCard
            label="Công Nợ Phải Trả"
            value="118.250.000 đ"
            valueClassName="text-[var(--warning)]"
            subLabel="Hạn thanh toán gối đầu 15 ngày"
            tone="warning"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
          />
          <StatCard
            label="Đạt Chuẩn ATVSTP & Date"
            value="99.2%"
            valueClassName="text-[var(--primary)]"
            subLabel="100% có hồ sơ công bố chuẩn"
            tone="primary"
            trend="up"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Filter Bar */}
      <section aria-label="Bộ lọc nhà cung cấp">
        <div className="filter-bar mb-5 flex flex-wrap gap-3">
          <div className="search-box flex-1 min-w-[240px]">
            <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="form-input"
              placeholder="Tìm tên nhà cung cấp, mã số thuế, số điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-input form-select w-auto"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Tất cả ngành hàng nguyên liệu</option>
            <option value="Trà lá">Trà lá & Cà phê</option>
            <option value="Topping">Bột sữa & Topping trân châu</option>
            <option value="Sữa thanh trùng">Sữa tươi & Kem béo</option>
            <option value="Ly nhựa">Bao bì ly nắp & Vật tư</option>
            <option value="Trái cây">Trái cây tươi & Nông sản</option>
          </select>
          <select
            className="form-input form-select w-auto"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Đang giao dịch">Đang giao dịch</option>
            <option value="Tạm ngưng nhập">Tạm ngưng nhập</option>
          </select>
        </div>
      </section>

      {/* Suppliers Table */}
      <section aria-label="Bảng danh sách nhà cung cấp">
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <caption className="sr-only">Danh sách nhà cung cấp nguyên vật liệu trà sữa</caption>
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" aria-label="Chọn tất cả" />
                  </th>
                  <th>Nhà Cung Cấp</th>
                  <th>Nhóm Hàng Cung Cấp</th>
                  <th>Người Liên Hệ &amp; Hotline</th>
                  <th>Số Đơn Nhập</th>
                  <th>Tổng Nhập (VNĐ)</th>
                  <th>Công Nợ Hiện Tại</th>
                  <th>Kỳ Hạn TT</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <input type="checkbox" aria-label={`Chọn ${supplier.name}`} />
                    </td>
                    <td>
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl ${supplier.avatarBg} ${supplier.avatarColor} font-bold flex items-center justify-center shrink-0 border border-current/20`}
                        >
                          {supplier.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--text)] leading-tight">
                            {supplier.name}
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            MST: {supplier.taxCode} · {supplier.province}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant={supplier.categoryTone}>
                        {supplier.category}
                      </Badge>
                    </td>
                    <td>
                      <div className="text-[13px] font-medium text-[var(--text)]">
                        {supplier.contactPerson}
                      </div>
                      <div className="text-[11px] text-[var(--muted)]">
                        {supplier.phone} · {supplier.email}
                      </div>
                    </td>
                    <td className="font-semibold text-[var(--text)]">
                      {supplier.orderCount} Lô hàng
                    </td>
                    <td className="font-bold text-[var(--text)]">
                      {supplier.totalPurchase.toLocaleString("vi-VN")} đ
                    </td>
                    <td
                      className={`text-[13px] ${
                        supplier.debt > 0
                          ? "font-semibold text-[var(--danger)]"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {supplier.debt.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="text-xs text-[var(--muted)]">
                      {supplier.paymentTerm}
                    </td>
                    <td>
                      <Badge
                        variant={supplier.status === "Đang giao dịch" ? "success" : "danger"}
                      >
                        {supplier.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon-sm"
                          aria-label="Xem chi tiết"
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            toast.info(`Xem hồ sơ ${supplier.name} & chứng nhận ATVSTP`, {
                              title: "Hồ Sơ Nhà Cung Cấp",
                            });
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon-sm"
                          aria-label="Chỉnh sửa"
                          onClick={() =>
                            toast.info(`Cập nhật thông tin hợp đồng ${supplier.name}`, {
                              title: "Chỉnh Sửa",
                            })
                          }
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">
            <div>
              Hiển thị 1 - {filteredSuppliers.length} trong tổng số {suppliers.length} nhà cung cấp đối tác
            </div>
            <div className="flex gap-1">
              <button type="button" className="btn btn-secondary btn-sm" disabled>
                Trước
              </button>
              <button type="button" className="btn btn-primary btn-sm">
                1
              </button>
              <button type="button" className="btn btn-secondary btn-sm">
                2
              </button>
              <button type="button" className="btn btn-secondary btn-sm">
                Sau
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Add Supplier Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm Nhà Cung Cấp Nguyên Liệu Mới"
        size="lg"
      >
        <form onSubmit={handleAddSupplier} className="space-y-4">
          <div>
            <label className="form-label">
              Tên Doanh Nghiệp / Nhà Cung Cấp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Ví dụ: Công ty Cổ Phần Trà Xanh..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Mã Số Thuế (MST)</label>
              <input
                type="text"
                className="form-input"
                placeholder="03xxxxxxxxx"
                value={newTaxCode}
                onChange={(e) => setNewTaxCode(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Nhóm Nguyên Liệu</label>
              <select
                className="form-input form-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <option>Trà lá &amp; Cà phê</option>
                <option>Bột sữa &amp; Topping trân châu</option>
                <option>Sữa tươi &amp; Kem béo</option>
                <option>Bao bì ly nắp &amp; Màng ép</option>
                <option>Trái cây tươi Đà Lạt</option>
                <option>Thiết bị Barista quầy bar</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">
                Người Đại Diện Liên Hệ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Họ và tên..."
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">
                Số Điện Thoại Hotline <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="09xxxxxxxx"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="form-label">Địa Chỉ Kho Hàng / Văn Phòng</label>
            <input
              type="text"
              className="form-input"
              placeholder="Địa chỉ giao nhận hàng..."
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Thời Hạn Thanh Toán</label>
              <select
                className="form-input form-select"
                value={newPaymentTerm}
                onChange={(e) => setNewPaymentTerm(e.target.value)}
              >
                <option>Thanh toán ngay khi nhận hàng (COD)</option>
                <option>Gối đầu 15 ngày</option>
                <option>Gối đầu 30 ngày</option>
                <option>Gối đầu 45 ngày</option>
              </select>
            </div>
            <div>
              <label className="form-label">Hồ Sơ ATVSTP / ISO 22000</label>
              <select
                className="form-input form-select"
                value={newFoodSafety}
                onChange={(e) => setNewFoodSafety(e.target.value)}
              >
                <option>Đã thẩm định đạt chuẩn</option>
                <option>Đang chờ gửi hồ sơ kiểm định</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddModal(false)}
            >
              Hủy Bỏ
            </button>
            <button type="submit" className="btn btn-primary">
              Lưu Nhà Cung Cấp
            </button>
          </div>
        </form>
      </Modal>

      {/* Supplier Details Modal */}
      <Modal
        open={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        title="Hồ Sơ Đối Tác Cung Ứng &amp; Chứng Nhận ATVSTP"
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const supp = selectedSupplier;
                setSelectedSupplier(null);
                navigate("/purchases/new");
                if (supp) {
                  toast.info(`Bắt đầu lập đơn đặt mua nguyên liệu từ ${supp.name}`, {
                    title: "Lập Đơn Mua PO",
                  });
                }
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              Lập Đơn Mua PO Với Đối Tác Này
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSelectedSupplier(null)}
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedSupplier && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div
                className={`w-14 h-14 rounded-2xl ${selectedSupplier.avatarBg} ${selectedSupplier.avatarColor} font-bold text-xl flex items-center justify-center shrink-0 border border-current/20`}
              >
                {selectedSupplier.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-[var(--text)]">
                  {selectedSupplier.name}
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  Mã đối tác: <strong className="font-mono">{selectedSupplier.id}</strong> · Mã số thuế: <strong className="font-mono">{selectedSupplier.taxCode}</strong>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant={selectedSupplier.categoryTone}>{selectedSupplier.category}</Badge>
                  <Badge variant={selectedSupplier.status === "Đang giao dịch" ? "success" : "danger"}>
                    {selectedSupplier.status}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ {selectedSupplier.foodSafetyStandard}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-[var(--border)] space-y-2">
                <div className="text-xs font-bold text-[var(--text)] uppercase tracking-wider text-[var(--muted)]">
                  Đại Diện Liên Hệ &amp; Trụ Sở
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Người phụ trách:</div>
                  <div className="font-semibold text-[var(--text)]">{selectedSupplier.contactPerson}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Số hotline / di động:</div>
                  <div className="font-mono font-medium text-[var(--text)]">{selectedSupplier.phone}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Hộp thư điện tử:</div>
                  <div className="text-xs text-blue-600">{selectedSupplier.email}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Khu vực kho:</div>
                  <div className="text-xs text-[var(--text)]">{selectedSupplier.province}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] space-y-2">
                <div className="text-xs font-bold text-[var(--text)] uppercase tracking-wider text-[var(--muted)]">
                  Chỉ Số Cung Ứng &amp; Công Nợ
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--muted)]">Số lô hàng đã giao:</span>
                  <span className="font-bold text-[var(--text)]">{selectedSupplier.orderCount} lô thành công</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--muted)]">Tổng kim ngạch mua:</span>
                  <span className="font-bold text-[var(--text)]">{selectedSupplier.totalPurchase.toLocaleString("vi-VN")} ₫</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--muted)]">Công nợ tồn đọng:</span>
                  <span className={`font-bold ${selectedSupplier.debt > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {selectedSupplier.debt.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--muted)]">Thời hạn thanh toán:</span>
                  <span className="font-semibold text-xs text-[var(--text)]">{selectedSupplier.paymentTerm}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

