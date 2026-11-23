"""Browser acceptance tests for the MilktyWay demo (npm run dev).

Install: python -m pip install -r scripts/requirements-e2e.txt
Browser: python -m playwright install chromium
Run: python -m pytest scripts/test_milktyway_e2e.py --tracing retain-on-failure
     --screenshot only-on-failure --junitxml=test-results/milktyway.xml

Each test uses a new browser context. The demo accounts and records created by
the tests live in that context. Run against a local instance of this frontend.
"""

import re
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

import pytest
from playwright.sync_api import expect


PASSWORD = "123456"
LOGIN_HEADING = "Đăng Nhập Hệ Thống"
USERS = {
    "owner": ("long.nh@milktyway.vn", "/dashboard", "Nguyễn Hoàng Long"),
    "manager": ("ha.tt@milktyway.vn", "/dashboard", "Trần Thu Hà"),
    "cashier": ("anh.lqt@milktyway.vn", "/sales/pos", "Lê Quốc Tuấn Anh"),
    "warehouse": ("khoa.vm@milktyway.vn", "/inventory/ingredients", "Vũ Minh Khoa"),
    "manager_cn01": ("ql.cn01@milktyway.vn", "/dashboard", "Quản lý CN01"),
}
ACCESS_ROLES = {"owner": "O", "manager": "M", "cashier": "C", "warehouse": "W", "guest": ""}

