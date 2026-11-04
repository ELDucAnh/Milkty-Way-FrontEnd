import { useRef, useState } from "react";
import type { FormEvent, InputHTMLAttributes } from "react";
import Badge from "../../components/common/Badge";
import type { BadgeVariant } from "../../components/common/Badge";
import DataTable from "../../components/common/DataTable";
import type { DataTableColumn } from "../../components/common/DataTable";
import { useToast } from "../../components/common/useToast";
import {
    branches,
    channelLabels,
    formatCurrency,
    formatDate,
    parseVietnameseDate,
    SalesPageHeader,
    shiftLabels,
} from "./sales-support";
import type { SalesChannel, SalesShift } from "./sales-support";

type PromotionStatus = "draft" | "scheduled" | "active" | "ended";
type PromotionChannel = SalesChannel | "all";
type PromotionShift = SalesShift | "all";

interface Promotion {
    id: string;
    code: string;
    name: string;
    version: number;
    branchIds: readonly string[];
    branchMode: "include" | "exclude";
    channel: PromotionChannel;
    shift: PromotionShift;
    startDate: string;
    endDate: string;
    hourFrom: string;
    hourTo: string;
    budget: number;
    usageLimit: number;
    status: PromotionStatus;
    description: string;
    productId: string | null;
    minQuantity: number | null;
    benefit: string | null;
    giftProductId: string | null;
    stackable: boolean | null;
}

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
    branchMode: "include" | "exclude";
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

