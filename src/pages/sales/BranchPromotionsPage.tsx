import { useEffect, useState } from "react";
import { can, checkLogin, scopedBranch } from "../../utils/auth";
import { getSalesBranches } from "../../data/sales/branches";
import { useToast } from "../../components/common/useToast";
import { formatCurrency, SalesPageHeader } from "./sales-support";
import {
    listScopedPromotions,
    promotionAppliesAtBranch,
    promotionUsageCapacity,
    getPromotionStatus,
    setBranchPromotions,
    PROMOTIONS_CHANGED,
    STORAGE_PROMOTIONS,
    type Promotion,
} from "../shared/promotions-store";

export default function BranchPromotionsPage() {
    const toast = useToast();
    const [branchSearch, setBranchSearch] = useState("");
    const isChainAdmin = checkLogin() === "owner" && can("promotion.manage");
    const userBranch = scopedBranch();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [branches, setBranches] = useState<ReturnType<typeof getSalesBranches>>([]);
    const [dataError, setDataError] = useState("");
    const [saving, setSaving] = useState(false);

    function reload() {
        try {
            const allBranches = getSalesBranches();
            setBranches(isChainAdmin
                ? allBranches
                : allBranches.filter(branch => branch.id === userBranch));
            setPromotions(listScopedPromotions());
            setDataError("");
        } catch (error) {
            setDataError(
                error instanceof Error ? error.message : "Không đọc được dữ liệu.",
            );
        }
    }

    useEffect(() => {
        reload();
        const refresh = () => reload();
        const storage = (event: StorageEvent) => {
            if (event.key === STORAGE_PROMOTIONS || event.key === null) reload();
        };
        window.addEventListener(PROMOTIONS_CHANGED, refresh);
        window.addEventListener("storage", storage);
        return () => {
            window.removeEventListener(PROMOTIONS_CHANGED, refresh);
            window.removeEventListener("storage", storage);
        };
    }, [userBranch, isChainAdmin]);
    async function togglePromotionForBranch(promoId: string, branchId: string) {
        if (!isChainAdmin || saving) return;

        const promotion = promotions.find(row => row.id === promoId);
        if (!promotion) return;

        setSaving(true);
        try {
            await setBranchPromotions(
                branchId,
                !promotionAppliesAtBranch(promotion, branchId),
                promoId,
            );
            reload();
            toast.success("Đã cập nhật phạm vi chi nhánh.");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Không cập nhật được phạm vi.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function toggleAllForBranch(branchId: string, enable: boolean) {
        if (!isChainAdmin || saving) return;

        setSaving(true);
        try {
            await setBranchPromotions(branchId, enable);
            reload();
            toast.success(
                enable ? "Đã bật phân bổ tại chi nhánh." : "Đã tắt phân bổ tại chi nhánh.",
            );
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Không cập nhật được phạm vi.",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <SalesPageHeader
                title="Áp dụng khuyến mãi theo chi nhánh"
                breadcrumb="Marketing"
                parent={{ label: "", to: "" }}
                description="Theo dõi phạm vi áp dụng; chỉ Admin được điều chỉnh phân bổ."
            />

            {!isChainAdmin && (
                <div className="card mb-4 text-sm" role="status">
                    <strong>Chế độ Chỉ Xem:</strong> Quyền điều chỉnh và phân bổ
                    chương trình khuyến mãi chỉ thuộc về Admin (Quản trị chuỗi).
                    Quản lý chi nhánh và nhân viên chỉ theo dõi chương trình
                    tại chi nhánh của mình{userBranch ? ` · ${userBranch}` : ""}.
                </div>
            )}

            {dataError && (
                <div className="card mb-4 text-rose-700" role="alert">
                    {dataError}
                </div>
            )}
            <section className="space-y-6" aria-label="Ma trận khuyến mãi theo chi nhánh">
                {/* Thống kê phạm vi phân bổ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="stat-card">
                        <div className="stat-card-icon icon-bg-primary">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        </div>
                        <div className="stat-card-body">
                            <div className="stat-label">Chi nhánh áp dụng</div>
                            <div className="stat-value">
                                {branches.filter((b) => promotions.some(p => promotionAppliesAtBranch(p, b.id))).length} / {branches.length}
                            </div>
                            <div className="stat-sub-label">{userBranch ? `Phạm vi ${userBranch}` : "Toàn chuỗi TP.HCM"}</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon icon-bg-success">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <div className="stat-card-body">
                            <div className="stat-label">Chương trình đang chạy</div>
                            <div className="stat-value text-emerald-600">
                                {promotions.filter(r => getPromotionStatus(r) === "active").length}
                            </div>
                            <div className="stat-sub-label">Áp dụng trực tiếp tại quầy &amp; app</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon icon-bg-warning">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                        </div>
                        <div className="stat-card-body">
                            <div className="stat-label">Tổng ngân sách Marketing</div>
                            <div className="stat-value text-amber-600">
                                {formatCurrency(promotions.reduce((sum, r) => sum + r.budget, 0))}
                            </div>
                            <div className="stat-sub-label">{userBranch ? `Ngân sách CT tại ${userBranch}` : "Hạn mức toàn chuỗi tháng này"}</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon icon-bg-info">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 14 14" /></svg>
                        </div>
                        <div className="stat-card-body">
                            <div className="stat-label">Lượt sử dụng tối đa</div>
                            <div className="stat-value text-blue-600">
                                {promotions.reduce((sum, r) => sum + (promotionUsageCapacity(r) ?? r.usageLimit), 0).toLocaleString("vi-VN")}
                            </div>
                            <div className="stat-sub-label">Giới hạn chống lạm thu</div>
                        </div>
                    </div>
                </div>

                {/* Bảng ma trận điều chỉnh chi nhánh */}
                <div className="card p-0 overflow-hidden">
                    <div className="p-4 md:p-5 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-bold text-base">Ma trận khuyến mãi · {branches.length} chi nhánh</h2>
                            <p className="text-xs text-[var(--muted)] mt-0.5">
                                {isChainAdmin
                                    ? "Nhấp mã khuyến mãi để bật/tắt phân bổ. Phân bổ không thay thế trạng thái và thời hạn chương trình."
                                    : "Các chương trình được phân bổ tại chi nhánh của bạn. Không có quyền chỉnh sửa."}
                            </p>
                        </div>
                        <div className="w-full sm:w-72">
                            <input
                                type="search"
                                className="form-input w-full h-10 text-xs"
                                placeholder="Tìm mã hoặc tên chi nhánh..."
                                value={branchSearch}
                                onChange={(e) => setBranchSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="data-table w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="whitespace-nowrap">Mã CN</th>
                                    <th>Cửa Hàng Chi Nhánh</th>
                                    <th>Chương Trình Khuyến Mãi Áp Dụng (Nhấp Để Bật / Tắt)</th>
                                    <th className="text-center whitespace-nowrap">Số CT Đang Chạy</th>
                                    <th className="text-right whitespace-nowrap">Thao Tác Nhanh</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branches
                                    .filter((b) => !branchSearch || `${b.id} ${b.name}`.toLowerCase().includes(branchSearch.toLowerCase()))
                                    .map((branch) => {
                                        const activePromos = promotions.filter(promotion =>
                                            promotionAppliesAtBranch(promotion, branch.id) &&
                                            getPromotionStatus(promotion) === "active"
                                        );
                                        return (
                                            <tr key={branch.id}>
                                                <td className="font-mono font-bold text-[var(--primary)] whitespace-nowrap">
                                                    {branch.id}
                                                </td>
                                                <td>
                                                    <div className="font-semibold text-sm">{branch.name}</div>
                                                    <div className="text-xs text-[var(--muted)]">Khu vực TP.HCM</div>
                                                </td>
                                                <td>
                                                    <div className="flex flex-wrap gap-2 py-1">
                                                        {promotions.map((promo) => {
                                                            const isEnabled = promotionAppliesAtBranch(promo, branch.id);
                                                            return (
                                                                <button
                                                                    key={promo.id}
                                                                    type="button"
                                                                    disabled={!isChainAdmin || saving || !!dataError}
                                                                    onClick={() => togglePromotionForBranch(promo.id, branch.id)}
                                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${isEnabled
                                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                                                        : "bg-gray-50 text-gray-400 border-gray-200 line-through hover:bg-gray-100"
                                                                        }`}
                                                                    title={`Nhấp để ${isEnabled ? "tắt" : "bật"} ${promo.name} tại ${branch.id}`}
                                                                >
                                                                    <span className={`w-2 h-2 rounded-full ${isEnabled ? "bg-emerald-500" : "bg-gray-300"}`}></span>
                                                                    {promo.code}: {promo.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="text-center whitespace-nowrap">
                                                    <span className={`font-bold px-2.5 py-1 rounded-full text-xs ${activePromos.length > 0 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
                                                        }`}>
                                                        {activePromos.length} / {promotions.length}
                                                    </span>
                                                </td>
                                                <td className="text-right whitespace-nowrap">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary btn-sm text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                                                            disabled={!isChainAdmin || saving || !!dataError}
                                                            onClick={() => toggleAllForBranch(branch.id, true)}
                                                            title="Bật toàn bộ ưu đãi cho chi nhánh này"
                                                        >
                                                            Bật tất cả
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary btn-sm text-xs disabled:opacity-60 disabled:cursor-not-allowed text-rose-600 hover:bg-rose-50"
                                                            disabled={!isChainAdmin || saving || !!dataError}
                                                            onClick={() => toggleAllForBranch(branch.id, false)}
                                                            title="Tạm ngưng ưu đãi tại chi nhánh này khi quá tải quầy bar"
                                                        >
                                                            Tắt tất cả
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </>
    );
}