# Expected routes and permissions, based on the project's acceptance matrix.
# Keep these expectations independent of the app's runtime permission checks.
# Each row contains path, allowed roles, canonical URL, and visible page heading.
ROUTE_CASES = [
    ("/dashboard", "OM", None, "Chào mừng trở lại"),
    ("/sales", "OMC", None, "Quản lý đơn hàng đa kênh"),
    ("/sales/pos", "OC", None, "Bán hàng tại quầy (POS)"),
    ("/sales/returns", "OMC", None, "Khiếu nại và hoàn tiền"),
    ("/sales/shifts", "OMC", None, "Mở, đóng ca và bàn giao"),
    ("/sales/preparation", "OMC", None, "Hàng Đợi Pha Chế"),
    ("/sales/promotions", "OMCW", "/marketing/promotions", "Khuyến mãi & Voucher"),
    ("/customers", "O", None, "Khách hàng và hội viên"),
    ("/marketing", "OMCW", "/marketing/promotions", "Khuyến mãi & Voucher"),
    ("/marketing/promotions", "OMCW", None, "Khuyến mãi & Voucher"),
    ("/marketing/branch-promotions", "OMC", None, "Áp dụng khuyến mãi theo chi nhánh"),
    ("/inventory", "OMCW", "/inventory/products", "Menu đồ uống & topping"),
    ("/inventory/products", "OMCW", None, "Menu đồ uống & topping"),
    ("/inventory/products/new", "O", None, "Khai báo món & công thức"),
    ("/inventory/products/:id", "O", None, "Chi tiết món & công thức"),
    ("/inventory/add-product", "O", "/inventory/products/new", "Khai báo món & công thức"),
    ("/inventory/branches", "O", None, "Quản lý cửa hàng"),
    ("/inventory/categories", "O", None, "Nhóm món đồ uống"),
    ("/inventory/ingredients", "OMW", None, "Quản lý nguyên liệu"),
    ("/inventory/stock-adjustment", "OMW", None, "Kiểm kê & điều chỉnh"),
    ("/inventory/units", "O", None, "Đơn vị tính & quy đổi"),
    ("/production", "O", "/production/recipes", "Công thức pha chế & chế biến"),
    ("/production/recipes", "O", None, "Công thức pha chế & chế biến"),
    ("/production/batches", "OW", None, "Quản lý mẻ chế biến"),
    ("/production/planning", "OMW", None, "Kế hoạch cấp phát theo ca"),
    ("/purchases", "OM", None, "Đơn mua nguyên liệu"),
    ("/purchases/new", "OM", None, "Lập đơn mua nguyên liệu"),
    ("/purchases/add-purchase", "OM", "/purchases/new", "Lập đơn mua nguyên liệu"),
    ("/purchases/purchases", "OM", "/purchases", "Đơn mua nguyên liệu"),
    ("/purchases/transfers", "OW", None, "Cấp phát nguyên liệu theo ca"),
    ("/purchases/receipts", "OW", None, "Phiếu nhận hàng / nhập kho"),
    ("/purchases/stock-transfers", "OW", "/purchases/transfers", "Cấp phát nguyên liệu theo ca"),
    ("/distribution", "OMW", "/distribution/planning", "Kế hoạch cấp phát theo ca"),
    ("/distribution/planning", "OMW", None, "Kế hoạch cấp phát theo ca"),
    ("/stores", "OMW", "/stores/ingredients", "Nguyên liệu vận hành tại quầy"),
    ("/stores/ingredients", "OMW", None, "Nguyên liệu vận hành tại quầy"),
    ("/stores/shift-reconciliation", "OMW", None, "Đối soát nguyên liệu cuối ca"),
    ("/invoices", "OMC", None, "Hóa Đơn & Chứng Từ"),
    ("/invoices/invoices", "OMC", None, "Hóa Đơn & Chứng Từ"),
    ("/invoices/:id", "OMC", None, "Không tìm thấy hóa đơn"),
    ("/invoices/invoice-details", "OMC", None, "Hóa Đơn"),
    ("/expenses", "O", None, "Sổ Theo Dõi Chi Phí Vận Hành"),
    ("/expenses/expenses", "O", None, "Sổ Theo Dõi Chi Phí Vận Hành"),
    ("/suppliers", "O", None, "Nhà Cung Cấp Nguyên Vật Liệu"),
    ("/suppliers/suppliers", "O", None, "Nhà Cung Cấp Nguyên Vật Liệu"),
    ("/users", "OM", None, "Nhân Viên & Điều Phối Ca Chi Nhánh"),
    ("/users/users", "OM", None, "Nhân Viên & Điều Phối Ca Chi Nhánh"),
    ("/users/roles", "OM", None, "Ma Trận Phân Quyền 4 Vai Trò Nghiệp Vụ"),
    ("/reports", "OM", "/reports/sales-report", "Báo Cáo Phân Tích Doanh Thu Chuỗi"),
    ("/reports/sales-report", "OM", None, "Báo Cáo Phân Tích Doanh Thu Chuỗi"),
    ("/reports/inventory-report", "OMW", None, "Báo Cáo Tồn Kho & Cảnh Báo Cận Date"),
    ("/reports/profit-loss", "OM", None, "Hiệu Quả Kinh Doanh & Điểm Hòa Vốn Chi Nhánh"),
    ("/reports/customer-report", "O", None, "Báo Cáo Thành Viên & Khách Hàng VIP"),
    ("/reports/purchase-report", "O", None, "Báo Cáo Thu Mua & Nhập Hàng F&B"),
    ("/reports/supplier-report", "O", None, "Bảng Đánh Giá Hiệu Suất Nhà Cung Cấp"),
    ("/settings", "O", "/settings/general", "Thông Tin Doanh Nghiệp & Cài Đặt Chung"),
    ("/settings/general", "O", None, "Thông Tin Doanh Nghiệp & Cài Đặt Chung"),
    ("/settings/inventory", "O", None, "Cấu Hình Quản Lý Kho & Quy Tắc Xuất FEFO"),
    ("/settings/sales", "O", None, "Cấu Hình Bán Hàng POS & Kênh Online"),
    ("/settings/purchases", "O", None, "Cấu Hình Thu Mua & Điều Chuyển Cấp Cứu"),
    ("/settings/notifications", "O", None, "Cấu Hình Cảnh Báo Tự Động & Kịch Bản Sự Cố"),
    ("/profile", "OMCW", None, "Hồ Sơ Nhân Sự & Thông Tin Ca Trực"),
    ("/pages/profile", "OMCW", None, "Hồ Sơ Nhân Sự & Thông Tin Ca Trực"),
]
PUBLIC_PAGES = {
    "/login": LOGIN_HEADING,
    "/register": "Đăng Ký Tài Khoản Nhân Viên",
    "/forgot-password": "Quên Mật Khẩu?",
    "/reset-password": "Đặt Lại Mật Khẩu",
}
DETAIL_PATHS = {
    "/inventory/products/:id": "/inventory/products/hd-001",
    "/invoices/:id": "/invoices/HD-E2E-MISSING",
}


def button(scope, name):
    return scope.get_by_role("button", name=name, exact=isinstance(name, str))


def heading(scope, name):
    return scope.get_by_role("heading", name=name, level=1)


def row(page, value):
    return page.get_by_role("row").filter(has=page.get_by_role("cell", name=value, exact=True))


def expect_path(page, path):
    expect(page).to_have_url(re.compile(rf"^https?://[^/]+{re.escape(path)}(?:[?#].*)?$"))


