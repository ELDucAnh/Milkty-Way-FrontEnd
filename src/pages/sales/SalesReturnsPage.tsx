import { useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../../components/common/Modal";

type RequestStatus = "Pending" | "Approved" | "Rejected";
interface ReturnRequest {
    id: string;
    orderId: string;
    customer: string;
    createdAt: string;
    resolution: string;
    reason: string;
    amount: number;
    points: number;
    memberId: string | null;
    status: RequestStatus;
}
interface ReviewEntry {
    requestId: string;
    reviewer: string;
    memberId: string | null;
    refundedAmount: number;
    pointsChange: number;
    reviewedAt: string;
    decision: "Approved" | "Rejected";
    note: string;
}
const statusLabels = {Pending: "Chờ duyệt", Approved: "Đã duyệt", Rejected: "Từ chối"};
const statusClasses = {Pending: "badge-warning", Approved: "badge-success", Rejected: "badge-danger"};
const initialRequests: ReturnRequest[] = [
    {id: "HT-0001", orderId: "DH-00125", customer: "Nguyễn An", createdAt: "2026-10-28T09:30:00+07:00", resolution: "Hoàn tiền", reason: "Sai mức đường", amount: 45000, points: -45, memberId: "HV-0001", status: "Pending"},
    {id: "HT-0002", orderId: "DH-00124", customer: "Trần Bình", createdAt: "2026-10-28T09:40:00+07:00", resolution: "Đổi món", reason: "Nhầm món", amount: 0, points: 0, memberId: null, status: "Pending"},
];
function displayTime(value: string) {
    return new Date(value).toLocaleString("vi-VN", {timeZone: "Asia/Ho_Chi_Minh"});
}
export default function SalesReturnsPage() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("");
    const [reviewState, setReviewState] = useState<{requests: ReturnRequest[]; history: ReviewEntry[]}>({requests: initialRequests, history: []});
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [reviewNote, setReviewNote] = useState("");
    const selected = reviewState.requests.find(request => request.id === selectedId);
    const visibleRequests = reviewState.requests.filter(request =>
        (!status || request.status === status) &&
        `${request.id} ${request.orderId} ${request.customer}`.toLocaleLowerCase("vi-VN").includes(query.trim().toLocaleLowerCase("vi-VN")));

    function reviewRequest(decision: "Approved" | "Rejected") {
        if (!selected || (decision === "Rejected" && !reviewNote.trim())) return;
        const isRefund = decision === "Approved" && selected.resolution === "Hoàn tiền" && selected.amount > 0;
        const entry: ReviewEntry = {
            requestId: selected.id,
            reviewer: "Nguyễn Hoàng Long",
            memberId: selected.memberId,
            refundedAmount: isRefund ? selected.amount : 0,
            pointsChange: isRefund && selected.memberId ? selected.points : 0,
            reviewedAt: new Date().toISOString(),
            decision,
            note: reviewNote.trim(),
        };
        // Demo: duyệt đồng thời ghi nhận hoàn tiền và điểm. Backend cần bảo đảm giao dịch nguyên tử.
        setReviewState(current => {
            if (!current.requests.some(request => request.id === entry.requestId && request.status === "Pending")) return current;
            return {
                requests: current.requests.map(request => request.id === entry.requestId ? {...request, status: decision} : request),
                history: [entry, ...current.history],
            };
        });
        setSelectedId(null);
        setReviewNote("");
    }
    return <>


      
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/dashboard">Tổng quan</Link>
            <span className="sep">/</span>
            <Link to="/sales">Đơn hàng</Link>
            <span className="sep">/</span>
            <span className="current">Khiếu nại và hoàn tiền</span>
          </div>
          <h1 className="page-title">Khiếu nại và hoàn tiền</h1>
          <p className="page-subtitle"> Theo dõi đổi món, hủy trước pha, bù mã ưu đãi và hoàn tiền.</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tạo yêu cầu xử lý
          </button>
        </div>
      </div>

      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Tổng yêu cầu</div>
          <div className="text-[26px] font-extrabold text-[var(--text)] mt-1">{reviewState.requests.length}</div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">1.5% tỷ lệ yêu cầu hoàn, đổi</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Số tiền đã hoàn</div>
          <div className="text-[26px] font-extrabold text-red-500 mt-1">{reviewState.history.reduce((sum, entry) => sum + entry.refundedAmount, 0).toLocaleString("vi-VN")} VND</div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">Đã hoàn cho khách</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Số lượng nhập lại kho</div>
          <div className="text-[26px] font-extrabold text-[var(--primary)] mt-1">15 <span className="text-[13px] font-medium text-[var(--muted)]">Đơn vị</span></div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">Đã đưa lại lên kệ</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Chờ phê duyệt</div>
          <div className="text-[26px] font-extrabold text-amber-500 mt-1">{reviewState.requests.filter(request => request.status === "Pending").length}</div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">Cần quản lý phê duyệt</div>
        </div>
      </div>

      
      <div className="card mb-5 p-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="search-box flex-1 min-w-[200px]">
            <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" className="form-input h-[38px] text-[13px]" aria-label="Tìm yêu cầu" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã yêu cầu, hóa đơn hoặc khách hàng..." />
          </div>
          <select aria-label="Trạng thái" value={status} onChange={event => setStatus(event.target.value)} className="form-input form-select h-[38px] text-[13px] min-w-[140px]">
            <option value="">Tất cả trạng thái</option>
            <option value="Approved">Đã duyệt</option>
            <option value="Pending">Chờ duyệt</option>
            <option value="Rejected">Từ chối</option>
          </select>
        </div>
      </div>

      
      <section className="card p-0 overflow-hidden">
        <div className="overflow-x-auto"><table className="data-table">
          <thead><tr><th>Mã yêu cầu</th><th>Đơn gốc</th><th>Khách hàng</th><th>Thời gian yêu cầu</th><th>Hướng xử lý</th><th>Trạng thái</th></tr></thead>
          <tbody>{visibleRequests.map(request => <tr key={request.id}>
            <td><button className="text-[var(--primary)] font-semibold underline" onClick={() => {setSelectedId(request.id); setReviewNote("");}}>{request.id}</button></td>
            <td>{request.orderId}</td><td>{request.customer}</td><td>{displayTime(request.createdAt)}</td><td>{request.resolution}</td>
            <td><span className={`badge ${statusClasses[request.status]}`}>{statusLabels[request.status]}</span></td>
          </tr>)}{visibleRequests.length === 0 && <tr><td colSpan={6}>Không có yêu cầu phù hợp.</td></tr>}</tbody>
        </table></div>
      </section>
      <section className="card mt-4">
        <h2 className="card-title mb-4">Lịch sử xử lý yêu cầu</h2>
        <div className="overflow-x-auto"><table className="data-table">
          <thead><tr><th>Mã yêu cầu</th><th>Người duyệt</th><th>Thời gian duyệt</th><th>Kết quả</th><th>Tiền đã hoàn</th><th>Hội viên</th><th>Điểm thay đổi</th><th>Ghi chú xử lý</th></tr></thead>
          <tbody>{reviewState.history.map((entry, index) => <tr key={`${entry.requestId}-${index}`}>
            <td><button className="text-[var(--primary)] underline" onClick={() => {setSelectedId(entry.requestId); setReviewNote("");}}>{entry.requestId}</button></td>
            <td>{entry.reviewer}</td><td>{displayTime(entry.reviewedAt)}</td><td><span className={`badge ${statusClasses[entry.decision]}`}>{statusLabels[entry.decision]}</span></td><td className="whitespace-nowrap">{entry.refundedAmount.toLocaleString("vi-VN")} VND</td>
            <td>{entry.memberId || "Không phải hội viên"}</td>
            <td className={entry.pointsChange < 0 ? "text-[var(--danger)]" : entry.pointsChange > 0 ? "text-[var(--primary)]" : "text-[var(--muted)]"}>
              {entry.memberId ? `${entry.pointsChange > 0 ? "+" : ""}${entry.pointsChange} điểm` : "—"}
            </td>
            
            <td>{entry.note || "—"}</td>
            
          </tr>)}{reviewState.history.length === 0 && <tr><td colSpan={8}>Chưa có yêu cầu được xử lý.</td></tr>}</tbody>
        </table></div>
      </section>
      <Modal open={Boolean(selected)} onClose={() => setSelectedId(null)} title={`Chi tiết yêu cầu ${selected?.id ?? ""}`} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setSelectedId(null)}>Đóng</button>
          {selected?.status === "Pending" && <>
          <button className="btn btn-secondary" disabled={!reviewNote.trim()} onClick={() => reviewRequest("Rejected")}>Từ chối</button>
          <button className="btn btn-primary" onClick={() => reviewRequest("Approved")}>Duyệt yêu cầu</button>
        </>}</>}>
        {selected && <div className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><dt className="form-label">Đơn gốc</dt><dd>{selected.orderId}</dd></div>
            <div><dt className="form-label">Khách hàng</dt><dd>{selected.customer}</dd></div>
            <div><dt className="form-label">Hướng xử lý</dt><dd>{selected.resolution}</dd></div>
            <div><dt className="form-label">Lý do</dt><dd>{selected.reason}</dd></div>
            <div><dt className="form-label">Số tiền đề nghị hoàn</dt><dd>{selected.amount.toLocaleString("vi-VN")} VND</dd></div>
            <div><dt className="form-label">Điểm điều chỉnh dự kiến</dt><dd>{selected.memberId ? `${selected.points > 0 ? "+" : ""}${selected.points} điểm · ${selected.memberId}` : "Không áp dụng"}</dd></div>
            <div><dt className="form-label">Trạng thái</dt><dd>{statusLabels[selected.status]}</dd></div>
          </dl>
          {selected.status === "Pending" && <>
            <p className="text-sm text-[var(--muted)]">Người duyệt demo: Nguyễn Hoàng Long</p>
            <label className="form-label" htmlFor="review-note">Ghi chú xử lý (bắt buộc khi từ chối)</label>
            <textarea id="review-note" className="form-input form-textarea" rows={3} value={reviewNote} onChange={event => setReviewNote(event.target.value)} />
          </>}
        </div>}
      </Modal>

