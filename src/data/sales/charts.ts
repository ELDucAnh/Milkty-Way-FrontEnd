export type TimeUnit = "hour" | "day" | "week" | "month" | "quarter";

export const TIME_UNIT_META: Record<
  TimeUnit,
  { label: string; axisX: string; revenueAxisY: string; customerAxisY: string; cupAxisY: string }
> = {
  hour: {
    label: "Giờ",
    axisX: "Khung giờ trong ngày",
    revenueAxisY: "Triệu đồng / Giờ",
    customerAxisY: "Lượt khách / Giờ",
    cupAxisY: "Số ly / Giờ",
  },
  day: {
    label: "Ngày",
    axisX: "Ngày trong tuần",
    revenueAxisY: "Triệu đồng / Ngày",
    customerAxisY: "Lượt khách / Ngày",
    cupAxisY: "Số ly / Ngày",
  },
  week: {
    label: "Tuần",
    axisX: "Tuần trong tháng",
    revenueAxisY: "Triệu đồng / Tuần",
    customerAxisY: "Lượt khách / Tuần",
    cupAxisY: "Số ly / Tuần",
  },
  month: {
    label: "Tháng",
    axisX: "Tháng trong năm",
    revenueAxisY: "Triệu đồng / Tháng",
    customerAxisY: "Lượt khách / Tháng",
    cupAxisY: "Số ly / Tháng",
  },
  quarter: {
    label: "Quý",
    axisX: "Quý trong năm",
    revenueAxisY: "Triệu đồng / Quý",
    customerAxisY: "Lượt khách / Quý",
    cupAxisY: "Số ly / Quý",
  },
};

export const CHART_LABELS: Record<TimeUnit, readonly string[]> = {
  hour: ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00"],
  day: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  week: ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"],
  month: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
  quarter: ["Quý 1", "Quý 2", "Quý 3", "Quý 4"],
};

// Doanh thu theo đơn vị Triệu VNĐ (toàn chuỗi)
export const CHAIN_REVENUE_SERIES: Record<TimeUnit, readonly number[]> = {
  hour: [4.2, 6.8, 12.6, 10.4, 8.9, 13.8, 16.5, 9.2],
  day: [52.4, 48.6, 55.2, 58.9, 64.3, 82.5, 79.1],
  week: [368.0, 412.5, 438.2, 464.0],
  month: [1240, 1185, 1390, 1345, 1510, 1620, 1734, 1680, 1590, 1745, 1842, 1795],
  quarter: [3815, 4475, 5004, 5382],
};

// Số ly bán ra (toàn chuỗi)
export const CHAIN_CUPS_SERIES: Record<TimeUnit, readonly number[]> = {
  hour: [95, 152, 286, 240, 198, 315, 378, 205],
  day: [1180, 1090, 1250, 1320, 1460, 1890, 1790],
  week: [8420, 9380, 9910, 10540],
  month: [28400, 27100, 31800, 30900, 34600, 37200, 39800, 38600, 36500, 40100, 42850, 41200],
  quarter: [87300, 102700, 114900, 124150],
};

// Lượng khách hàng phân tách theo chi nhánh đại diện + toàn chuỗi
export interface BranchTrafficProfile {
  branchId: string;
  branchName: string;
  weight: number;
  memberRate: string;
  peakWindow: string;
  growthPct: string;
  color: string;
}

export const BRANCH_TRAFFIC_PROFILES: readonly BranchTrafficProfile[] = [
  { branchId: "CN01", branchName: "CN01 — Bến Nghé (Q.1)", weight: 0.22, memberRate: "68% hội viên", peakWindow: "11:00–13:00", growthPct: "+14.2%", color: "#10B981" },
  { branchId: "CN05", branchName: "CN05 — Hàng Xanh (Bình Thạnh)", weight: 0.19, memberRate: "61% hội viên", peakWindow: "18:00–20:00", growthPct: "+11.8%", color: "#3B82F6" },
  { branchId: "CN02", branchName: "CN02 — Bàn Cờ (Q.3)", weight: 0.14, memberRate: "57% hội viên", peakWindow: "12:00–13:30", growthPct: "+8.4%", color: "#8B5CF6" },
  { branchId: "CN08", branchName: "CN08 — Cityland (Gò Vấp)", weight: 0.13, memberRate: "54% hội viên", peakWindow: "19:00–21:00", growthPct: "+9.5%", color: "#F59E0B" },
];

export const CHAIN_CUSTOMER_SERIES: Record<TimeUnit, readonly number[]> = {
  hour: [74, 120, 224, 186, 152, 245, 294, 158],
  day: [890, 840, 960, 1015, 1140, 1460, 1385],
  week: [6480, 7210, 7690, 8150],
  month: [21800, 20900, 24400, 23800, 26500, 28400, 30400, 29600, 28100, 30900, 32900, 31600],
  quarter: [67100, 78700, 88100, 95400],
};

// Backward-compatible exports if anything still imports salesData/customerData
export const salesData = {
  monthly: [42500, 38900, 51200, 47300, 56800, 62100, 67347, 58400, 53200, 61800, 72000, 68500],
  weekly: [12400, 15200, 11800, 14600, 13900, 16200, 18400, 14100],
  daily: [2100, 1850, 2400, 2200, 2800, 3100, 2650],
  labels: {
    monthly: CHART_LABELS.month,
    weekly: ["T2", "T3", "T4", "T5", "T6", "T7", "CN", "T2"],
    daily: CHART_LABELS.day,
  },
};

export const customerData = {
  monthly: [120, 98, 145, 132, 178, 165, 203, 189, 142, 198, 221, 187],
  weekly: [28, 35, 22, 41, 38, 52, 45],
  labels: {
    monthly: CHART_LABELS.month,
    weekly: CHART_LABELS.day,
  },
};
