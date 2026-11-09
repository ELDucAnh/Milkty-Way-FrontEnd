import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import { useToast } from "../../components/common/useToast";
import { can, homePath, scopedBranch } from "../../utils/auth";

interface UserEmployee {
  id: string;
  name: string;
  email: string;
  code: string;
  role: string;
  roleTone: "purple" | "info" | "warning" | "gray";
  branch: string;
  branchBadge: "purple" | "info";
  phone: string;
  shiftStatus: string;
  shiftTone: "success" | "gray";
  lastLogin: string;
  initials: string;
  avatarBg: string;
}

const mockEmployees: UserEmployee[] = [
  {
    id: "EMP-01",
    name: "Nguyễn Hoàng Long",
    email: "long.nh@MilktyWay.vn",
    code: "NV-ADMIN-01",
    role: "Chủ Doanh Nghiệp",
    roleTone: "purple",
    branch: "Trụ Sở Chính — Toàn Quyền",
    branchBadge: "purple",
    phone: "0903 123 456",
    shiftStatus: "Online (Đang làm việc)",
    shiftTone: "success",
    lastLogin: "28/10/2026 20:45 (Thiết bị Web HQ)",
    initials: "NL",
    avatarBg: "bg-emerald-600",
  },
  {
    id: "EMP-02",
    name: "Trần Thu Hà",
    email: "ha.tt@MilktyWay.vn",
    code: "NV-QL-CN05",
    role: "Quản Lý Chi Nhánh",
    roleTone: "info",
    branch: "CN05 — Sư Vạn Hạnh (Q.10)",
    branchBadge: "info",
    phone: "0912 888 999",
    shiftStatus: "Đang Trực Ca 2",
    shiftTone: "success",
    lastLogin: "28/10/2026 19:15 (Máy POS Quầy 1)",
    initials: "TH",
    avatarBg: "bg-blue-600",
  },
  {
    id: "EMP-03",
    name: "Lê Quốc Tuấn Anh",
    email: "anh.lqt@MilktyWay.vn",
    code: "NV-POS-01",
    role: "Thu Ngân Quầy POS",
    roleTone: "warning",
    branch: "CN01 — Máy POS 1 (Nguyễn Huệ)",
    branchBadge: "info",
    phone: "0938 111 222",
    shiftStatus: "Đang Mở Ca Bán",
    shiftTone: "success",
    lastLogin: "28/10/2026 14:02 (POS Cảm ứng)",
    initials: "LA",
    avatarBg: "bg-amber-600",
  },
  {
    id: "EMP-04",
    name: "Vũ Minh Khoa",
    email: "khoa.vm@MilktyWay.vn",
    code: "NV-KHO-01",
    role: "Nhân Viên Kho Chi Nhánh",
    roleTone: "gray",
    branch: "Kho Tổng Trung Tâm (Bình Tân) — Điều phối CN",
    branchBadge: "info",
    phone: "0977 333 444",
    shiftStatus: "Nghỉ Giữa Ca",
    shiftTone: "gray",
    lastLogin: "28/10/2026 17:30 (Máy quét mã vạch)",
    initials: "VK",
    avatarBg: "bg-slate-600",
  },
  {
    id: "EMP-05",
    name: "Phạm Gia Bảo",
    email: "bao.pg@MilktyWay.vn",
    code: "NV-TN-0501",
    role: "Thu Ngân Quầy POS",
    roleTone: "warning",
    branch: "CN05 — Máy POS 1 (Sư Vạn Hạnh)",
    branchBadge: "info",
    phone: "0938 555 666",
    shiftStatus: "Đang Mở Ca Bán",
    shiftTone: "success",
    lastLogin: "28/10/2026 14:00 (POS Cảm ứng)",
    initials: "PB",
    avatarBg: "bg-amber-600",
  },
  {
    id: "EMP-06",
    name: "Ngô Thị Mai",
    email: "mai.nt@MilktyWay.vn",
    code: "NV-KHO-0501",
    role: "Nhân Viên Kho Chi Nhánh",
    roleTone: "gray",
    branch: "CN05 — Kho quầy Sư Vạn Hạnh",
    branchBadge: "info",
    phone: "0977 777 888",
    shiftStatus: "Đang Trực Ca 2",
    shiftTone: "success",
    lastLogin: "28/10/2026 13:45 (Máy quét mã vạch)",
    initials: "NM",
    avatarBg: "bg-slate-600",
  },
];