def open_page(page, path):
    response = page.goto(path, wait_until="domcontentloaded")
    assert response is not None and response.ok, f"Không tải được {path}: {response}"


def login(page, role, remember=False):
    email, home, _ = USERS[role]
    open_page(page, "/login")
    page.locator("#login-email").fill(email)
    page.locator("#login-password").fill(PASSWORD)
    page.locator("#remember-me").set_checked(remember)
    button(page, "Đăng Nhập Vào Hệ Thống").click()
    expect_path(page, home)


def switch_account(page, role):
    open_page(page, "/logout")
    expect_path(page, "/login")
    login(page, role)


@pytest.fixture(scope="session")
def base_url(base_url):
    url = base_url or "http://localhost:3000"
    if urlsplit(url).hostname not in {"localhost", "127.0.0.1", "::1"}:
        pytest.fail("Bộ test ghi dữ liệu demo, hãy dùng phiên bản chạy trên localhost.")
    return url.rstrip("/")


@pytest.fixture(scope="session")
def saved_sessions(browser, browser_context_args):
    """Authenticate once per account using the real login form."""
    states = {}

    def get(role):
        if role not in states:
            context = browser.new_context(**browser_context_args)
            try:
                login(context.new_page(), role, remember=True)
                states[role] = context.storage_state()
            finally:
                context.close()
        return states[role]

    return get


@pytest.fixture
def as_role(new_context, saved_sessions):
    def get(role):
        context = new_context(storage_state=saved_sessions(role) if role != "guest" else None)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        return page, errors

    return get


def test_route_matrix_covers_router():
    source = Path(__file__).resolve().parents[1] / "src/routes/AppRoutes.tsx"
    registered = set(re.findall(r'\bpath="([^"]+)"', source.read_text(encoding="utf-8")))
    public = set(PUBLIC_PAGES) | {f"/pages{path}" for path in PUBLIC_PAGES} | {"/logout", "*"}
    assert registered - public == {path for path, *_ in ROUTE_CASES}


@pytest.mark.parametrize("role", ACCESS_ROLES)
@pytest.mark.parametrize("path,allowed,canonical,title", ROUTE_CASES, ids=[case[0] for case in ROUTE_CASES])
def test_route_access(as_role, role, path, allowed, canonical, title):
    page, errors = as_role(role)
    path = DETAIL_PATHS.get(path, path)
    open_page(page, path)
    if role == "guest":
        expect_path(page, "/login")
        expect(heading(page, LOGIN_HEADING)).to_be_visible()
    elif ACCESS_ROLES[role] in allowed:
        expect_path(page, canonical or path)
        page_title = "Không thể mở POS" if role == "owner" and path == "/sales/pos" else title
        expect(heading(page.locator("main"), page_title)).to_be_visible()
    else:
        expect_path(page, USERS[role][1])
        expect(heading(page.locator("main"), title)).to_have_count(0)
    assert not errors, f"Lỗi JavaScript trên {path}: {errors}"


@pytest.mark.parametrize("path,title", PUBLIC_PAGES.items(), ids=PUBLIC_PAGES)
@pytest.mark.parametrize("prefix", ["", "/pages"], ids=["canonical", "alias"])
def test_public_auth_pages(page, path, title, prefix):
    open_page(page, prefix + path)
    expect_path(page, path)
    expect(heading(page, title)).to_be_visible()


@pytest.mark.parametrize("role", USERS)
def test_login_profile_logout(page, role):
    login(page, role)
    page.reload(wait_until="domcontentloaded")
    expect_path(page, USERS[role][1])
    open_page(page, "/profile")
    expect(page.get_by_role("heading", name=USERS[role][2], level=2, exact=True)).to_be_visible()
    menu = page.locator("#app-header").get_by_role("button", name=re.compile(re.escape(USERS[role][2])))
    menu.click()
    page.get_by_text("Đăng xuất", exact=True).click()
    expect_path(page, "/login")
    open_page(page, "/profile")
    expect_path(page, "/login")


def test_invalid_login_and_password_visibility(page):
    open_page(page, "/")
    expect_path(page, "/login")
    password = page.locator("#login-password")
    toggle = button(page, "Hiển thị hoặc ẩn mật khẩu")
    toggle.click()
    expect(password).to_have_attribute("type", "text")
    toggle.click()
    expect(password).to_have_attribute("type", "password")
    password.fill("invalid-demo-password")
    button(page, "Đăng Nhập Vào Hệ Thống").click()
    expect(page.get_by_text("Tài khoản email hoặc mật khẩu chưa đúng.", exact=True)).to_be_visible()
    expect_path(page, "/login")


