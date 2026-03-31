#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# 自动外发队列 - Docker 部署脚本
# 用法: ./scripts/deploy-queue.sh [--stop] [--start] [--restart]
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="neoport-queue"
CONTAINER_NAME="neoport-queue"
ENV_FILE="$SCRIPT_DIR/.env"

# 检查 .env 文件是否存在
if [ ! -f "$ENV_FILE" ]; then
  echo "[deploy-queue] ERROR: $ENV_FILE not found"
  exit 1
fi

# 构建 Docker 镜像
build() {
  echo "[deploy-queue] Building image $IMAGE_NAME ..."
  docker build \
    -f "$SCRIPT_DIR/Dockerfile.queue" \
    -t "$IMAGE_NAME" \
    --build-arg NODE_ENV=production \
    "$SCRIPT_DIR"
  echo "[deploy-queue] Build done."
}

# 启动容器（后台常驻）
start() {
  echo "[deploy-queue] Starting container $CONTAINER_NAME ..."

  # 如果已存在，先删除旧容器
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[deploy-queue] Removing old container..."
    docker rm -f "$CONTAINER_NAME"
  fi

  # 如果镜像不存在，先构建
  if ! docker image inspect "$IMAGE_NAME" > /dev/null 2>&1; then
    build
  fi

  # 启动容器，映射 .env 文件，重启策略为 always
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart always \
    --env-file "$ENV_FILE" \
    -v "$SCRIPT_DIR/.env:/app/.env:ro" \
    "$IMAGE_NAME"

  echo "[deploy-queue] Container started. Check logs with: docker logs -f $CONTAINER_NAME"
}

# 停止容器
stop() {
  echo "[deploy-queue] Stopping container $CONTAINER_NAME ..."
  docker rm -f "$CONTAINER_NAME"
}

# 查看日志
logs() {
  docker logs -f "$CONTAINER_NAME"
}

# 查看状态
status() {
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[deploy-queue] Container $CONTAINER_NAME is RUNNING"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Created}}"
  else
    echo "[deploy-queue] Container $CONTAINER_NAME is NOT running"
  fi
}

# 帮助
usage() {
  echo "Usage: $0 <command>"
  echo ""
  echo "Commands:"
  echo "  start    构建并启动队列处理器（后台常驻）"
  echo "  stop     停止并删除容器"
  echo "  restart  重启容器"
  echo "  logs     跟踪查看日志 (Ctrl+C 退出)"
  echo "  status   查看容器状态"
  echo "  build    仅构建镜像"
  echo "  help     显示帮助"
}

# 主入口
CMD="${1:-help}"
case "$CMD" in
  start)   start ;;
  stop)    stop ;;
  restart) stop; start ;;
  logs)    logs ;;
  status)  status ;;
  build)   build ;;
  help|--help|-h) usage ;;
  *)
    echo "Unknown command: $CMD"
    usage
    exit 1
    ;;
esac
