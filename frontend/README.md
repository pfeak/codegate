# CodeGate Frontend

CodeGate 前端站点（Next.js App Router），用于管理员登录、项目管理、激活码查询/核销、文档页等。

## 环境要求

- Node.js >= 18
- 包管理器：`pnpm`（见 `package.json#packageManager`）

## 快速开始（开发）

```bash
cd frontend
pnpm install

# 前端通过该地址访问后端 API（浏览器可访问的地址）
export NEXT_PUBLIC_API_URL="http://localhost:8000"

pnpm dev
```

访问：

- 前端：`http://localhost:3000`
- 后端（需要另起终端启动）：`http://localhost:8000`

## 常用命令

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 生产运行
pnpm start

# 代码检查
pnpm lint
```

## 环境变量

| 变量名 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `NEXT_PUBLIC_API_URL` | 是 | 后端 API 基地址（浏览器侧访问） | `http://localhost:8000` |

> 说明：`NEXT_PUBLIC_*` 变量会暴露到浏览器端，请勿放置敏感信息（如密钥）。

## Docker 部署

最小化的 Docker/Compose 部署方案在仓库根目录的 `deploy/` 下，详见 `deploy/README.md`。