@pytest.mark.parametrize("remember", [False, True], ids=["tab-only", "remember"])
def test_remember_login_across_tabs(page, remember):
    login(page, "cashier", remember=remember)
    second = page.context.new_page()
    open_page(second, "/profile")
    expect_path(second, "/profile" if remember else "/login")


@pytest.mark.parametrize("role", ["owner", "manager"])
def test_dashboard_greets_current_account(as_role, role):
    page, _ = as_role(role)
    open_page(page, "/dashboard")
    given_name = USERS[role][2].split()[-1]
    expect(heading(page, f"Chào mừng trở lại, {given_name}!")).to_be_visible()


@pytest.mark.parametrize("role", ["owner", "manager", "cashier", "warehouse"])
def test_action_visibility(as_role, role):
    page, _ = as_role(role)
    open_page(page, "/inventory/products")
    add_product = button(page, "Khai báo món mới")
    cogs = page.get_by_role("columnheader", name="COGS", exact=True)
    if role == "owner":
        expect(add_product).to_be_visible()
        add_product.click()
        expect_path(page, "/inventory/products/new")
    else:
        expect(add_product).to_have_count(0)
    if role == "cashier":
        expect(cogs).to_have_count(0)
    elif role != "owner":
        expect(cogs).to_be_visible()
    open_page(page, "/marketing/promotions")
    create_promotion = button(page, "+ Tạo chương trình")
    if role == "owner":
        create_promotion.click()
        expect(page.get_by_role("dialog", name="Tạo chương trình khuyến mãi mới")).to_be_visible()
        page.keyboard.press("Escape")
        expect(page.get_by_role("dialog")).to_have_count(0)
    else:
        expect(create_promotion).to_have_count(0)
        expect(page.get_by_text("Chỉ xem chương trình khuyến mãi", exact=False)).to_be_visible()


def test_profile_edit_persists(as_role):
    page, _ = as_role("cashier")
    open_page(page, "/profile")
    name = f"Nhân viên E2E {uuid4().hex[:8]}"
    page.locator('main form input[type="text"]').first.fill(name)
    page.locator('main form input[type="tel"]').fill("0900000001")
    button(page, "Lưu Thay Đổi").click()
    expect(page.get_by_text("Đã cập nhật hồ sơ nhân sự thành công!", exact=True)).to_be_visible()
    page.reload(wait_until="domcontentloaded")
    expect(page.get_by_role("heading", level=2, name=name)).to_be_visible()


def test_category_create_edit_deactivate_and_filter(as_role):
    page, _ = as_role("owner")
    open_page(page, "/inventory/categories")
    code = f"E2E-{uuid4().hex[:8].upper()}"
    name = f"Nhóm thử {code}"
    button(page, "+ Thêm nhóm món").click()
    dialog = page.get_by_role("dialog", name="Thêm nhóm món")
    dialog.locator("#cat-code").fill(code)
    button(dialog, "Lưu nhóm").click()
    expect(dialog).to_be_visible()
    assert not dialog.locator("#cat-name").evaluate("input => input.validity.valid")
    dialog.locator("#cat-name").fill(name)
    button(dialog, "Lưu nhóm").click()
    expect(dialog).to_have_count(0)
    category = row(page, code)
    expect(category).to_contain_text(name)

    button(category, "Chỉnh sửa").click()
    edit = page.get_by_role("dialog", name="Cập nhật nhóm món")
    edit.locator("#cat-name").fill(name + " đã sửa")
    edit.get_by_role("checkbox", name="Đang sử dụng").uncheck()
    button(edit, "Lưu nhóm").click()
    page.reload(wait_until="domcontentloaded")
    expect(category).to_contain_text(name + " đã sửa")
    expect(category).to_contain_text("Ngừng dùng")

    page.locator("#category-search").fill(code)
    page.locator("#category-status").select_option("active")
    button(page, "Áp dụng").click()
    expect(category).to_have_count(0)
    expect(page.get_by_text("Không có nhóm phù hợp.")).to_be_visible()
    button(page, "Xóa lọc").click()
    expect(category).to_be_visible()