<Modal open={open} onClose={() => setOpen(false)} title="Xử lý khiếu nại và hoàn tiền" size="md"
    footer={<><button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Hủy</button><button type="button" className="btn btn-primary" disabled>Gửi yêu cầu duyệt</button></>}>

          <div className="flex flex-col gap-3.5">
  <div>
    <label className="form-label" htmlFor="return-order">Đơn gốc</label>
    <select id="return-order" className="form-input form-select">
      <option value="">Chọn đơn hàng</option>
      <option value="DH-00125">DH-00125 · Nguyễn An · 450.000 VND</option>
    </select>
  </div>

  <div>
    <label className="form-label" htmlFor="return-reason">Lý do</label>
    <select id="return-reason" className="form-input form-select">
      <option>Hỏng vị / chất lượng không đạt</option>
      <option value="Nhầm món hoặc size">Nhầm món hoặc cỡ ly</option>
      <option>Sai mức đường / đá</option>
      <option value="Thiếu topping">Thiếu món thêm</option>
      <option>Khách yêu cầu hủy trước pha</option>
    </select>
  </div>

  <div>
    <label className="form-label" htmlFor="return-resolution">Hướng xử lý</label>
    <select id="return-resolution" className="form-input form-select">
      <option>Đổi món</option>
      <option value="Bù voucher">Bù mã ưu đãi</option>
      <option>Hoàn tiền</option>
      <option>Hủy trước pha</option>
    </select>
  </div>

  <div>
    <label className="form-label" htmlFor="return-amount">Số tiền đề nghị hoàn (VND)</label>
    <input id="return-amount" type="number" min="0" step="1000"
           className="form-input" placeholder="45000" />
  </div>

  <div>
    <label className="form-label" htmlFor="return-note">Ghi chú xử lý</label>
    <textarea id="return-note" className="form-input form-textarea"
              rows={3}></textarea>
  </div>

</div>
        </Modal>
    </>;
}
