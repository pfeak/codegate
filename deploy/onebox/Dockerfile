#### Onebox Multi-stage Dockerfile: frontend (Next.js) + backend (FastAPI) in one image

# Stage 1: build frontend with Node + pnpm
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install frontend deps
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY frontend/ ./

# 前端在 onebox 场景下通过 Next.js rewrites 使用容器内部的 127.0.0.1:BACKEND_PORT，
# 不再在构建时注入 NEXT_PUBLIC_API_URL，避免镜像与环境强绑定。
RUN pnpm build


# Stage 2: final runtime image based on python:3.12-alpine
FROM python:3.12-alpine

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install runtime dependencies: node for Next.js, supervisor to manage processes
# 运行阶段需要通过 pnpm 启动前端，这里用 npm 全局安装与 workspace 对齐的 pnpm 版本
RUN apk add --no-cache nodejs npm curl supervisor \
    && npm install -g pnpm@10.28.0

# Copy backend source and install dependencies
COPY backend/ /app/backend/
WORKDIR /app/backend
RUN pip install --no-cache-dir .

# Copy built frontend from build stage
COPY --from=frontend-build /app/frontend /app/frontend

# Copy supervisord configuration from deploy/onebox
COPY deploy/onebox/supervisord.conf /etc/supervisord.conf

# Runtime environment
ENV NODE_ENV=production \
    BACKEND_PORT=8876 \
    FRONTEND_PORT=8877 \
    HOSTNAME="0.0.0.0"

EXPOSE 8876 8877

WORKDIR /app

# Use supervisord to manage frontend + backend; backend进程前台阻塞保持容器存活
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