export default function UsersPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<UserEmployee[]>(mockEmployees);
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedShift, setSelectedShift] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<UserEmployee | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("NV-TN-0104");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState("Thu Ngân Quầy POS");
  const [formBranch, setFormBranch] = useState("CN05 — Quận 10 (Sư Vạn Hạnh)");
  const branchScope = scopedBranch();
  const canAddEmployee = can("user.manageBranch");
  const assignableRoles = branchScope
    ? ["Thu Ngân Quầy POS", "Nhân Viên Kho Chi Nhánh"]
    : ["Quản Lý Chi Nhánh", "Thu Ngân Quầy POS", "Nhân Viên Kho Chi Nhánh", "Chủ Doanh Nghiệp (Admin)"];

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (branchScope && !emp.branch.includes(branchScope)) return false;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.code.toLowerCase().includes(q) ||
        emp.phone.includes(q) ||
        emp.email.toLowerCase().includes(q);

      const matchBranch = !selectedBranch || emp.branch.includes(selectedBranch);
      const matchRole = !selectedRole || emp.role.includes(selectedRole);
      const matchShift =
        !selectedShift ||
        (selectedShift === "active"
          ? emp.shiftStatus.includes("Đang") || emp.shiftStatus.includes("Online")
          : !emp.shiftStatus.includes("Đang") && !emp.shiftStatus.includes("Online"));

      return matchSearch && matchBranch && matchRole && matchShift;
    });
  }, [employees, search, selectedBranch, selectedRole, selectedShift, branchScope]);

  function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!canAddEmployee) return;
    if (!assignableRoles.includes(formRole)) {
      toast.warning("Quản lý chi nhánh chỉ được tạo tài khoản Thu ngân hoặc Nhân viên kho.");
      return;
    }
    if (branchScope && !formBranch.includes(branchScope)) {
      toast.warning(`Chỉ được phân công nhân viên vào chi nhánh ${branchScope}.`);
      return;
    }
    if (!formName.trim() || !formEmail.trim() || !formPhone.trim()) {
      toast.warning("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }

    const nextIndex = employees.length + 1;
    const newEmp: UserEmployee = {
      id: `EMP-${String(nextIndex).padStart(2, "0")}`,
      name: formName.trim(),
      email: formEmail.trim(),
      code: formCode.trim() || `NV-TN-01${String(nextIndex).padStart(2, "0")}`,
      role: formRole,
      roleTone:
        formRole.includes("Chủ")
          ? "purple"
          : formRole.includes("Quản Lý")
            ? "info"
            : formRole.includes("Thu Ngân")
              ? "warning"
              : "gray",
      branch: formBranch,
      branchBadge: formBranch.includes("Trụ Sở") ? "purple" : "info",
      phone: formPhone.trim(),
      shiftStatus: "Mới tạo (Chưa vào ca)",
      shiftTone: "gray",
      lastLogin: "Chưa từng đăng nhập",
      initials: formName
        .split(" ")
        .slice(-2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "NV",
      avatarBg: "bg-teal-600",
    };

    setEmployees([...employees, newEmp]);
    setShowAddModal(false);
    setFormName("");
    setFormCode(`NV-TN-01${String(nextIndex + 1).padStart(2, "0")}`);
    setFormEmail("");
    setFormPhone("");

    toast.success("Đã thêm nhân viên và kích hoạt phân quyền chi nhánh!", {
      title: "Thành Công",
    });
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to={homePath()}>Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/users">Người dùng</Link>
            <span className="sep">/</span>
            <span className="current">Tất cả người dùng</span>
          </nav>
          <h1 className="page-title">Nhân Viên &amp; Điều Phối Ca Chi Nhánh</h1>
          <p className="page-subtitle">
            Quản lý danh sách nhân sự, phân công chi nhánh và theo dõi trạng thái ca làm việc.
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/users/roles" className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Phân Quyền Vai Trò
          </Link>
          {canAddEmployee && (<button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm Nhân Viên
          </button>)}
        </div>
      </div>

      {/* Stats Grid */}
      {!branchScope && (<section aria-label="Thống kê nhân sự">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Tổng Nhân Sự Chuỗi"
            value="64 Nhân viên"
            subLabel="Hoạt động tại 12 chi nhánh & VP"
            tone="info"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
          />
          <StatCard
            label="Đang Trong Ca Làm Việc"
            value="38 Nhân viên"
            valueClassName="text-[var(--primary)]"
            subLabel="Ca chiều (14:00 - 22:30)"
            tone="primary"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <StatCard
            label="Quản Lý Chi Nhánh"
            value="12 Quản lý"
            subLabel="Phụ trách đối soát ca & hủy hỏng"
            tone="purple"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z" />
              </svg>
            }
          />
          <StatCard
            label="Thu Ngân & Barista"
            value="42 Nhân viên"
            valueClassName="text-[var(--warning)]"
            subLabel="Vận hành máy POS & Quầy bar"
            tone="warning"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8h1a4 4 0 010 8h-1" />
                <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
              </svg>
            }
          />
        </div>
      </section>)}

      {/* Filter Bar */}
      <section aria-label="Bộ lọc nhân viên">
        <div className="filter-bar mb-5 flex flex-wrap gap-3">
          <div className="search-box flex-1 min-w-[240px]">
            <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="form-input"
              placeholder="Tìm theo tên nhân viên, mã nhân sự, số điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!branchScope && (<select
            className="form-input form-select w-auto"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="">Tất cả 12 Chi Nhánh</option>
            <option value="CN01">CN01 — Quận 1 (Nguyễn Huệ)</option>
            <option value="CN02">CN02 — Quận 3 (Võ Văn Tần)</option>
            <option value="CN03">CN03 — Quận 5 (Trần Hưng Đạo)</option>
            <option value="CN04">CN04 — Quận 7 (Phú Mỹ Hưng)</option>
            <option value="CN05">CN05 — Quận 10 (Sư Vạn Hạnh)</option>
            <option value="CN06">CN06 — Bình Thạnh (D2)</option>
            <option value="CN07">CN07 — Gò Vấp (Phan Văn Trị)</option>
            <option value="Kho Tổng">Kho Tổng Trung Tâm (Bình Tân)</option>
            <option value="Trụ Sở">Trụ Sở Chính (Văn Phòng Điều Hành)</option>
          </select>)}
          <select
            className="form-input form-select w-auto"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">Tất cả vai trò</option>
            <option value="Chủ Doanh Nghiệp">Chủ Doanh Nghiệp (Admin)</option>
            <option value="Quản Lý">Quản Lý Chi Nhánh</option>
            <option value="Thu Ngân">Thu Ngân Quầy POS</option>
            <option value="Nhân Viên Kho">Nhân Viên Kho Chi Nhánh</option>
          </select>
          <select
            className="form-input form-select w-auto"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang trong ca trực</option>
            <option value="inactive">Nghỉ ca / Ngoài giờ</option>
          </select>
        </div>
      </section>

      {/* Users Table */}
      <section aria-label="Bảng danh sách nhân viên">
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <caption className="sr-only">Danh sách nhân sự chuỗi MilktyWay</caption>
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" aria-label="Chọn tất cả" />
                  </th>
                  <th>Nhân Viên</th>
                  <th>Mã Nhân Sự</th>
                  <th>Vai Trò Nghiệp Vụ</th>
                  <th>Chi Nhánh Công Tác</th>
                  <th>Thông Tin Liên Hệ</th>
                  <th className="text-center">Trạng Thái Ca</th>
                  <th>Lần Đăng Nhập Gần Nhất</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <input type="checkbox" aria-label={`Chọn ${emp.name}`} />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full ${emp.avatarBg} text-white font-bold flex items-center justify-center shrink-0`}
                        >
                          {emp.initials}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text)]">{emp.name}</div>
                          <div className="text-[11px] text-[var(--muted)]">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs font-semibold">{emp.code}</td>
                    <td>
                      <Badge variant={emp.roleTone}>{emp.role}</Badge>
                    </td>
                    <td>
                      <Badge variant={emp.branchBadge}>{emp.branch}</Badge>
                    </td>
                    <td className="text-xs">{emp.phone}</td>
                    <td className="text-center">
                      <Badge variant={emp.shiftTone}>{emp.shiftStatus}</Badge>
                    </td>
                    <td className="text-xs text-[var(--muted)]">{emp.lastLogin}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon-sm"
                        onClick={() => {
                          setSelectedEmployee(emp);
                          toast.info(`Xem hồ sơ chi tiết nhân viên: ${emp.name}`, {
                            title: "Hồ Sơ Nhân Sự",
                          });
                        }}
                        aria-label={`Xem hồ sơ chi tiết ${emp.name}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">
            <div>
              Hiển thị 1 - {filteredEmployees.length} trong tổng số {branchScope ? `${filteredEmployees.length} nhân viên chi nhánh ${branchScope}` : "64 nhân viên chuỗi 12 chi nhánh"}
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
                3
              </button>
              <button type="button" className="btn btn-secondary btn-sm">
                Sau
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Add Employee Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm Nhân Viên &amp; Gán Chi Nhánh Mới"
        size="lg"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">
                Họ và Tên Nhân Viên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Nguyễn Văn A..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Mã Nhân Sự</label>
              <input
                type="text"
                className="form-input"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">
                Email Đăng Nhập <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="ten@MilktyWay.vn"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">
                Số Điện Thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                className="form-input"
                placeholder="09xxxxxxxx"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">
                Vai Trò Nghiệp Vụ <span className="text-red-500">*</span>
              </label>
              <select
                className="form-input form-select"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                required
              >
                {assignableRoles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">
                Gán Chi Nhánh Công Tác <span className="text-red-500">*</span>
              </label>
              <select
                className="form-input form-select"
                value={formBranch}
                disabled={!!branchScope}
                onChange={(e) => setFormBranch(e.target.value)}
                required
              >
                <option>CN01 — Quận 1 (Nguyễn Huệ)</option>
                <option>CN02 — Quận 3 (Võ Văn Tần)</option>
                <option>CN03 — Quận 5 (Trần Hưng Đạo)</option>
                <option>CN04 — Quận 7 (Phú Mỹ Hưng)</option>
                <option>CN05 — Quận 10 (Sư Vạn Hạnh)</option>
                <option>CN06 — Bình Thạnh (D2)</option>
                <option>CN07 — Gò Vấp (Phan Văn Trị)</option>
                <option>Kho Tổng Trung Tâm (Bình Tân)</option>
                <option>Trụ Sở Chính (Văn Phòng Điều Hành)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Mật Khẩu Ban Đầu (Mặc định)</label>
            <input
              type="password"
              className="form-input"
              defaultValue="MilktyWay@2026"
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              Nhân viên sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.
            </p>
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
              Tạo Tài Khoản
            </button>
          </div>
        </form>
      </Modal>

      {/* Employee Details Modal */}
      <Modal
        open={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        title="Hồ Sơ Nhân Sự &amp; Chi Nhánh Trực Ca"
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSelectedEmployee(null);
                navigate("/users/roles");
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Ma Trận Phân Quyền Vai Trò
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSelectedEmployee(null)}
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedEmployee && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
              <div
                className={`w-14 h-14 rounded-2xl ${selectedEmployee.avatarBg} text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-md`}
              >
                {selectedEmployee.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-[var(--text)]">
                  {selectedEmployee.name}
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  Mã nhân viên: <strong className="font-mono">{selectedEmployee.code}</strong> · ID: <span className="font-mono">{selectedEmployee.id}</span>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap items-center">
                  <Badge variant={selectedEmployee.roleTone}>{selectedEmployee.role}</Badge>
                  <Badge variant={selectedEmployee.shiftTone}>{selectedEmployee.shiftStatus}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-[var(--border)] space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Thông Tin Liên Lạc &amp; Tài Khoản
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Email đăng nhập:</div>
                  <div className="font-medium text-blue-600">{selectedEmployee.email}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Số điện thoại:</div>
                  <div className="font-mono font-medium text-[var(--text)]">{selectedEmployee.phone}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Trực ca gần nhất:</div>
                  <div className="text-xs text-[var(--text)] font-medium">{selectedEmployee.lastLogin}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Chi Nhánh &amp; Phạm Vi Phân Quyền
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Địa bàn công tác:</div>
                  <div className="font-semibold text-[var(--text)]">{selectedEmployee.branch}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Quyền hạn truy cập:</div>
                  <div className="text-xs text-[var(--text)]">
                    {selectedEmployee.role.includes("Chủ Doanh Nghiệp")
                      ? "Toàn quyền hệ thống chuỗi 12 chi nhánh & Kho tổng"
                      : selectedEmployee.role.includes("Quản Lý")
                      ? "Quản lý nhân sự, kho, đối soát ca tại chi nhánh được gán"
                      : selectedEmployee.role.includes("Thu Ngân")
                      ? "Bán hàng POS cảm ứng, tích điểm thành viên, mở/đóng ca"
                      : "Quản lý nhập xuất lô hàng FEFO & kiểm kê mù"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

