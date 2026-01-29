import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 允许开发环境下的跨域请求（WSL2/Windows 访问场景）
  allowedDevOrigins: ["127.0.0.1"],
  // Docker 部署时使用 standalone 输出模式
  output: "standalone",
};

export default nextConfig;