def test_unit_validates_positive_conversion(as_role):
    page, _ = as_role("owner")
    open_page(page, "/inventory/units")
    name = f"Đơn vị E2E {uuid4().hex[:8]}"
    button(page, "+ Thêm đơn vị").click()
    dialog = page.get_by_role("dialog", name="Thêm đơn vị quy đổi")
    dialog.locator("#unit-name").fill(name)
    dialog.locator("#unit-dimension").select_option("volume")
    expect(dialog.locator("#unit-base")).to_have_value("ml")
    dialog.locator("#unit-factor").fill("0")
    button(dialog, "Lưu đơn vị").click()
    expect(dialog).to_be_visible()
    expect(row(page, name)).to_have_count(0)
    dialog.locator("#unit-factor").fill("250")
    button(dialog, "Lưu đơn vị").click()
    expect(dialog).to_have_count(0)
    page.locator("#unit-search").fill(name)
    expect(row(page, name)).to_contain_text("250 ml")


def add_pos_item(page, note=""):
    open_page(page, "/sales/pos")
    page.get_by_role("textbox", name="Tìm món").fill("TS01")
    button(page, re.compile(r"Trà sữa trân châu.*TS01")).click()
    dialog = page.get_by_role("dialog", name=re.compile("Tùy chọn"))
    button(dialog, re.compile("Size L")).click()
    button(dialog, "50%").click()
    button(dialog, "Ít đá").click()
    if note:
        dialog.get_by_placeholder("Ví dụ: Ít đá, mang đi ngay...").fill(note)
    button(dialog, re.compile("Thêm vào đơn")).click()
    expect(dialog).to_have_count(0)


def test_pos_cart_add_change_remove_and_confirm_clear(as_role):
    page, _ = as_role("cashier")
    add_pos_item(page, "Ghi chú E2E")
    line = page.locator(".pos-line-item")
    expect(line).to_contain_text("Size L · 50% đường · Ít đá")
    expect(line).to_contain_text("Ghi chú E2E")
    button(line, "Tăng Trà sữa trân châu").click()
    expect(page.locator(".pos-cup-count")).to_have_text("2 ly")
    button(line, "Giảm Trà sữa trân châu").click()
    expect(page.locator(".pos-cup-count")).to_have_text("1 ly")
    button(line, "Xóa Trà sữa trân châu").click()
    expect(button(page, "Thanh toán")).to_be_disabled()

    add_pos_item(page)
    button(page, "Xóa giỏ").click()
    confirmation = page.get_by_role("dialog", name="Xóa toàn bộ giỏ hàng?")
    button(confirmation, "Hủy").click()
    expect(line).to_be_visible()
    button(page, "Xóa giỏ").click()
    button(confirmation, "Xóa giỏ hàng").click()
    expect(line).to_have_count(0)
    expect(button(page, "Thanh toán")).to_be_disabled()


def test_pos_hold_restore_and_low_cash(as_role):
    page, _ = as_role("cashier")
    add_pos_item(page)
    button(page, "Giữ đơn").click()
    expect(page.get_by_text("Đã giữ đơn.", exact=True)).to_be_visible()
    expect(page.locator(".pos-line-item")).to_have_count(0)
    page.reload(wait_until="domcontentloaded")
    button(page, re.compile(r"^Đơn giữ \(")).click()
    dialog = page.get_by_role("dialog", name="Đơn đang giữ")
    dialog.get_by_role("radio").check()
    button(dialog, "Khôi phục").click()
    expect(page.locator(".pos-line-item")).to_contain_text("Trà sữa trân châu")
    page.locator("#pos-paid-amount").fill("1000")
    button(page, "Thanh toán").click()
    expect(page.get_by_text("Tiền khách đưa chưa đủ hoặc không hợp lệ.", exact=True)).to_be_visible()
    expect(page.locator(".pos-line-item")).to_be_visible()


def test_pos_held_order_count_survives_reload(as_role):
    page, _ = as_role("cashier")
    add_pos_item(page)
    button(page, "Giữ đơn").click()
    expect(button(page, "Đơn giữ (1)")).to_be_visible()
    page.reload(wait_until="domcontentloaded")
    expect(button(page, "Đơn giữ (1)")).to_be_visible()


def checkout_cash(page):
    button(page, "Đưa đủ").click()
    expect(page.locator("#pos-paid-amount")).to_have_value(re.compile(r"^[1-9]\d*$"))
    button(page, "Thanh toán").click()
    result = page.get_by_text(re.compile(r"Đã tạo đơn .* & Hóa đơn .*Đã chuyển phiếu KOT"))
    expect(result).to_be_visible()
    ids = re.search(r"Đã tạo đơn (\S+) & Hóa đơn (\S+)!", result.inner_text())
    assert ids, "Thông báo thanh toán phải có mã đơn và mã hóa đơn"
    expect(page.locator(".pos-line-item")).to_have_count(0)
    return ids.groups()


