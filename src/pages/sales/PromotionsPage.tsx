<<<<<<< Updated upstream
import { useRef, useState } from "react";
=======
import { can, checkLogin, scopedBranch } from "../../utils/auth";
import { useEffect, useState } from "react";
>>>>>>> Stashed changes
import type { FormEvent, InputHTMLAttributes } from "react";
import Badge from "../../components/common/Badge";
import type { BadgeVariant } from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { useToast } from "../../components/common/useToast";
import {
    channelLabels,
    formatCurrency,
    formatDate,
    parseVietnameseDate,
    shiftLabels,
} from "./sales-support";
import {
    getSalesBranches,
} from "../../data/sales/branches";
import { products } from "../../data/sales/products";
import {
    listScopedPromotions,
    upsertPromotion,
    setPromotionStatus,
    getPromotionStatus,
    getPromotionForecast,
    promotionUsageCapacity,
    findPromotionConflicts,
    PROMOTIONS_CHANGED,
    STORAGE_PROMOTIONS,
    type Promotion,
    type PromotionStatus,
    type PromotionChannel,
    type PromotionShift,
    type PromotionDiscountType,
} from "../shared/promotions-store";

interface PromotionForm {
    name: string;
    code: string;
    description: string;
    startDate: string;
    endDate: string;
    hourFrom: string;
    hourTo: string;
    channel: PromotionChannel;
    shift: PromotionShift;
    branchMode: "all" | "include" | "exclude";
    naturalRuleText: string;
    stackWithMemberTier: boolean;
    priority: string;
    discountType: PromotionDiscountType;
    discountValue: string;
    buyQuantity: string;
    giftQuantity: string;
    usageScope: Promotion["usageScope"];
    oncePerMember: boolean;
    productCategory: string;

    branchIds: string[];
    productId: string;
    minQuantity: string;
    benefit: string;
    giftProductId: string;
    budget: string;
    usageLimit: string;
    stackable: boolean;
}

interface PromotionFilters {
    search: string;
    status: string;
    channel: string;
}

interface PromotionInputProps extends InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
    wrapperClassName?: string;
}

function PromotionInput({
    id,
    label,
    wrapperClassName = "",
    ...props
}: PromotionInputProps) {
    return (
        <div className={wrapperClassName}>
            <label className="form-label" htmlFor={id}>{label}</label>
            <input id={id} className="form-input w-full h-11" {...props} />
        </div>
    );
}

const statusLabels: Record<PromotionStatus, string> = {
    draft: "Nháp",
    scheduled: "Sắp diễn ra",
    active: "Đang áp dụng",
    ended: "Đã kết thúc",
};

const statusVariants: Record<PromotionStatus, BadgeVariant> = {
    draft: "gray",
    scheduled: "info",
    active: "success",
    ended: "gray",
};

<<<<<<< Updated upstream
export const initialPromotions: readonly Promotion[] = [
    {
        id: "KM-001",
        code: "KM-001",
        name: "Mua 2 ly tặng trân châu",
        version: 1,
        branchIds: ["CN01", "CN02"],
        branchMode: "include",
        channel: "online",
        shift: "afternoon",
        startDate: "2026-10-28",
        endDate: "2026-10-31",
        hourFrom: "14:00",
        hourTo: "17:00",
        budget: 2000000,
        usageLimit: 200,
        status: "active",
        description: "",
        productId: null,
        minQuantity: null,
        benefit: null,
        giftProductId: null,
        stackable: null,
    },
    {
        id: "KM-002",
        code: "KM-002",
        name: "Ưu đãi đầu tháng",
        version: 1,
        branchIds: branches.map((branch) => branch.id),
        branchMode: "include",
        channel: "all",
        shift: "all",
        startDate: "2026-11-01",
        endDate: "2026-11-07",
        hourFrom: "08:00",
        hourTo: "22:00",
        budget: 5000000,
        usageLimit: 500,
        status: "scheduled",
        description: "",
        productId: null,
        minQuantity: null,
        benefit: null,
        giftProductId: null,
        stackable: null,
    },
    {
        id: "KM-003",
        code: "KM-003",
        name: "Quà tặng cuối tuần",
        version: 1,
        branchIds: ["CN03", "CN04"],
        branchMode: "include",
        channel: "counter",
        shift: "evening",
        startDate: "2026-10-31",
        endDate: "2026-11-01",
        hourFrom: "18:00",
        hourTo: "21:00",
        budget: 1000000,
        usageLimit: 100,
        status: "draft",
        description: "",
        productId: null,
        minQuantity: null,
        benefit: null,
        giftProductId: null,
        stackable: null,
    },
];

export const STORAGE_PROMOTIONS = "miltyway_promotions_v1";

