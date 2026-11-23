import { Link, useLocation } from "react-router-dom";
import Badge from "../components/common/Badge";
import { navigationItems } from "../routes/navigation";
import { homePath } from "../utils/auth";

export default function ModulePendingPage() {
    const { pathname } = useLocation();
    const currentItem = navigationItems.find(
        (item) => item.path === pathname,
    );
    const title = currentItem?.label ?? "Chức năng đang được chuyển đổi";

    return (
        <>
            <div className="page-header">
                <div>
                    <nav className="breadcrumb" aria-label="Đường dẫn trang">
                        {pathname !== "/dashboard" && (
                            <>
                                <Link to={homePath()}>Trang chủ</Link>
                                <span className="sep" aria-hidden="true">
                                    /
                                </span>
                            </>
                        )}
                        <span className="current" aria-current="page">
                            {title}
                        </span>
                    </nav>

                    <h1 className="page-title">{title}</h1>
                    <p className="page-subtitle">
                        Đã thiết lập đường dẫn và khung giao diện React.
                    </p>
                </div>

                <Badge variant="warning">Chờ chuyển đổi giao diện</Badge>
            </div>

            <section className="card" aria-labelledby="pending-title">
                <h2 id="pending-title" className="card-title mb-4">
                    Trang nghiệp vụ chưa được triển khai
                </h2>

                <p className="text-sm leading-6 text-[var(--muted)]">
                    Đây là trang tạm để kiểm tra điều hướng SPA. Giao diện,
                    dữ liệu và các thao tác của trang HTML gốc sẽ được
                    chuyển sang component TypeScript trong bước tiếp theo.
                </p>
            </section>
        </>
    );
}