def test_pos_checkout_reaches_orders_invoice_and_kds(as_role):
    page, _ = as_role("cashier")
    add_pos_item(page)
    order_id, invoice_id = checkout_cash(page)

    page.get_by_role("link", name="Danh sách đơn", exact=True).click()
    expect_path(page, "/sales")
    expect(row(page, order_id)).to_be_visible()
    open_page(page, f"/invoices/{invoice_id}")
    expect(heading(page, f"Hóa Đơn {invoice_id}")).to_be_visible()
    expect(page.get_by_text("Trà sữa trân châu", exact=True)).to_be_visible()
    open_page(page, "/sales/preparation")
    expect(page.locator("main").get_by_text(order_id, exact=True).first).to_be_visible()


def test_refund_request_and_manager_review(page):
    login(page, "cashier")
    add_pos_item(page)
    order_id, _ = checkout_cash(page)
    open_page(page, "/sales/returns")
    button(page, "Tạo yêu cầu xử lý").click()
    form = page.get_by_role("dialog", name="Tạo phiếu đổi trả / hoàn tiền")
    form.get_by_role("searchbox", name="Tìm đơn hàng để tạo yêu cầu mới").fill(order_id)
    button(form, "Chọn đơn hàng này").click()
    button(form, "Hoàn tiền").click()
    form.get_by_role("radio", name=re.compile("Hoàn toàn bộ")).check()
    form.get_by_role("textbox", name="Lý do / ghi chú chi tiết").fill("Kiểm thử hoàn tiền")
    button(form, "Gửi yêu cầu duyệt").click()
    toast = page.get_by_text(re.compile(r"Đã tạo .*Đang chờ quản lý duyệt"))
    expect(toast).to_be_visible()
    match = re.search(r"Đã tạo ([^\s.]+)", toast.inner_text())
    assert match, "Thông báo gửi yêu cầu phải có mã phiếu"
    request_id = match.group(1)
    request = row(page, request_id)
    expect(request.get_by_text("Chờ duyệt", exact=True)).to_be_visible()
    expect(button(request, "Xem xét")).to_have_count(0)

    switch_account(page, "manager_cn01")
    open_page(page, "/sales/returns")
    button(request, "Xem xét").click()
    review = page.get_by_role("dialog", name=f"Chi Tiết Yêu Cầu {request_id}")
    review.locator("#review-note").fill("Từ chối phiếu kiểm thử")
    button(review, "Từ Chối Yêu Cầu").click()
    expect(request.get_by_text("Từ chối", exact=True)).to_be_visible()


def test_purchase_draft_then_receipt_by_warehouse(page):
    login(page, "manager")
    open_page(page, "/purchases/new")
    code = f"PO-E2E-{uuid4().hex[:8].upper()}"
    lot = code.replace("PO-", "LOT-", 1)
    page.locator("#po-code").fill(code)
    page.locator("#po-supplier").select_option(index=1)
    select = page.get_by_role("combobox", name="Nguyên liệu", exact=True)
    expect(select).to_have_count(2)
    button(page, "+ Thêm dòng").click()
    expect(select).to_have_count(3)
    button(page, "Xóa").last.click()
    button(page, "Xóa").last.click()
    expect(select).to_have_count(1)
    select.select_option("ing-tea-leaf")
    page.get_by_role("spinbutton", name="Số lượng đặt").fill("1000")
    page.get_by_role("spinbutton", name="Đơn giá").fill("500")
    button(page, "Lưu bản nháp").click()
    expect_path(page, "/purchases")
    order = row(page, code)
    expect(order).to_contain_text("Bản nháp")
    button(order, "Xác nhận đặt").click()
    expect(order).to_contain_text("Đã đặt")

    switch_account(page, "warehouse")
    open_page(page, "/purchases/receipts")
    button(row(page, code), "Kiểm nhận hàng").click()
    dialog = page.get_by_role("dialog", name=f"Kiểm nhận · {code}")
    button(dialog, "Xác nhận kiểm nhận").click()
    expect(dialog.get_by_role("alert")).to_have_text("Mỗi dòng có nhận hàng cần mã lô.")
    dialog.get_by_role("textbox", name=re.compile("^Mã lô ")).fill(lot)
    button(dialog, "Xác nhận kiểm nhận").click()
    expect(dialog).to_have_count(0)
    expect(row(page, lot)).to_contain_text("Kho tổng · khả dụng")
    switch_account(page, "manager")
    open_page(page, "/purchases")
    expect(row(page, code)).to_contain_text("Đã nhận đủ")


