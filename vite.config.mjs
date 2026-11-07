import { defineConfig } from "vite";

export default defineConfig({
    server: {
        port: 1800,
        host: true,
    },
    plugins: [
        {
            name: "spa-fallback",
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    const pathname = (req.url ?? "/").split("?")[0];
                    // Nếu là yêu cầu trang HTML và không phải file tĩnh có đuôi mở rộng (.js, .css, .png, ...)
                    if (
                        req.headers.accept?.includes("text/html") &&
                        (!pathname.includes(".") || pathname.endsWith(".html"))
                    ) {
                        req.url = "/index.html";
                    }
                    next();
                });
            },
        },
    ],
});
