import { Link, useNavigate, useParams } from "react-router-dom";
import Badge from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import { formatCurrency, formatDate } from "../shared/formatters";
import { getIngredient, getStore } from "../shared/business-demo";
import { useDemoState } from "../shared/useDemoState";

const STATUS_LABEL = { active: "Đang bán", "branch-locked": "Khóa tại cửa hàng", inactive: "Ngừng bán", "pending-recipe": "Chờ duyệt công thức" } as const;
const STATUS_VARIANT = { active: "success", "branch-locked": "warning", inactive: "danger", "pending-recipe": "warning" } as const;

export default function ProductDetailsPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [data] = useDemoState();
    const product = data.products.find((item) => item.id === id || item.code.toLocaleLowerCase("vi-VN") === id?.toLocaleLowerCase("vi-VN"));

    return (
        <div>
            <div className="page-header"><div>
                <nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/dashboard">Trang chủ</Link><span className="sep">/</span><Link to="/inventory/products">Menu đồ uống</Link><span className="sep">/</span><span className="current">Chi tiết món</span></nav>
                <h1 className="page-title">{product ? "Chi tiết món & công thức" : "Không tìm thấy sản phẩm"}</h1>
                <p className="page-subtitle">{product ? "Giá chuẩn, giá vốn định mức, topping và lịch sử phiên bản công thức." : "Mã sản phẩm trên đường dẫn không tồn tại trong dữ liệu demo."}</p>
            </div><span className="text-xs text-[var(--muted)]">Dữ liệu demo</span></div>

            {!product ? <section className="card"><h2 className="font-bold mb-2">Sản phẩm không tồn tại</h2><p className="text-sm text-[var(--muted)] mb-4">Không có sản phẩm khớp với mã “{id ?? ""}”. Không thay thế bằng một sản phẩm mặc định.</p><button className="btn btn-primary" onClick={() => navigate("/inventory/products")}>Quay lại danh mục</button></section> : <>
                <section className="card mb-6 border-l-4 border-[var(--info)]"><h2 className="text-sm font-bold mb-1">Lịch sử bất biến</h2><p className="text-sm text-[var(--muted)]">Đơn hàng đã chốt giữ giá và phiên bản công thức tại thời điểm bán. Sửa công thức tạo phiên bản mới, không ghi đè phiên bản cũ.</p></section>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                    <section className="card xl:col-span-2"><div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs text-[var(--muted)]">MÃ MÓN · {product.code}</p><h2 className="text-xl font-bold mt-1">{product.name}</h2><p className="text-sm text-[var(--muted)] mt-2">Nhóm {data.categories.find((item) => item.key === product.category)?.name ?? product.category} · Menu lõi toàn chuỗi</p></div><Badge variant={STATUS_VARIANT[product.status]}>{STATUS_LABEL[product.status]}</Badge></div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">{product.variants.map((variant) => <div key={variant.size} className="rounded-xl border border-[var(--border)] p-4"><p className="text-sm text-[var(--muted)]">Giá size {variant.size}</p><p className="text-lg font-bold mt-1">{formatCurrency(variant.price)}</p><p className="text-xs text-[var(--muted)]">COGS: {product.cogsBySize[variant.size] == null ? "Chưa xác định" : formatCurrency(product.cogsBySize[variant.size]!)}</p></div>)}</div>
                        <div className="flex justify-end mt-5"><button className="btn btn-secondary" onClick={() => navigate("/inventory/products/new")}>Khai báo món mới</button></div>
                    </section>

                    <aside className="card"><h2 className="font-bold mb-3">Thông tin quản lý</h2><dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Size hỗ trợ</dt><dd>{product.variants.map((variant) => variant.size).join(", ")}</dd></div><div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Trạng thái</dt><dd>{STATUS_LABEL[product.status]}</dd></div><div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Cửa hàng khóa món</dt><dd>{product.lockedStoreIds.length ? product.lockedStoreIds.map((storeId) => getStore(data, storeId)?.code ?? storeId).join(", ") : "Không có"}</dd></div></dl><h3 className="font-semibold mt-5 mb-2">Topping</h3>{product.toppings.length ? product.toppings.map((topping) => <p key={topping.ingredientId} className="text-sm">{getIngredient(data, topping.ingredientId)?.name ?? topping.ingredientId} · {topping.default ? "Mặc định" : "Tùy chọn"} · {formatCurrency(topping.price)}</p>) : <p className="text-sm text-[var(--muted)]">Chưa khai báo topping.</p>}<button className="btn btn-secondary w-full mt-5" onClick={() => navigate("/production/recipes")}>Mở biểu mẫu công thức</button></aside>
                </div>

                <section className="card p-0 overflow-hidden mb-6"><div className="p-4 md:p-5 border-b border-[var(--border)]"><h2 className="font-bold">Định mức công thức theo size</h2><p className="text-sm text-[var(--muted)] mt-1">Các dòng được lấy từ công thức và phiên bản đã lưu.</p></div><DataTable><table className="w-full text-sm text-left"><thead className="bg-[var(--background)] text-[var(--muted)]"><tr>{["Công thức", "Size", "Phiên bản", "Nguyên liệu", "Định lượng", "Loại sử dụng", "Ghi chú"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{data.recipes.filter((recipe) => recipe.productId === product.id).flatMap((recipe) => recipe.ingredients.map((line) => <tr key={`${recipe.id}-${line.id}`} className="border-t border-[var(--border)]"><td className="px-4 py-3">{recipe.code}</td><td className="px-4 py-3">{recipe.size}</td><td className="px-4 py-3">{recipe.version}</td><td className="px-4 py-3">{getIngredient(data, line.ingredientId)?.name ?? "Nguyên liệu không còn trong danh mục"}</td><td className="px-4 py-3">{line.quantity} {line.unit}</td><td className="px-4 py-3">{line.useType === "required" ? "Bắt buộc" : line.useType === "default-topping" ? "Topping mặc định" : "Topping tùy chọn"}</td><td className="px-4 py-3">{line.optionRule || line.note || "—"}</td></tr>))}</tbody></table></DataTable></section>

                <section className="card p-0 overflow-hidden"><div className="p-4 md:p-5 border-b border-[var(--border)]"><h2 className="font-bold">Lịch sử phiên bản công thức</h2><p className="text-sm text-[var(--muted)] mt-1">Không xóa phiên bản đã được sử dụng trong đơn hàng.</p></div><DataTable><table className="w-full text-sm text-left"><thead className="bg-[var(--background)] text-[var(--muted)]"><tr>{["Mã công thức", "Size", "Phiên bản", "Ngày hiệu lực", "Thay đổi", "Người duyệt", "Trạng thái"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{data.recipes.filter((recipe) => recipe.productId === product.id).map((recipe) => <tr key={recipe.id} className="border-t border-[var(--border)]"><td className="px-4 py-3">{recipe.code}</td><td className="px-4 py-3">{recipe.size}</td><td className="px-4 py-3">{recipe.version}</td><td className="px-4 py-3">{formatDate(recipe.effectiveDate)}</td><td className="px-4 py-3">{recipe.changeReason || "—"}</td><td className="px-4 py-3">{recipe.approver || "Chưa phân công"}</td><td className="px-4 py-3"><Badge variant={recipe.status === "approved" ? "success" : recipe.status === "pending" ? "warning" : "info"}>{recipe.status === "approved" ? "Đã duyệt" : recipe.status === "pending" ? "Chờ duyệt" : "Bản nháp"}</Badge></td></tr>)}</tbody></table></DataTable></section>
            </>}
        </div>
    );
}