def create_stock_count(page):
    open_page(page, "/inventory/stock-adjustment")
    operator = f"Kiểm kê E2E {uuid4().hex[:8]}"
    page.locator("#count-position").select_option("central")
    page.locator("#count-counter").fill(operator)
    page.locator("#count-actual").fill("15")
    button(page, "Gửi số đếm & tính chênh lệch").click()
    count_row = page.get_by_role("row").filter(has_text=operator)
    expect(count_row.get_by_text("Chờ duyệt", exact=True)).to_be_visible()
    return count_row


def test_stock_count_is_reviewed_and_persists(as_role):
    page, _ = as_role("owner")
    count_row = create_stock_count(page)
    button(count_row, "Duyệt điều chỉnh").click()
    page.reload(wait_until="domcontentloaded")
    expect(count_row.get_by_text("Đã duyệt", exact=True)).to_be_visible()
    expect(button(count_row, "Duyệt điều chỉnh")).to_have_count(0)


def test_warehouse_cannot_approve_stock_adjustments(as_role):
    page, _ = as_role("warehouse")
    count_row = create_stock_count(page)
    expect(button(count_row, "Duyệt điều chỉnh")).to_have_count(0)


def test_warehouse_plans_and_starts_batch(as_role):
    page, _ = as_role("warehouse")
    open_page(page, "/production/batches")
    codes = page.locator("tbody tr td:first-child")
    before = set(codes.all_text_contents())
    button(page, "+ Tạo mẻ").click()
    dialog = page.get_by_role("dialog", name="Tạo mẻ chế biến")
    dialog.locator("#batch-plan").fill("100")
    button(dialog, "Tạo mẻ").click()
    expect(dialog).to_have_count(0)
    added = set(codes.all_text_contents()) - before
    assert len(added) == 1, f"Cần đúng một mẻ mới, tìm được {added}"
    batch = row(page, added.pop())
    expect(batch.get_by_text("Đã lên kế hoạch", exact=True)).to_be_visible()
    button(batch, "Bắt đầu").click()
    expect(batch.get_by_text("Đang chế biến", exact=True)).to_be_visible()
    button(batch, "Ghi kết quả").click()
    expect(page.get_by_role("dialog", name="Ghi nhận kết quả mẻ")).to_be_visible()


def test_promotion_create_edit_activate_and_stop(as_role):
    page, _ = as_role("owner")
    open_page(page, "/marketing/promotions")
    code = f"E2E-{uuid4().hex[:8].upper()}"
    button(page, "+ Tạo chương trình").click()
    dialog = page.get_by_role("dialog", name="Tạo chương trình khuyến mãi mới")
    today = date.today()
    fields = {
        "promo-name": f"Ưu đãi thử {code}",
        "promo-code": code,
        "promo-start": (today - timedelta(days=1)).strftime("%d/%m/%Y"),
        "promo-end": (today + timedelta(days=7)).strftime("%d/%m/%Y"),
        "promo-min-quantity": "1",
        "promo-benefit": "Giảm 10%",
        "promo-budget": "1000000",
        "promo-limit": "100",
        "promo-natural-rule": "Giảm 10% cho đơn có ít nhất một ly.",
    }
    for field, value in fields.items():
        dialog.locator(f"#{field}").fill(value)
    dialog.locator("#promo-branch-mode").select_option("all")
    button(dialog, "Lưu chương trình").click()
    expect(dialog).to_have_count(0)
    edit = button(page, f"Sửa {code}")
    edit.click()
    dialog = page.get_by_role("dialog", name="Sửa chương trình khuyến mãi")
    dialog.locator("#promo-name").fill(f"Ưu đãi đã sửa {code}")
    button(dialog, "Lưu chương trình").click()
    expect(dialog).to_have_count(0)
    expect(page.get_by_text(f"Ưu đãi đã sửa {code}", exact=True)).to_be_visible()

    activate = button(page, f"Kích hoạt chương trình {code}")
    stop = button(page, f"Dừng chương trình {code}")
    activate.click()
    expect(stop).to_be_visible()
    stop.click()
    expect(activate).to_be_visible()
    page.reload(wait_until="domcontentloaded")
    expect(activate).to_be_visible()


