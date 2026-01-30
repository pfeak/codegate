#!/usr/bin/env sh
#
# CodeGate 前后端一体启动脚本
# 在仓库根目录执行 ./scripts/start.sh，或从其他项目通过 CODEGATE_ROOT 指向本仓库后执行。
#
# 用法:
#   ./scripts/start.sh              # 开发模式：同时启动后端(8000)与前端(3000)
#   ./scripts/start.sh --init-db    # 首次运行前初始化数据库后再启动
#
# 从其他项目引用:
#   export CODEGATE_ROOT=/path/to/codegate
#   "$CODEGATE_ROOT/scripts/start.sh"
#
# 服务器/域名部署（环境变量）:
#   方式一：使用本脚本专用 env 文件（推荐）
#     在仓库根目录创建 .env.codegate（可参考 scripts/.env.codegate.example），设置：
#     - NEXT_PUBLIC_API_URL  前端请求的后端 API 地址（浏览器可访问），如 https://api.example.com
#     后端 CORS 需在 backend/.env 中设置 CORS_ORIGINS，包含前端访问地址，如 ["https://codegate.example.com"]
#   方式二：启动前 export
#     export NEXT_PUBLIC_API_URL=https://api.example.com
#     ./scripts/start.sh
#

set -e

# 解析 CodeGate 根目录：优先使用 CODEGATE_ROOT，否则为脚本所在目录的上一级
if [ -n "${CODEGATE_ROOT}" ]; then
  ROOT="${CODEGATE_ROOT}"
else
  # 兼容多种调用方式：直接执行、bash scripts/start.sh、sh scripts/start.sh
  _SCRIPT="$0"
  [ -z "${_SCRIPT}" ] && _SCRIPT="$0"
  _DIR=$(cd "$(dirname "${_SCRIPT}")" && pwd)
  ROOT="${_DIR}/.."
fi
ROOT=$(cd "${ROOT}" && pwd)

# 加载可选环境变量（服务器/域名部署）：优先 CODEGATE_ENV_FILE，否则使用仓库根目录 .env.codegate
if [ -n "${CODEGATE_ENV_FILE}" ] && [ -f "${CODEGATE_ENV_FILE}" ]; then
  set -a
  . "${CODEGATE_ENV_FILE}"
  set +a
elif [ -f "${ROOT}/.env.codegate" ]; then
  set -a
  . "${ROOT}/.env.codegate"
  set +a
fi

BACKEND_DIR="${ROOT}/backend"
FRONTEND_DIR="${ROOT}/frontend"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
INIT_DB=false

for arg in "$@"; do
  case "$arg" in
    --init-db) INIT_DB=true ;;
  esac
done

# 检查目录
if [ ! -d "${BACKEND_DIR}" ] || [ ! -f "${BACKEND_DIR}/main.py" ]; then
  echo "错误: 未找到 backend 目录或 main.py，请确认 CODEGATE_ROOT 或脚本位置正确。当前 ROOT=${ROOT}" >&2
  exit 1
fi
if [ ! -d "${FRONTEND_DIR}" ] || [ ! -f "${FRONTEND_DIR}/package.json" ]; then
  echo "错误: 未找到 frontend 目录或 package.json，请确认 CODEGATE_ROOT 或脚本位置正确。当前 ROOT=${ROOT}" >&2
  exit 1
fi

# 检查依赖
if ! command -v uv >/dev/null 2>&1; then
  echo "错误: 未找到 uv。后端需要 uv，请安装: https://github.com/astral-sh/uv" >&2
  exit 1
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "错误: 未找到 pnpm。前端需要 pnpm，请安装: npm install -g pnpm" >&2
  exit 1
fi

# 后端 .env
if [ ! -f "${BACKEND_DIR}/.env" ]; then
  if [ -f "${BACKEND_DIR}/.env.example" ]; then
    echo "后端未找到 .env，已从 .env.example 复制，请按需修改 ${BACKEND_DIR}/.env"
    cp "${BACKEND_DIR}/.env.example" "${BACKEND_DIR}/.env"
  else
    echo "警告: 后端无 .env 且无 .env.example，可能影响启动。" >&2
  fi
fi

# 可选：初始化数据库
if [ "${INIT_DB}" = true ]; then
  echo "正在初始化数据库..."
  (cd "${BACKEND_DIR}" && uv run python -c "from src.codegate.database import init_db; init_db()")
  echo "数据库初始化完成。"
fi

# 清理函数：退出时结束前后端进程
BACKEND_PID=""
FRONTEND_PID=""
cleanup() {
  [ -n "${BACKEND_PID}" ] && kill "${BACKEND_PID}" 2>/dev/null || true
  [ -n "${FRONTEND_PID}" ] && kill "${FRONTEND_PID}" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM EXIT

# 启动后端（后台）：传入 BACKEND_PORT，与 .env.codegate 一致
export BACKEND_PORT
echo "启动后端: ${BACKEND_DIR} (端口 ${BACKEND_PORT})"
(cd "${BACKEND_DIR}" && uv run python main.py) &
BACKEND_PID=$!

# 等待后端就绪（可选，简单轮询）
sleep 2
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${BACKEND_PORT}/health" 2>/dev/null | grep -q 200; then
    echo "后端已就绪: http://127.0.0.1:${BACKEND_PORT}"
    break
  fi
  sleep 1
done

# 启动前端（后台）
# - 若已设置 NEXT_PUBLIC_API_URL（.env.codegate 或 export）：用于服务器/域名部署，前端请求该 API 地址
# - 未设置时：本地开发，由前端按访问 host 自动匹配（localhost/127.0.0.1），避免 Cookie 跨域 401
echo "启动前端: ${FRONTEND_DIR} (端口 ${FRONTEND_PORT})"
(cd "${FRONTEND_DIR}" && PORT="${FRONTEND_PORT}" pnpm dev) &
FRONTEND_PID=$!

echo ""
echo "CodeGate 已启动："
if [ -n "${NEXT_PUBLIC_API_URL}" ]; then
  echo "  前端: http://127.0.0.1:${FRONTEND_PORT}（部署时请通过反向代理暴露，与 CORS 一致）"
  echo "  后端 API: ${NEXT_PUBLIC_API_URL}（请确保 backend/.env 中 CORS_ORIGINS 包含前端访问域名）"
else
  echo "  前端: http://localhost:${FRONTEND_PORT} 或 http://127.0.0.1:${FRONTEND_PORT}"
  echo "  后端: http://localhost:${BACKEND_PORT} (API 文档: http://localhost:${BACKEND_PORT}/docs)"
  echo "  请用同一 host 访问前端（都用 localhost 或都用 127.0.0.1），以保证登录 Cookie 与 API 同域。"
fi
echo "按 Ctrl+C 停止前后端。"
echo ""

# 保持脚本运行，直到收到信号
wait
