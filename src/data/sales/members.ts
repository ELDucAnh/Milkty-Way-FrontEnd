const SAMPLE_MEMBERS: Record<string, { name: string; tier: string; points: number; discount: number; nextProgression: string }> = {
    "0903123456": { name: "Nguyễn An", tier: "Hạng VIP", points: 1250, discount: 10, nextProgression: "Đã đạt Hạng VIP cao nhất (Giảm 10%)" },
    "0908123456": { name: "Trần Văn An", tier: "Hạng Vàng", points: 850, discount: 5, nextProgression: "Cần 150 điểm nữa lên VIP" },
    "0909555444": { name: "Nguyễn Thị Mai", tier: "Hạng Vàng", points: 680, discount: 5, nextProgression: "Cần 320 điểm nữa lên VIP" },
    "0912345678": { name: "Trần Bình", tier: "Hạng Bạc", points: 420, discount: 0, nextProgression: "Cần 80 điểm nữa lên Hạng Vàng" },
    "0933222111": { name: "Hoàng Hải Đăng", tier: "Hạng VIP", points: 1820, discount: 10, nextProgression: "Đã đạt Hạng VIP cao nhất (Giảm 10%)" },
    "0988777666": { name: "Lê Minh Tuấn", tier: "Hạng Thành Viên", points: 150, discount: 0, nextProgression: "Cần 50 điểm nữa lên Hạng Bạc" },
};


export function findPosMember(phone = "") {
  return SAMPLE_MEMBERS[phone.replace(/[ .()-]/g, "")];
}
