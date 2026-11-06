import { salesBranches } from "./branches";

// Dữ liệu demo ngày 28/10/2026. Doanh thu hòa vốn = chi phí cố định / tỷ lệ biên đóng góp.
export const demoBranches = salesBranches.map((branch, index) => {
    const revenue = index === 0 ? 2000000 : index === 1 ? 2100000 : 3127000;
    const variableCost = revenue * 0.4;
    const fixedCost = 1500000;
    return {
        ...branch,
        revenue,
        cost: variableCost + fixedCost,
        breakEvenRevenue: fixedCost / 0.6,
        profit: revenue - variableCost - fixedCost,
    };
});

export const dashboardDemo = {
    revenue: demoBranches.reduce((sum, branch) => sum + branch.revenue, 0),
    cost: demoBranches.reduce((sum, branch) => sum + branch.cost, 0),
    onlineRevenue: 14148000,
    counterRevenue: 21222000,
    ingredientTypes: 24,
    incomingPurchaseOrders: 6,
    customers: 438,
    orders: 512,
    cancelledOrders: 4,
    returnedOrders: 7,
};
