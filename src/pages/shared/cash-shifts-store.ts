import { isCashShiftAudit, type CashShiftAudit } from "./cash-shift-rules";
import { normalizeCounterId, counterLabel } from "../../utils/counters";
type ShiftStatus = "open" | "closing-requested" | "closed";

export interface CashShift {
    audit?: CashShiftAudit;
    id: string;
    branchId: string;
    counterId: string;
    counterName: string;
    openedByStaffId?: string;
    closeRequestedByStaffId?: string;
    staffName: string;
    openedAt: string;
    closedAt: string | null;
    openingCash: number;
    expectedCash: number | null;
    countedCash: number | null;
    recipientId: string | null;
    handoverNote: string;
    pendingOrders: readonly string[];
    status: ShiftStatus;
}

export const initialShifts: readonly CashShift[] = [
    {
        id: "CA-001",
        branchId: "CN01",
        counterId: "Q1",
        counterName: "Quầy 01",
        staffName: "Lê Quốc Tuấn Anh",
        openedByStaffId: "NV-POS-01",
        openedAt: "2026-10-28T07:00:00+07:00",
        closedAt: null,
        openingCash: 500000,
        expectedCash: null,
        countedCash: null,
        recipientId: null,
        handoverNote: "",
        pendingOrders: ["DH-00125 · Đang pha chế"],
        status: "open",
    },
    {
        id: "CA-005",
        branchId: "CN05",
        counterId: "Q1",
        counterName: "Quầy 01",
        staffName: "Thu ngân CN05",
        openedByStaffId: "NV-POS-CN05",
        openedAt: "2026-10-28T14:00:00+07:00",
        closedAt: null,
        openingCash: 1500000,
        expectedCash: null,
        countedCash: null,
        recipientId: null,
        handoverNote: "",
        pendingOrders: [],
        status: "open",
    },
    {
        id: "CA-CN05-BG", branchId: "CN05", counterId: "Q1", counterName: "Quầy 01",
        staffName: "Thu ngân CN05", openedByStaffId: "NV-POS-CN05",
        openedAt: "2026-10-27T06:30:00+07:00", closedAt: "2026-10-27T14:00:00+07:00",
        status: "closed", openingCash: 500000, expectedCash: 500000, countedCash: 500000,
        closeRequestedByStaffId: "NV-POS-B-CN05", recipientId: "NV-QL-CN05",
        handoverNote: "Bàn giao lúc 11:30 do người mở ca có việc đột xuất. Hai người đã kiểm quỹ.",
        pendingOrders: [],
        audit: { version: 1, handover: {
            first: { staffId: "NV-POS-B-CN05", name: "Ca trưởng CN05", signedAt: "2026-10-27T13:55:00+07:00" },
            second: { staffId: "NV-QL-CN05", name: "Trần Thu Hà", signedAt: "2026-10-27T14:00:00+07:00" },
            differentCloserApproval: { staffId: "NV-QL-CN05", name: "Trần Thu Hà", signedAt: "2026-10-27T11:30:00+07:00" },
            confirmations: { cash: true, inventory: true, recount: false },
            inventorySource: "inventory-store", inventoryReference: "Biên bản mẫu CN05 ngày 27/10",
            inventory: [{ lotId: "lot-counter-cn05-milk", ingredientId: "ing-milk", ingredientName: "Bột kem béo sữa",
                lotCode: "SUA-260915", unit: "g", group: "A", theoretical: 2400, counted: 2400, recounted: null,
                reason: "", difference: 0, variancePercent: 0, initialBand: "pass", finalBand: "pass", recountRequired: false }],
            handoverReason: "Bàn giao giữa ca do việc đột xuất / ốm đau", cashSales: 0, cashDifference: 0,
        } },
    },
];

export const STORAGE_SHIFTS = "miltyway_shifts_v1";

function isCashAmount(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0
    );
}

function isNullableCash(value: unknown): value is number | null {
    return value === null || isCashAmount(value);
}

function isCashShift(value: unknown): value is CashShift {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return false;
    }

    const shift = value as Record<string, unknown>;

    return (
        typeof shift.id === "string" &&
        Boolean(shift.id.trim()) &&
        typeof shift.branchId === "string" &&
        Boolean(shift.branchId.trim()) &&
        typeof shift.counterId === "string" &&
        Boolean(shift.counterId.trim()) &&
        typeof shift.counterName === "string" &&
        typeof shift.staffName === "string" &&
        typeof shift.openedAt === "string" &&
        Number.isFinite(Date.parse(shift.openedAt)) &&
        (
            shift.closedAt === null ||
            (
                typeof shift.closedAt === "string" &&
                Number.isFinite(Date.parse(shift.closedAt))
            )
        ) &&
        isCashAmount(shift.openingCash) &&
        isNullableCash(shift.expectedCash) &&
        isNullableCash(shift.countedCash) &&
        (
            shift.recipientId === null ||
            typeof shift.recipientId === "string"
        ) &&
        typeof shift.handoverNote === "string" &&
        Array.isArray(shift.pendingOrders) &&
        shift.pendingOrders.every(item => typeof item === "string") &&
        (
            shift.status === "open" ||
            shift.status === "closing-requested" ||
            shift.status === "closed"
        ) &&
        (
            shift.openedByStaffId === undefined ||
            typeof shift.openedByStaffId === "string"
        ) &&
        (
            shift.closeRequestedByStaffId === undefined ||
            typeof shift.closeRequestedByStaffId === "string"
        ) && (shift.audit === undefined || isCashShiftAudit(shift.audit))
    );
}

/**
 * Giữ nguyên khóa cũ.
 *
 * Chỉ seed khi khóa chưa tồn tại.
 * [] là dữ liệu hợp lệ, không tự chèn lại ca mẫu.
 * Dữ liệu hỏng: ném lỗi, không âm thầm mở lại ca mẫu.
 */
export function loadCashShifts(): CashShift[] {
    const raw = localStorage.getItem(STORAGE_SHIFTS);

    const parsed: unknown =
        raw === null ? initialShifts : JSON.parse(raw);

    if (
        !Array.isArray(parsed) ||
        !parsed.every(isCashShift)
    ) {
        throw new Error(
            "Dữ liệu ca không hợp lệ. Không thể xác nhận trạng thái ca.",
        );
    }

    const ids = new Set<string>();

    return parsed.map(shift => {
        if (ids.has(shift.id)) {
            throw new Error(`Dữ liệu ca bị trùng mã ${shift.id}.`);
        }

        ids.add(shift.id);

        const counterId = normalizeCounterId(shift.counterId);

        return {
            ...shift,
            counterId,
            counterName: counterLabel(counterId),
            pendingOrders: [...shift.pendingOrders],
        };
    });
}
