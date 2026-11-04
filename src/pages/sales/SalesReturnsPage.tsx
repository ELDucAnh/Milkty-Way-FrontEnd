import { useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../../components/common/Modal";

/** Giữ cấu trúc, số liệu và trạng thái nút từ sales-returns.html. */
export default function SalesReturnsPage() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("");
    const matches = (!status || status === "Pending") &&
        "HT-0001 DH-00125 Nguyễn An".toLocaleLowerCase("vi-VN")
            .includes(query.trim().toLocaleLowerCase("vi-VN"));
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
          <div className="text-[26px] font-extrabold text-[var(--text)] mt-1">12</div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">1.5% tỷ lệ yêu cầu hoàn, đổi</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Số tiền đã hoàn</div>
          <div className="text-[26px] font-extrabold text-red-500 mt-1">620 VND</div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">Đã hoàn cho khách</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Số lượng nhập lại kho</div>
          <div className="text-[26px] font-extrabold text-[var(--primary)] mt-1">15 <span className="text-[13px] font-medium text-[var(--muted)]">Đơn vị</span></div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">Đã đưa lại lên kệ</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">Chờ phê duyệt</div>
          <div className="text-[26px] font-extrabold text-amber-500 mt-1">1</div>
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

      
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
            <tr>
              <th>Mã yêu cầu</th>
              <th>Đơn gốc</th>
              <th>Khách hàng</th>
              <th>Thời gian</th>
              <th>Hướng xử lý</th>
              <th>Lý do</th>
              <th>Số tiền hoàn</th>
              <th>Điểm điều chỉnh</th>
              <th>Người duyệt</th>
              <th>Trạng thái</th>
            </tr>
            </thead>
            <tbody>{matches ? (<tr>
              <td>HT-0001</td>
              <td>DH-00125</td>
              <td className="name-ellipsis" title="Nguyễn An">Nguyễn An</td>
              <td>28/10/2026 · 09:30</td>
              <td>Hoàn tiền</td>
              <td>Sai mức đường</td>
              <td>45.000 VND</td>
              <td>-45 điểm · Dự kiến</td>
              <td>Chưa duyệt</td>
              <td><span className="badge badge-warning">Chờ duyệt</span></td>
            </tr>) : <tr><td colSpan={10} className="text-center text-[var(--muted)]">Không có yêu cầu phù hợp.</td></tr>}</tbody>
          </table>
        </div>
      </div>

      <section className="card mt-4">
        <h2 className="card-title mb-4">Lịch sử xử lý yêu cầu HT-0001</h2>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
            <tr><th>Thời gian</th><th>Người thực hiện</th><th>Nội dung</th></tr>
            </thead>
            <tbody>
            <tr>
              <td>28/10/2026 · 09:30</td>
              <td>Thu ngân CN01</td>
              <td>Tạo yêu cầu hoàn 45.000 VND vì sai mức đường.</td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>

    
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