def test_expense_create_approve_and_filter(as_role):
    page, _ = as_role("owner")
    open_page(page, "/expenses")
    description = f"Chi phí E2E {uuid4().hex[:8]}"
    button(page, "Lập Phiếu Chi").click()
    dialog = page.get_by_role("dialog", name="Lập Phiếu Chi Vận Hành Mới")
    dialog.locator("#expense-amount").fill("0")
    button(dialog, "Xác Nhận Lập Phiếu").click()
    expect(page.get_by_text("Vui lòng nhập số tiền chi hợp lệ.", exact=True)).to_be_visible()
    dialog.locator("#expense-amount").fill("123000")
    dialog.locator("#expense-desc").fill(description)
    button(dialog, "Xác Nhận Lập Phiếu").click()
    expect(dialog).to_have_count(0)
    expense = page.get_by_role("row").filter(has_text=description)
    button(expense, "Duyệt chi").click()
    page.reload(wait_until="domcontentloaded")
    page.get_by_placeholder("Tìm kiếm phiếu chi, nội dung chi, người lập...").fill(description)
    expect(expense.get_by_text("Đã Duyệt Chi", exact=True)).to_be_visible()
    expect(button(expense, "Duyệt chi")).to_have_count(0)


@pytest.mark.parametrize(
    "role,path,action,title",
    [
        ("owner", "/inventory/branches", "Thêm cửa hàng", "Thêm cửa hàng"),
        ("owner", "/production/recipes", "Tạo công thức", "Tạo công thức"),
        ("owner", "/suppliers", "Thêm Nhà Cung Cấp", "Thêm Nhà Cung Cấp Nguyên Liệu Mới"),
        ("owner", "/users", "Thêm Nhân Viên", "Thêm Nhân Viên & Gán Chi Nhánh Mới"),
        ("manager", "/distribution/planning", "+ Tạo kế hoạch", "Tạo kế hoạch cấp phát"),
        ("warehouse", "/purchases/transfers", "Tạo phiếu cấp phát", "Tạo phiếu cấp phát theo ca (BM14)"),
    ],
)
def test_business_modal_opens_and_dismisses(as_role, role, path, action, title):
    page, _ = as_role(role)
    open_page(page, path)
    trigger = button(page, action)
    trigger.click()
    dialog = page.get_by_role("dialog", name=title, exact=True)
    expect(dialog).to_be_visible()
    expect(dialog.get_by_role("heading", name=title, exact=True)).to_be_visible()
    page.keyboard.press("Escape")
    expect(dialog).to_have_count(0)
    expect(trigger).to_be_visible()


def test_cash_shift_scope_and_opening(as_role):
    page, _ = as_role("manager_cn01")
    open_page(page, "/sales/shifts")
    form = page.locator("form").filter(has=button(page, "Mở ca"))
    expect(form.get_by_role("textbox", name="Chi nhánh")).to_have_value("CN01")
    form.get_by_role("combobox", name="Quầy").select_option("Q3")
    form.get_by_role("spinbutton", name="Tiền đầu ca (đ)").fill("250000")
    button(form, "Mở ca").click()
    expect(page.get_by_text("Đã mở ca tại quầy được phân công.", exact=True)).to_be_visible()
    page.reload(wait_until="domcontentloaded")
    expect(page.locator("main").get_by_text(re.compile(r"250[.,]000")).first).to_be_visible()


def test_settings_save_persists_after_reload(as_role):
    page, _ = as_role("owner")
    open_page(page, "/settings/general")
    company = page.locator("#company-name")
    value = f"MilktyWay E2E {uuid4().hex[:8]}"
    company.fill(value)
    button(page, "Lưu Cấu Hình").click()
    expect(page.get_by_text("Đã lưu cấu hình doanh nghiệp MilktyWay thành công!", exact=True)).to_be_visible()
    page.reload(wait_until="domcontentloaded")
    expect(company).to_have_value(value)


def test_supplier_export_downloads_file(as_role):
    page, _ = as_role("owner")
    open_page(page, "/suppliers")
    with page.expect_download(timeout=5000) as download:
        button(page, "Xuất Excel").click()
    assert download.value.failure() is None


def test_manager_cannot_open_goods_receipt_from_purchase_list(as_role):
    page, _ = as_role("manager")
    open_page(page, "/purchases")
    expect(button(page, "+ Lập đơn mua")).to_be_visible()
    expect(button(page, "Phiếu nhận hàng")).to_have_count(0)
    expect(button(page, "Kiểm nhận")).to_have_count(0)