const initialPromotions: readonly Promotion[] = [
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

const emptyFilters: PromotionFilters = {
    search: "",
    status: "",
    channel: "",
};

const promotionProducts = [
    { id: "TS01", name: "Trà sữa trân châu" },
    { id: "TS02", name: "Trà sữa ô long" },
    { id: "TT01", name: "Trà đào" },
    { id: "TT02", name: "Trà vải" },
] as const;

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
    const editorRef = useRef<HTMLElement>(null);
    const listRef = useRef<HTMLElement>(null);
    const [rows, setRows] = useState<Promotion[]>(() => [...initialPromotions]);
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
    const visibleRows = rows.filter((row) =>
        `${row.code} ${row.name}`.toLocaleLowerCase("vi-VN").includes(query) &&
        (!filters.status || row.status === filters.status) &&
        (!filters.channel || row.channel === "all" || row.channel === filters.channel)
    );

    function saveDraft(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const startDate = parseVietnameseDate(form.startDate);
        const endDate = parseVietnameseDate(form.endDate);
        const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
        const budget = Number(form.budget);
        const usageLimit = Number(form.usageLimit);
        const minQuantity = Number(form.minQuantity);

        if (!form.name.trim() || !form.benefit.trim()) {
            toast.warning("Nhập tên chương trình và nội dung ưu đãi.");
            return;
        }

        if (!startDate || !endDate || startDate > endDate) {
            toast.warning("Khoảng ngày không hợp lệ. Vui lòng nhập dd/MM/yyyy.");
            return;
        }

        if (
            !timePattern.test(form.hourFrom) ||
            !timePattern.test(form.hourTo) ||
            form.hourFrom >= form.hourTo
        ) {
            toast.warning("Giờ bắt đầu phải trước giờ kết thúc trong cùng ngày.");
            return;
        }

        const appliedBranchCount = form.branchMode === "include"
            ? form.branchIds.length
            : branches.length - form.branchIds.length;

        if (appliedBranchCount === 0) {
            toast.warning("Chương trình phải áp dụng tại ít nhất một chi nhánh.");
            return;
        }

        if (
            !promotionProducts.some((product) => product.id === form.productId) ||
            form.budget.trim() === "" ||
            form.usageLimit.trim() === "" ||
            form.minQuantity.trim() === "" ||
            !Number.isSafeInteger(budget) || budget < 0 ||
            !Number.isSafeInteger(usageLimit) || usageLimit < 1 ||
            !Number.isSafeInteger(minQuantity) || minQuantity < 1
        ) {
            toast.warning("Kiểm tra món, số ly tối thiểu, ngân sách và giới hạn lượt.");
            return;
        }

        const id = crypto.randomUUID();
        const code = form.code.trim().toUpperCase() || `KM-MP-${id}`;

        if (rows.some((row) => row.code.toUpperCase() === code)) {
            toast.warning("Mã chương trình đã tồn tại.");
            return;
        }

        const promotion: Promotion = {
            id,
            code,
            name: form.name.trim(),
            version: 1,
            branchIds: [...form.branchIds],
            branchMode: form.branchMode,
            channel: form.channel,
            shift: form.shift,
            startDate,
            endDate,
            hourFrom: form.hourFrom,
            hourTo: form.hourTo,
            budget,
            usageLimit,
            status: "draft",
            description: form.description.trim(),
            productId: form.productId,
            minQuantity,
            benefit: form.benefit.trim(),
            giftProductId: form.giftProductId.trim() || null,
            stackable: form.stackable,
        };

        setRows((current) => [promotion, ...current]);
        setForm(createForm());
        setFilters(emptyFilters);
        setDraftFilters(emptyFilters);
        toast.success("Đã lưu bản nháp.");
        listRef.current?.scrollIntoView({ block: "start" });
    }

    const columns: readonly DataTableColumn<Promotion>[] = [
        {
            id: "name",
            header: "Chương trình",
            className: "align-top",
            render: (row) => (
                <>
                    <div className="font-semibold name-ellipsis" title={row.name}>
                        {row.name}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                        {row.code} · Phiên bản {row.version}
                    </div>
                </>
            ),
        },
        {
            id: "scope",
            header: "Phạm vi",
            className: "align-top",
            render: (row) => {
                const allBranches =
                    (row.branchMode === "include" && row.branchIds.length === branches.length) ||
                    (row.branchMode === "exclude" && row.branchIds.length === 0);

                return (
                    <>
                        <div className="text-sm">
                            {allBranches ? "Toàn chuỗi"
                                : `${row.branchMode === "exclude" ? "Loại trừ: " : ""}${row.branchIds.join(", ")}`}
                        </div>
                        <div className="text-xs text-[var(--muted)] mt-1">
                            {row.channel === "all" ? "Tất cả kênh" : channelLabels[row.channel]}
                            {" · "}
                            {row.shift === "all" ? "Tất cả ca" : shiftLabels[row.shift]}
                        </div>
                    </>
                );
            },
        },
        {
            id: "time",
            header: "Thời gian áp dụng",
            className: "align-top whitespace-nowrap",
            render: (row) => (
                <>
                    <div>{formatDate(row.startDate)} – {formatDate(row.endDate)}</div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                        {row.hourFrom}–{row.hourTo}
                    </div>
                </>
            ),
        },
        {
            id: "budget",
            header: "Ngân sách / Lượt",
            className: "align-top whitespace-nowrap",
            render: (row) => (
                <>
                    <div className="font-semibold">{formatCurrency(row.budget)}</div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                        Tối đa {row.usageLimit.toLocaleString("vi-VN")} lượt
                    </div>
                </>
            ),
        },
        {
            id: "status",
            header: "Trạng thái",
            render: (row) => (
                <Badge variant={statusVariants[row.status]}>{statusLabels[row.status]}</Badge>
            ),
        },
    ];

    return (
        <>
            <SalesPageHeader
                title="Chương trình khuyến mãi"
                breadcrumb="Khuyến mãi"
                parent={{ label: "", to: "" }}
                description="Quản lý ưu đãi, thời gian và phạm vi áp dụng."
                actions={
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => editorRef.current?.scrollIntoView({ block: "start" })}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                        </svg> Tạo chương trình
                    </button>
                }
            />

            <section ref={listRef} className="card mb-6" aria-labelledby="promotion-list-title">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <h2 id="promotion-list-title" className="card-title">Danh sách chương trình</h2>
                    <Badge variant="gray">{rows.length} chương trình</Badge>
                </div>

                <form onSubmit={(event) => {
                    event.preventDefault();
                    setFilters({ ...draftFilters });
                }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <PromotionInput
                            id="promotion-search"
                            label="Tìm chương trình"
                            wrapperClassName="sm:col-span-2 min-w-0"
                            type="search"
                            placeholder="Nhập mã hoặc tên chương trình"
                            value={draftFilters.search}
                            onChange={(event) => setDraftFilters((current) => ({
                                ...current, search: event.target.value,
                            }))}
                        />

                        <div className="min-w-0">
                            <label className="form-label" htmlFor="promotion-status">Trạng thái</label>
                            <select
                                id="promotion-status"
                                className="form-input form-select w-full h-11"
                                value={draftFilters.status}
                                onChange={(event) => setDraftFilters((current) => ({
                                    ...current, status: event.target.value,
                                }))}
                            >
                                <option value="">Tất cả trạng thái</option>
                                {Object.entries(statusLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="min-w-0">
                            <label className="form-label" htmlFor="promotion-channel">Kênh bán</label>
                            <select
                                id="promotion-channel"
                                className="form-input form-select w-full h-11"
                                value={draftFilters.channel}
                                onChange={(event) => setDraftFilters((current) => ({
                                    ...current, channel: event.target.value,
                                }))}
                            >
                                <option value="">Tất cả kênh</option>
                                {Object.entries(channelLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4">
                        <button type="submit" className="btn btn-primary h-11">Áp dụng</button>
                        <button
                            type="button"
                            className="btn btn-secondary h-11"
                            onClick={() => {
                                setDraftFilters(emptyFilters);
                                setFilters(emptyFilters);
                            }}
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                </form>

                <div className="mt-5">
                    <DataTable<Promotion> pagination={false}
                        key={JSON.stringify(filters)}
                        columns={columns}
                        data={visibleRows}
                        rowKey={(row) => row.id}
                        caption="Danh sách chương trình khuyến mãi"
                    />
                </div>
            </section>

            <section ref={editorRef} id="promotion-editor" aria-labelledby="promotion-editor-title">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <h2 id="promotion-editor-title" className="card-title">Tạo chương trình mới</h2>
                    <Badge variant="gray">Bản nháp</Badge>
                </div>

                <form onSubmit={saveDraft}>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                        <div className="min-w-0 flex flex-col gap-4">
                            <section className="card">
                                <h3 className="card-title mb-4">Thông tin chương trình</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <PromotionInput
                                        id="promo-name"
                                        label="Tên chương trình *"
                                        wrapperClassName="sm:col-span-2"
                                        maxLength={120}
                                        required
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
                                    <PromotionInput id="promo-version" label="Phiên bản" value="1" readOnly />
                                    <div className="sm:col-span-2">
                                        <label className="form-label" htmlFor="promo-description">
                                            Mô tả và điều kiện
                                        </label>
                                        <textarea
                                            id="promo-description"
                                            className="form-input form-textarea w-full"
                                            rows={2}
                                            value={form.description}
                                            onChange={(event) => updateForm("description", event.target.value)}
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="card">
                                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                                    <h3 className="card-title">Thời gian áp dụng</h3>
                                    <span className="text-xs text-[var(--muted)]">UTC+7</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            </section>
                        </div>

                        <section className="card min-w-0">
                            <h3 className="card-title mb-4">Phạm vi áp dụng</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label" htmlFor="promo-channel">Kênh bán</label>
                                    <select
                                        id="promo-channel"
                                        className="form-input form-select w-full h-11"
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
                                        className="form-input form-select w-full h-11"
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
                            </div>

                            <fieldset className="min-w-0 mt-5">
                                <legend className="form-label">Chi nhánh áp dụng</legend>
                                <label className="sr-only" htmlFor="promo-branch-mode">
                                    Cách áp dụng danh sách chi nhánh
                                </label>
                                <select
                                    id="promo-branch-mode"
                                    className="form-input form-select w-full h-11"
                                    value={form.branchMode}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        if (value === "include" || value === "exclude") {
                                            updateForm("branchMode", value);
                                        }
                                    }}
                                >
                                    <option value="include">Áp dụng tại chi nhánh được chọn</option>
                                    <option value="exclude">Loại trừ chi nhánh được chọn</option>
                                </select>

                                <div className="flex items-center justify-between flex-wrap gap-3 mt-4 mb-3">
                                    <span className="text-sm font-semibold">Danh sách chi nhánh</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => updateForm("branchIds", branches.map((branch) => branch.id))}
                                        >
                                            Chọn tất cả
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => updateForm("branchIds", [])}
                                        >
                                            Bỏ chọn
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {branches.map((branch) => (
                                        <label
                                            key={branch.id}
                                            className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--background)]"
                                        >
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 shrink-0 accent-[var(--info)]"
                                                checked={form.branchIds.includes(branch.id)}
                                                onChange={() => toggleBranch(branch.id)}
                                            />
                                            <span className="text-sm">{branch.id} — {branch.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        </section>
                    </div>

                    <section className="card w-full mt-4">
                        <h3 className="card-title mb-4">Ưu đãi và giới hạn</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label" htmlFor="promo-product">Món áp dụng *</label>
                                <select
                                    id="promo-product"
                                    className="form-input form-select w-full h-11"
                                    required
                                    value={form.productId}
                                    onChange={(event) => updateForm("productId", event.target.value)}
                                >
                                    <option value="">Chọn món</option>
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
                                wrapperClassName="sm:col-span-2"
                                required
                                placeholder="Ví dụ: Tặng 1 phần trân châu"
                                value={form.benefit}
                                onChange={(event) => updateForm("benefit", event.target.value)}
                            />
                            <PromotionInput
                                id="promo-gift-code"
                                label="Mã món hoặc món thêm quà tặng"
                                wrapperClassName="sm:col-span-2"
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

                        <label className="flex items-start gap-3 mt-4 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 mt-1 shrink-0 accent-[var(--info)]"
                                checked={form.stackable}
                                onChange={(event) => updateForm("stackable", event.target.checked)}
                            />
                            <span>Cho phép cộng dồn với ưu đãi khác</span>
                        </label>
                    </section>

                    <div className="card mt-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-secondary h-11"
                                    onClick={() => setForm(createForm())}
                                >
                                    Nhập lại
                                </button>
                                <button type="submit" className="btn btn-primary h-11">
                                    Lưu bản nháp
                                </button>
                            </div>
                        </div>
                        
                    </div>
                </form>
            </section>
        </>
    );
}