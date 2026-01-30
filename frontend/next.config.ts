import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 允许开发环境下的跨域请求（WSL2/Windows 访问场景）
  allowedDevOrigins: ["127.0.0.1"],
  // Docker 部署时使用 standalone 输出模式
  output: "standalone",
  // 在 onebox / Docker 部署中，将前端的 /api 请求转发到容器内部的 FastAPI 服务
  async rewrites() {
    const backendPort = process.env.BACKEND_PORT ?? "8876";
    return [
      {
        source: "/api/:path*",
        // 注意：后端所有路由都挂在 /api 前缀下，这里需要保留 /api 前缀
        // 例如：前端请求 /api/auth/login -> 实际转发到 FastAPI 的 /api/auth/login
        destination: `http://127.0.0.1:${backendPort}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