export function loadPromotions(): Promotion[] {
    try {
        const raw = localStorage.getItem(STORAGE_PROMOTIONS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {
        // ignore
    }
    return [...initialPromotions];
}

export function savePromotions(promotions: Promotion[]): void {
    try {
        localStorage.setItem(STORAGE_PROMOTIONS, JSON.stringify(promotions));
    } catch {
        // ignore
    }
}

=======
>>>>>>> Stashed changes
const emptyFilters: PromotionFilters = {
    search: "",
    status: "",
    channel: "",
};

const promotionProducts = products.map(product => ({
    id: product.sku,
    name: product.name,
}));

function createForm(): PromotionForm {
    return {
        name: "",
        code: "",
        description: "",
        startDate: "",
        endDate: "",
        hourFrom: "08:00",
        hourTo: "22:00",
        channel: "all",
        shift: "all",
        branchMode: "include",
        branchIds: [],
        productId: "",
        minQuantity: "",
        benefit: "",
        giftProductId: "",
        budget: "",
        usageLimit: "",
        stackable: false,
        naturalRuleText: "",
        stackWithMemberTier: false,
        priority: "1",
        discountType: "percent",
        discountValue: "10",
        buyQuantity: "2",
        giftQuantity: "1",
        usageScope: "chain",
        oncePerMember: false,
        productCategory: "",

    };
}

function isChannel(value: string): value is PromotionChannel {
    return value === "all" || value === "counter" ||
        value === "takeaway" || value === "online";
}

function isShift(value: string): value is PromotionShift {
    return value === "all" || value === "morning" ||
        value === "afternoon" || value === "evening";
}

export default function PromotionsPage() {
    const toast = useToast();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const isChainAdmin = checkLogin() === "owner" && can("promotion.manage");
    const userBranch = scopedBranch();
    const [editing, setEditing] = useState<Promotion | null>(null);
    const [saving, setSaving] = useState(false);
    const [dataError, setDataError] = useState("");
    const [rows, setRows] = useState<Promotion[]>([]);
    const [branches, setBranches] = useState<ReturnType<typeof getSalesBranches>>([]);

    function reload() {
        try {
            setRows(listScopedPromotions());
            setBranches(getSalesBranches());
            setDataError("");
        } catch (error) {
            setDataError(error instanceof Error ? error.message : "Không đọc được dữ liệu.");
        }
    }

    useEffect(() => {
        reload();
        const refresh = () => reload();
        const storage = (event: StorageEvent) => {
            if (event.key === STORAGE_PROMOTIONS || event.key === null) reload();
        };
        const timer = window.setInterval(refresh, 30000);
        window.addEventListener(PROMOTIONS_CHANGED, refresh);
        window.addEventListener("storage", storage);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener(PROMOTIONS_CHANGED, refresh);
            window.removeEventListener("storage", storage);
        };
    }, [userBranch, isChainAdmin]);

    const [form, setForm] = useState<PromotionForm>(createForm);
    const [draftFilters, setDraftFilters] = useState<PromotionFilters>(emptyFilters);
    const [filters, setFilters] = useState<PromotionFilters>(emptyFilters);

    function updateForm<K extends keyof PromotionForm>(
        key: K,
        value: PromotionForm[K],
    ) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    function toggleBranch(id: string) {
        setForm((current) => ({
            ...current,
            branchIds: current.branchIds.includes(id)
                ? current.branchIds.filter((branchId) => branchId !== id)
                : [...current.branchIds, id],
        }));
    }

    const query = filters.search.trim().toLocaleLowerCase("vi-VN");
<<<<<<< Updated upstream
    const visibleRows = rows.filter((row) =>
        `${row.code} ${row.name}`.toLocaleLowerCase("vi-VN").includes(query) &&
        (!filters.status || row.status === filters.status) &&
=======

    const visibleRows = rows.filter(row =>
        `${row.code} ${row.name} ${row.naturalRuleText}`
            .toLocaleLowerCase("vi-VN").includes(query) &&
        (!filters.status || getPromotionStatus(row) === filters.status) &&
>>>>>>> Stashed changes
        (!filters.channel || row.channel === "all" || row.channel === filters.channel)
    );
    function openEdit(row: Promotion) {
        if (!isChainAdmin) return;
        const asVietnameseDate = (date: string) => date.split("-").reverse().join("/");

        setEditing(row);
        setForm({
            name: row.name,
            code: row.code,
            description: row.description,
            startDate: asVietnameseDate(row.startDate),
            endDate: asVietnameseDate(row.endDate),
            hourFrom: row.hourFrom,
            hourTo: row.hourTo,
            channel: row.channel,
            shift: row.shift,
            branchMode: row.branchMode,
            branchIds: [...row.branchIds],
            productId: row.productId ?? "",
            productCategory: row.productCategory ?? "",
            minQuantity: String(row.minQuantity ?? 1),
            benefit: row.benefit ?? "",
            giftProductId: row.giftProductId ?? "",
            budget: String(row.budget),
            usageLimit: String(row.usageLimit),
            stackable: row.stackWithOtherPromo === "stackable",
            naturalRuleText: row.naturalRuleText,
            stackWithMemberTier: row.stackWithMemberTier,
            priority: String(row.priority),
            discountType: row.discountType,
            discountValue: String(row.discountValue),
            buyQuantity: String(row.buyQuantity),
            giftQuantity: String(row.giftQuantity),
            usageScope: row.usageScope,
            oncePerMember: row.oncePerMember,
        });
        setIsCreateOpen(true);
    }
    async function saveDraft(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!isChainAdmin || saving || dataError) return;

        setSaving(true);

        try {
            const startDate = parseVietnameseDate(form.startDate);
            const endDate = parseVietnameseDate(form.endDate);

            if (!startDate || !endDate || startDate > endDate) {
                throw new Error("Khoảng ngày không hợp lệ. Nhập dd/MM/yyyy.");
            }

            const budget = Number(form.budget);
            const usageLimit = Number(form.usageLimit);
            const minQuantity = Number(form.minQuantity);
            const priority = Number(form.priority);
            const discountValue = Number(form.discountValue);
            const buyQuantity = Number(form.buyQuantity);
            const giftQuantity = Number(form.giftQuantity);

            if (!form.name.trim() || !form.naturalRuleText.trim()) {
                throw new Error("Nhập tên chương trình và quy định áp dụng.");
            }

            if (
                !form.budget.trim() ||
                !form.usageLimit.trim() ||
                !form.minQuantity.trim() ||
                !Number.isSafeInteger(budget) || budget < 1 ||
                !Number.isSafeInteger(usageLimit) || usageLimit < 1 ||
                !Number.isSafeInteger(minQuantity) || minQuantity < 1 ||
                !Number.isSafeInteger(priority) || priority < 1 || priority > 5 ||
                !Number.isSafeInteger(discountValue) || discountValue < 0 ||
                !Number.isSafeInteger(buyQuantity) || buyQuantity < 1 ||
                !Number.isSafeInteger(giftQuantity) || giftQuantity < 1
            ) {
                throw new Error("Kiểm tra ngân sách, số lượt, số ly và mức ưu đãi.");
            }

            if (
                form.discountType === "none" ||
                (form.discountType !== "buy_x_get_y" && discountValue < 1) ||
                (form.discountType === "percent" && discountValue > 100)
            ) {
                throw new Error("Chọn loại ưu đãi và mức giảm hợp lệ.");
            }

            if (
                form.productId &&
                !promotionProducts.some(product => product.id === form.productId)
            ) {
                throw new Error("SKU áp dụng không tồn tại.");
            }

            const appliedBranchCount = branches.filter(branch =>
                form.branchMode === "all" ||
                (
                    form.branchMode === "exclude"
                        ? !form.branchIds.includes(branch.id)
                        : form.branchIds.includes(branch.id)
                )
            ).length;

            if (!appliedBranchCount) {
                throw new Error("Phải áp dụng tại ít nhất một chi nhánh.");
            }

            const id = editing?.id ?? crypto.randomUUID();
            const code = form.code.trim().toUpperCase() ||
                `KM-${id.slice(0, 8).toUpperCase()}`;

            const promotion: Promotion = {
                id,
                code,
                name: form.name.trim(),
                version: editing?.version ?? 1,
                branchIds: form.branchMode === "all" ? [] : [...form.branchIds],
                branchMode: form.branchMode,
                channel: form.channel,
                shift: form.shift,
                startDate,
                endDate,
                hourFrom: form.hourFrom,
                hourTo: form.hourTo,
                budget,
                budgetUsed: editing?.budgetUsed ?? 0,
                usageLimit,
                usageCount: editing?.usageCount ?? 0,
                usageScope: form.usageScope,
                oncePerMember: form.oncePerMember,
                branchUsage: editing?.branchUsage ?? {},
                status: editing?.status ?? "draft",
                description: form.description.trim(),
                productId: form.productId || null,
                productCategory: form.productCategory || null,
                minQuantity,
                benefit: form.benefit.trim() || null,
                giftProductId: form.giftProductId.trim() || null,
                stackable: form.stackable,
                naturalRuleText: form.naturalRuleText.trim(),
                stackWithMemberTier: form.stackWithMemberTier,
                stackWithOtherPromo: form.stackable ? "stackable" : "exclusive",
                priority,
                terminationRule: "whichever_first",
                discountType: form.discountType,
                discountValue,
                buyQuantity,
                giftQuantity,
            };

            await upsertPromotion(promotion, editing?.version ?? null);

            setIsCreateOpen(false);
            setEditing(null);
            setForm(createForm());
            reload();
            toast.success("Đã lưu chương trình khuyến mãi.");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Không lưu được chương trình.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function togglePromotionStatus(id: string) {
        if (!isChainAdmin || saving) return;
        const row = rows.find(item => item.id === id);
        if (!row) return;

        setSaving(true);
        try {
            await setPromotionStatus(
                row.id,
                row.version,
                row.status === "active" || row.status === "scheduled"
                    ? "ended"
                    : "active",
            );
            reload();
            toast.success("Đã cập nhật trạng thái.");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Không cập nhật được trạng thái.",
            );
        } finally {
            setSaving(false);
        }
    }
    const candidateStart = parseVietnameseDate(form.startDate);
    const candidateEnd = parseVietnameseDate(form.endDate);

    const conflictCandidate: Promotion | null =
        candidateStart && candidateEnd
            ? {
                id: editing?.id ?? "__new__",
                code: form.code,
                name: form.name,
                version: editing?.version ?? 1,
                branchMode: form.branchMode,
                branchIds: form.branchIds,
                channel: form.channel,
                shift: form.shift,
                startDate: candidateStart,
                endDate: candidateEnd,
                hourFrom: form.hourFrom,
                hourTo: form.hourTo,
                productId: form.productId || null,
                productCategory: form.productCategory || null,
                budget: Number(form.budget) || 0,
                budgetUsed: editing?.budgetUsed ?? 0,
                usageLimit: Number(form.usageLimit) || 1,
                usageCount: editing?.usageCount ?? 0,
                usageScope: form.usageScope,
                oncePerMember: form.oncePerMember,
                branchUsage: editing?.branchUsage ?? {},
                status: editing?.status ?? "draft",
                description: form.description,
                minQuantity: Number(form.minQuantity) || 1,
                benefit: form.benefit || null,
                giftProductId: form.giftProductId || null,
                stackable: form.stackable,
                naturalRuleText: form.naturalRuleText,
                stackWithMemberTier: form.stackWithMemberTier,
                stackWithOtherPromo: form.stackable ? "stackable" : "exclusive",
                priority: Number(form.priority) || 1,
                terminationRule: "whichever_first",
                discountType: form.discountType,
                discountValue: Number(form.discountValue) || 0,
                buyQuantity: Number(form.buyQuantity) || 2,
                giftQuantity: Number(form.giftQuantity) || 1,
            }
            : null;

    let conflictCodes: string[] = [];
    if (conflictCandidate && !dataError) {
        try {
            conflictCodes = findPromotionConflicts(conflictCandidate, rows)
                .map(row => row.code);
        } catch {
            // Lỗi danh mục đã được hiển thị tại phần dữ liệu trang.
        }
    }

    const runningCount = rows.filter(row =>
        getPromotionStatus(row) === "active"
    ).length;
    const totalBudgetUsed = rows.reduce((total, row) => total + row.budgetUsed, 0);
    const totalUsage = rows.reduce((total, row) => total + row.usageCount, 0);
    return (
        <>
<<<<<<< Updated upstream
            <SalesPageHeader
                title="Chương trình khuyến mãi & Voucher"
                breadcrumb="Marketing"
                parent={{ label: "", to: "" }}
                description="Thiết lập các chương trình khuyến mãi, voucher ưu đãi và chính sách quà tặng toàn hệ thống MilktyWay."
                actions={
=======
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                    <h1 className="text-xl font-bold">Khuyến mãi & Voucher</h1>
                    <p className="text-xs text-[var(--muted)]">
                        Tra cứu thể lệ, hạn mức và phạm vi áp dụng.
                    </p>
                </div>

                {isChainAdmin && (
>>>>>>> Stashed changes
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!!dataError}
                        onClick={() => {
                            setEditing(null);
                            setForm(createForm());
                            setIsCreateOpen(true);
                        }}
                    >
                        + Tạo chương trình
                    </button>
                )}
            </div>

            {dataError && (
                <div role="alert" className="card mb-3 text-rose-700">
                    {dataError}
                    <button
                        type="button"
                        className="btn btn-secondary ml-3"
                        onClick={reload}
                    >
                        Tải lại
                    </button>
                </div>
            )}

            {!isChainAdmin && (
                <p className="mb-3 text-xs text-[var(--muted)]">
                    Chỉ xem chương trình khuyến mãi
                    {userBranch ? ` · ${userBranch}` : ""}.
                </p>
            )}

            <section aria-label="Danh sách khuyến mãi" className="card !p-3">
                <form
                    className="flex flex-wrap items-center gap-2 mb-3"
                    onSubmit={event => {
                        event.preventDefault();
                        setFilters({ ...draftFilters });
                    }}
                >
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mr-auto">
                        <span>Tổng <strong>{rows.length}</strong></span>
                        <span>Đang chạy <strong>{runningCount}</strong></span>
                        <span>Đã dùng <strong>{formatCurrency(totalBudgetUsed)}</strong></span>
                        <span>Lượt <strong>{totalUsage.toLocaleString("vi-VN")}</strong></span>
                    </div>

                    <input
                        aria-label="Tìm khuyến mãi"
                        type="search"
                        className="form-input !w-52 !h-9"
                        placeholder="Mã, tên, quy định..."
                        value={draftFilters.search}
                        onChange={event => setDraftFilters(current => ({
                            ...current,
                            search: event.target.value,
                        }))}
                    />

                    <select
                        aria-label="Lọc trạng thái"
                        className="form-input form-select !w-40 !h-9"
                        value={draftFilters.status}
                        onChange={event => setDraftFilters(current => ({
                            ...current,
                            status: event.target.value,
                        }))}
                    >
                        <option value="">Mọi trạng thái</option>
                        {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>

                    <select
                        aria-label="Lọc kênh bán"
                        className="form-input form-select !w-36 !h-9"
                        value={draftFilters.channel}
                        onChange={event => setDraftFilters(current => ({
                            ...current,
                            channel: event.target.value,
                        }))}
                    >
                        <option value="">Mọi kênh</option>
                        {Object.entries(channelLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>

                    <button type="submit" className="btn btn-primary btn-sm">
                        Lọc
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                            setFilters(emptyFilters);
                            setDraftFilters(emptyFilters);
                        }}
                    >
                        Xóa lọc
                    </button>
                </form>

<<<<<<< Updated upstream
                <div className="mt-5">
                    <DataTable<Promotion> pagination={false}
                        key={JSON.stringify(filters)}
                        columns={columns}
                        data={visibleRows}
                        rowKey={(row) => row.id}
                        caption="Danh sách chương trình khuyến mãi"
                    />
                </div>
=======
                <DataTable>
                    <table className="data-table w-full table-fixed min-w-[1100px]">
                        <caption className="sr-only">
                            Danh sách chương trình khuyến mãi
                        </caption>
                        <colgroup>
                            <col style={{ width: isChainAdmin ? "26%" : "29%" }} />
                            <col style={{ width: "14%" }} />
                            <col style={{ width: isChainAdmin ? "28%" : "31%" }} />
                            <col style={{ width: "16%" }} />
                            <col style={{ width: "10%" }} />
                            {isChainAdmin && <col style={{ width: "6%" }} />}
                        </colgroup>
                        <thead>
                            <tr>
                                <th scope="col">Chương trình & Quy định</th>
                                <th scope="col">Mức ưu đãi</th>
                                <th scope="col">Tổng / Số lượng / Tiền</th>
                                <th scope="col">Ràng buộc & Kết thúc</th>
                                <th scope="col">Thời gian & CN</th>
                                {isChainAdmin && <th scope="col">Thao tác</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {!visibleRows.length && (
                                <tr>
                                    <td
                                        colSpan={isChainAdmin ? 6 : 5}
                                        className="text-center py-10"
                                    >
                                        Không có chương trình phù hợp.
                                    </td>
                                </tr>
                            )}

                            {visibleRows.map(row => {
                                const status = getPromotionStatus(row);
                                const forecast = getPromotionForecast(row);
                                const capacity = promotionUsageCapacity(row);
                                const usagePercent = capacity
                                    ? Math.min(100, row.usageCount / capacity * 100)
                                    : 0;
                                const budgetPercent = row.budget
                                    ? Math.min(100, row.budgetUsed / row.budget * 100)
                                    : 100;
                                const forecastTitle = {
                                    budget: "🔥 Chạm trần TIỀN / NGÂN SÁCH trước",
                                    usage: "⚡ Chạm trần SỐ LƯỢNG trước",
                                    time: "🕒 Chạm trần THỜI GIAN trước",
                                }[forecast.predictedBindingLimit];

                                return (
                                    <tr key={row.id}>
                                        <td className="align-top whitespace-normal break-words">
                                            <div className="text-base font-bold">{row.name}</div>
                                            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold">
                                                {row.code}
                                            </span>
                                            <p className="mt-2 text-sm font-semibold">
                                                🏃 {row.naturalRuleText}
                                            </p>
                                            {row.description && (
                                                <p className="mt-1 text-xs text-[var(--muted)]">
                                                    {row.description}
                                                </p>
                                            )}
                                            <div className="mt-2">
                                                <Badge variant={statusVariants[status]}>
                                                    {statusLabels[status]}
                                                </Badge>
                                            </div>
                                        </td>

                                        <td className="align-top whitespace-normal">
                                            <span className="inline-block text-lg font-extrabold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700">
                                                {row.discountType === "percent"
                                                    ? `-${row.discountValue}%`
                                                    : row.discountType === "fixed"
                                                        ? `-${formatCurrency(row.discountValue)}`
                                                        : row.discountType === "buy_x_get_y"
                                                            ? `MUA ${row.buyQuantity} TẶNG ${row.giftQuantity}`
                                                            : "Chưa cấu hình"}
                                            </span>
                                            <p className="mt-2 text-xs">
                                                {row.productId
                                                    ? `SKU ${row.productId}`
                                                    : row.productCategory
                                                        ? `Nhóm ${row.productCategory}`
                                                        : "Tất cả món"}
                                            </p>
                                            <p className="mt-1 text-xs">
                                                Tối thiểu {row.minQuantity ?? 1} ly
                                            </p>
                                            {row.benefit && (
                                                <p className="mt-1 text-xs text-[var(--muted)]">
                                                    {row.benefit}
                                                </p>
                                            )}
                                        </td>

                                        <td className="align-top whitespace-normal">
                                            <div className="text-xs font-bold mb-2">
                                                TỔNG: {row.usageCount.toLocaleString("vi-VN")} lượt
                                                {" · "}{formatCurrency(row.budgetUsed)}
                                            </div>

                                            <div className="flex justify-between gap-2 text-xs mb-1">
                                                <span>SỐ LƯỢNG</span>
                                                <strong>
                                                    {row.usageCount} / {capacity} lượt
                                                </strong>
                                            </div>
                                            <progress
                                                aria-label={`Tiến độ lượt ${row.code}`}
                                                className="w-full h-3 accent-blue-600"
                                                max={100}
                                                value={usagePercent}
                                            />

                                            {row.usageScope === "branch" && (
                                                <p className="text-xs text-[var(--muted)]">
                                                    Trần {row.usageLimit} lượt / chi nhánh
                                                </p>
                                            )}

                                            <div className="flex justify-between gap-2 text-xs mt-2 mb-1">
                                                <span>TIỀN</span>
                                                <strong>
                                                    {formatCurrency(row.budgetUsed)}
                                                    {" / "}{formatCurrency(row.budget)}
                                                </strong>
                                            </div>
                                            <progress
                                                aria-label={`Tiến độ ngân sách ${row.code}`}
                                                className="w-full h-3 accent-emerald-600"
                                                max={100}
                                                value={budgetPercent}
                                            />

                                            <div className="mt-2 p-2 rounded-lg bg-amber-50 text-amber-900 text-xs">
                                                <strong>{forecastTitle}</strong>
                                                <p className="mt-1">{forecast.bindingLimitNote}</p>
                                            </div>
                                        </td>

                                        <td className="align-top whitespace-normal text-xs">
                                            <p className="font-semibold">
                                                {row.stackWithOtherPromo === "exclusive"
                                                    ? "Độc quyền một mã"
                                                    : "Cho phép gộp mã"}
                                            </p>
                                            <p className="mt-1">
                                                {row.stackWithMemberTier
                                                    ? "Cộng dồn hạng thành viên"
                                                    : "Không cộng dồn hạng thành viên"}
                                            </p>
                                            <p className="mt-1">Ưu tiên: {row.priority}/5</p>
                                            <p className="mt-2 font-semibold">
                                                Dừng ngay khi hết thời gian HOẶC đủ lượt
                                                HOẶC hết ngân sách.
                                            </p>
                                        </td>

                                        <td className="align-top whitespace-normal text-xs">
                                            <p>{formatDate(row.startDate)}</p>
                                            <p>→ {formatDate(row.endDate)}</p>
                                            <p className="mt-1">{row.hourFrom}–{row.hourTo}</p>
                                            <p className="mt-2">
                                                {row.branchMode === "all"
                                                    ? "Toàn chuỗi"
                                                    : `${row.branchMode === "exclude" ? "Trừ " : ""}${row.branchIds.join(", ") || "Không có CN"}`}
                                            </p>
                                            <p className="mt-1">
                                                {row.channel === "all"
                                                    ? "Mọi kênh"
                                                    : channelLabels[row.channel]}
                                            </p>
                                            <p>
                                                {row.shift === "all"
                                                    ? "Mọi ca"
                                                    : shiftLabels[row.shift]}
                                            </p>
                                        </td>

                                        {isChainAdmin && (
                                            <td className="align-top">
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-sm"
                                                        title={`Sửa ${row.code}`}
                                                        aria-label={`Sửa ${row.code}`}
                                                        disabled={saving}
                                                        onClick={() => openEdit(row)}
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-sm"
                                                        title={
                                                            row.status === "active" || row.status === "scheduled"
                                                                ? "Dừng chương trình"
                                                                : "Kích hoạt chương trình"
                                                        }
                                                        aria-label={`Đổi trạng thái ${row.code}`}
                                                        disabled={saving}
                                                        onClick={() => void togglePromotionStatus(row.id)}
                                                    >
                                                        {row.status === "active" || row.status === "scheduled"
                                                            ? "Ⅱ"
                                                            : "▶"}
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </DataTable>
>>>>>>> Stashed changes
            </section>

            {/* Modal Tạo chương trình khuyến mãi mới */}
            <Modal
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title={editing ? "Sửa chương trình khuyến mãi" : "Tạo chương trình khuyến mãi mới"}
                size="2xl"
                footer={
                    <div className="flex items-center justify-between w-full flex-wrap gap-2">
                        <button
                            type="button"
                            className="btn btn-secondary h-10 text-xs"
                            onClick={() => setForm(createForm())}
                        >
                            Nhập lại dữ liệu
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="btn btn-ghost h-10 text-xs"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !isChainAdmin || !!dataError}
                                form="promotion-create-form"
                                className="btn btn-primary h-10 text-xs"
                            >
                                Lưu chương trình
                            </button>
                        </div>
                    </div>
                }
            >
                <form id="promotion-create-form" onSubmit={saveDraft} className="space-y-4">
                    {/* Phần 1: Thông tin & Thời gian */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                            <h3 className="font-bold text-sm mb-3 text-[var(--heading-color)]">1. Thông tin chương trình</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <PromotionInput
                                    id="promo-name"
                                    label="Tên chương trình *"
                                    wrapperClassName="sm:col-span-2"
                                    maxLength={120}
                                    required
                                    placeholder="Ví dụ: Mua 2 ly tặng trân châu hoàng kim"
                                    value={form.name}
                                    onChange={(event) => updateForm("name", event.target.value)}
                                />
                                <PromotionInput
                                    id="promo-code"
                                    label="Mã chương trình"
                                    placeholder="Ví dụ: KM-004"
                                    value={form.code}
                                    onChange={(event) => updateForm("code", event.target.value)}
                                />
                                <PromotionInput id="promo-version" label="Phiên bản" value={String(editing?.version ?? 1)} readOnly />
                                <div className="sm:col-span-2">
                                    <label className="form-label" htmlFor="promo-description">
                                        Mô tả và điều kiện áp dụng
                                    </label>
                                    <textarea
                                        id="promo-description"
                                        className="form-input form-textarea w-full text-xs"
                                        rows={2}
                                        placeholder="Điều kiện chi tiết, ghi chú phục vụ cho thu ngân và pha chế..."
                                        value={form.description}
                                        onChange={(event) => updateForm("description", event.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-sm text-[var(--heading-color)]">2. Thời gian áp dụng</h3>
                                <span className="text-xs text-[var(--muted)]">Giờ Việt Nam (UTC+7)</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <PromotionInput
                                    id="promo-start"
                                    label="Ngày bắt đầu *"
                                    placeholder="dd/MM/yyyy"
                                    maxLength={10}
                                    required
                                    value={form.startDate}
                                    onChange={(event) => updateForm("startDate", event.target.value)}
                                />
                                <PromotionInput
                                    id="promo-end"
                                    label="Ngày kết thúc *"
                                    placeholder="dd/MM/yyyy"
                                    maxLength={10}
                                    required
                                    value={form.endDate}
                                    onChange={(event) => updateForm("endDate", event.target.value)}
                                />
                                <PromotionInput
                                    id="promo-hour-from"
                                    label="Từ giờ *"
                                    placeholder="HH:mm"
                                    maxLength={5}
                                    required
                                    value={form.hourFrom}
                                    onChange={(event) => updateForm("hourFrom", event.target.value)}
                                />
                                <PromotionInput
                                    id="promo-hour-to"
                                    label="Đến giờ *"
                                    placeholder="HH:mm"
                                    maxLength={5}
                                    required
                                    value={form.hourTo}
                                    onChange={(event) => updateForm("hourTo", event.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Phần 2: Phạm vi áp dụng (Kênh, ca & chi nhánh) */}
                    <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                        <h3 className="font-bold text-sm mb-3 text-[var(--heading-color)]">3. Phạm vi & Kênh bán</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                            <div>
                                <label className="form-label" htmlFor="promo-channel">Kênh bán</label>
                                <select
                                    id="promo-channel"
                                    className="form-input form-select w-full h-10 text-xs"
                                    value={form.channel}
                                    onChange={(event) => {
                                        if (isChannel(event.target.value)) {
                                            updateForm("channel", event.target.value);
                                        }
                                    }}
                                >
                                    <option value="all">Tất cả kênh</option>
                                    {Object.entries(channelLabels).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="form-label" htmlFor="promo-shift">Ca áp dụng</label>
                                <select
                                    id="promo-shift"
                                    className="form-input form-select w-full h-10 text-xs"
                                    value={form.shift}
                                    onChange={(event) => {
                                        if (isShift(event.target.value)) {
                                            updateForm("shift", event.target.value);
                                        }
                                    }}
                                >
                                    <option value="all">Tất cả ca</option>
                                    {Object.entries(shiftLabels).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="form-label" htmlFor="promo-branch-mode">Phương thức phân bổ</label>
                                <select
                                    id="promo-branch-mode"
                                    className="form-input form-select w-full h-10 text-xs"
                                    value={form.branchMode}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        if (value === "all" || value === "include" || value === "exclude") {
                                            updateForm("branchMode", value);
                                        }
                                    }}
                                >
                                    <option value="all">Toàn chuỗi</option>
                                    <option value="include">Áp dụng tại các chi nhánh chọn</option>
                                    <option value="exclude">Loại trừ các chi nhánh chọn</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                                <span className="text-xs font-semibold text-[var(--text)]">
                                    Chi nhánh áp dụng ({form.branchIds.length}/{branches.length})
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm text-[11px] h-7 px-2"
                                        onClick={() => updateForm("branchIds", branches.map((branch) => branch.id))}
                                    >
                                        Chọn tất cả
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm text-[11px] h-7 px-2"
                                        onClick={() => updateForm("branchIds", [])}
                                    >
                                        Bỏ chọn
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border border-[var(--border)] rounded-lg bg-[var(--surface)]">
                                {branches.map((branch) => (
                                    <label
                                        key={branch.id}
                                        className="flex items-center gap-2 p-1.5 text-xs rounded hover:bg-[var(--background)] cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            className="w-3.5 h-3.5 accent-[var(--primary)]"
                                            checked={form.branchIds.includes(branch.id)}
                                            onChange={() => toggleBranch(branch.id)}
                                        />
                                        <span className="truncate">{branch.id} · {branch.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Phần 3: Món & Ngân sách */}
                    <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                        <h3 className="font-bold text-sm mb-3 text-[var(--heading-color)]">4. Món áp dụng, Ngân sách & Giới hạn</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                                <label className="form-label" htmlFor="promo-product">Món áp dụng</label>
                                <select
                                    id="promo-product"
                                    className="form-input form-select w-full h-10 text-xs"
                                    value={form.productId}
                                    onChange={(event) => updateForm("productId", event.target.value)}
                                >
                                    <option value="">Tất cả món trong phạm vi nhóm đã chọn</option>
                                    {promotionProducts.map((product) => (
                                        <option key={product.id} value={product.id}>{product.name}</option>
                                    ))}
                                </select>
                            </div>

                            <PromotionInput
                                id="promo-min-quantity"
                                label="Số ly tối thiểu *"
                                type="number"
                                min="1"
                                step="1"
                                required
                                value={form.minQuantity}
                                onChange={(event) => updateForm("minQuantity", event.target.value)}
                            />

                            <PromotionInput
                                id="promo-benefit"
                                label="Nội dung ưu đãi *"
                                required
                                placeholder="Ví dụ: Tặng 1 phần trân châu hoàng kim"
                                value={form.benefit}
                                onChange={(event) => updateForm("benefit", event.target.value)}
                            />

                            <PromotionInput
                                id="promo-gift-code"
                                label="SKU quà cũ (xóa để kích hoạt ưu đãi có cấu trúc)"
                                placeholder="Mã topping hoặc món phụ"
                                value={form.giftProductId}
                                onChange={(event) => updateForm("giftProductId", event.target.value)}
                            />

                            <PromotionInput
                                id="promo-budget"
                                label="Ngân sách tối đa (đ) *"
                                type="number"
                                min="0"
                                step="1000"
                                required
                                value={form.budget}
                                onChange={(event) => updateForm("budget", event.target.value)}
                            />

                            <PromotionInput
                                id="promo-limit"
                                label="Giới hạn lượt sử dụng *"
                                type="number"
                                min="1"
                                step="1"
                                required
                                value={form.usageLimit}
                                onChange={(event) => updateForm("usageLimit", event.target.value)}
                            />
                        </div>

                    <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                        <h3 className="font-bold text-sm mb-3">
                            Quy định, mức ưu đãi & Ràng buộc
                        </h3>

                        <div className="flex flex-wrap gap-2 mb-3">
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                    updateForm("naturalRuleText", "Áp dụng cho 100 lượt đến trước mỗi ngày");
                                    updateForm("usageLimit", "100");
                                    updateForm("usageScope", "daily");
                                }}
                            >
                                100 lượt đến trước mỗi ngày
                            </button>

                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                    updateForm("naturalRuleText", "50 lượt đầu tiên tại mỗi chi nhánh");
                                    updateForm("usageLimit", "50");
                                    updateForm("usageScope", "branch");
                                }}
                            >
                                50 lượt mỗi chi nhánh
                            </button>

                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                    updateForm("naturalRuleText", "Giới hạn 200 lượt trong khung giờ vàng của chương trình");
                                    updateForm("usageLimit", "200");
                                    updateForm("usageScope", "chain");
                                }}
                            >
                                200 lượt giờ vàng
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                                updateForm("oncePerMember", true);
                                updateForm("naturalRuleText", "Tối đa một lượt mỗi SĐT hội viên");
                            }}>1 lượt mỗi SĐT hội viên</button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                                updateForm("budget", "10000000");
                                updateForm("usageLimit", "200");
                                updateForm("usageScope", "chain");
                                updateForm("naturalRuleText", "Dừng khi hết 10.000.000 ₫ hoặc đủ 200 lượt");
                            }}>10 triệu ₫ hoặc 200 lượt</button>
                        </div>

                        <PromotionInput
                            id="promo-natural-rule"
                            label="Quy định dễ hiểu *"
                            required
                            value={form.naturalRuleText}
                            onChange={event => updateForm("naturalRuleText", event.target.value)}
                        />

                        <p className="text-xs text-[var(--muted)] mt-2 mb-3">
                            Trần tính theo lượt checkout, không xác minh số người duy nhất.
                            Lượt theo ngày được tính theo giờ Việt Nam.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <label className="form-label">
                                Loại ưu đãi
                                <select
                                    className="form-input form-select w-full"
                                    value={form.discountType}
                                    onChange={event => {
                                        const value = event.target.value;
                                        if (
                                            value === "none" ||
                                            value === "percent" ||
                                            value === "fixed" ||
                                            value === "buy_x_get_y"
                                        ) updateForm("discountType", value);
                                    }}
                                >
                                    <option value="none">Chưa cấu hình</option>
                                    <option value="percent">Giảm phần trăm</option>
                                    <option value="fixed">Giảm số tiền / đơn</option>
                                    <option value="buy_x_get_y">Mua X tặng Y trong giỏ</option>
                                </select>
                            </label>

                            <PromotionInput
                                id="promo-discount-value"
                                label={form.discountType === "percent" ? "Mức giảm (%)" : "Mức giảm (₫ / đơn)"}
                                type="number"
                                min="0"
                                max={form.discountType === "percent" ? "100" : undefined}
                                step="1"
                                disabled={form.discountType === "buy_x_get_y"}
                                value={form.discountValue}
                                onChange={event => updateForm("discountValue", event.target.value)}
                            />

                            <label className="form-label">
                                Nhóm món
                                <select
                                    className="form-input form-select w-full"
                                    value={form.productCategory}
                                    onChange={event => updateForm("productCategory", event.target.value)}
                                >
                                    <option value="">Tất cả nhóm</option>
                                    {[...new Set(products.map(product => product.category))].map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </label>

                            {form.discountType === "buy_x_get_y" && (
                                <>
                                    <PromotionInput
                                        id="promo-buy-quantity"
                                        label="Số ly mua X"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={form.buyQuantity}
                                        onChange={event => updateForm("buyQuantity", event.target.value)}
                                    />
                                    <PromotionInput
                                        id="promo-gift-quantity"
                                        label="Số ly tặng Y"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={form.giftQuantity}
                                        onChange={event => updateForm("giftQuantity", event.target.value)}
                                    />
                                </>
                            )}

                            <label className="form-label">
                                Phạm vi trần lượt
                                <select
                                    className="form-input form-select w-full"
                                    value={form.usageScope}
                                    onChange={event => {
                                        const value = event.target.value;
                                        if (value === "chain" || value === "branch" || value === "daily") {
                                            updateForm("usageScope", value);
                                        }
                                    }}
                                >
                                    <option value="chain">Tổng toàn chương trình</option>
                                    <option value="branch">Riêng tại mỗi chi nhánh</option>
                                    <option value="daily">Mỗi ngày (giờ Việt Nam)</option>
                                </select>
                            </label>

                            <label className="form-label">
                                <input type="checkbox" checked={form.oncePerMember}
                                    onChange={event => updateForm("oncePerMember", event.target.checked)} />
                                {" "}Tối đa một lượt mỗi SĐT hội viên
                            </label>
                            <PromotionInput
                                id="promo-priority"
                                label="Ưu tiên (1–5, số lớn ưu tiên trước)"
                                type="number"
                                min="1"
                                max="5"
                                step="1"
                                value={form.priority}
                                onChange={event => updateForm("priority", event.target.value)}
                            />
                        </div>

                        <label className="flex items-center gap-2 mt-3 text-sm">
                            <input
                                type="checkbox"
                                checked={form.stackWithMemberTier}
                                onChange={event => updateForm("stackWithMemberTier", event.target.checked)}
                            />
                            Cộng dồn với giảm hạng thành viên
                        </label>

                        <p className="mt-3 text-xs font-semibold">
                            Tự động dừng khi hết thời gian HOẶC đủ lượt HOẶC hết ngân sách.
                        </p>

                        {conflictCodes.length > 0 && (
                            <div role="status" className="mt-3 p-3 rounded-lg bg-amber-50 text-amber-900 text-sm">
                                Có phạm vi món, thời gian, kênh và chi nhánh giao nhau với:
                                {" "}<strong>{conflictCodes.join(", ")}</strong>.
                                Kiểm tra quy tắc cộng dồn và ưu tiên trước khi kích hoạt.
                            </div>
                        )}
                    </div>
                        <label className="flex items-center gap-2.5 mt-3 text-xs font-medium cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 accent-[var(--primary)]"
                                checked={form.stackable}
                                onChange={(event) => updateForm("stackable", event.target.checked)}
                            />
                            <span>Cho phép áp dụng cộng dồn với mã giảm giá/voucher khác</span>
                        </label>
                    </div>
                </form>
            </Modal>
        </>
    );
}