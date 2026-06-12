#!/usr/bin/env bash
# 把 Next.js standalone 产物打包成 FC 部署目录 code/
# 本地和 GitHub Actions 共用。运行前需先 pnpm build。
set -euo pipefail

cd "$(dirname "$0")/.."   # 切到 web/

NODE_VERSION="20.20.2"
NODE_TARBALL="node-v${NODE_VERSION}-linux-x64"

echo "==> 清理旧的 code/"
rm -rf code
mkdir -p code

echo "==> 复制 standalone 产物（含隐藏的 .next/server）"
cp -a .next/standalone/. code/

echo "==> 叠加 .next/static"
cp -a .next/static code/.next/static

echo "==> 复制 public"
[ -d public ] && cp -a public code/public

echo "==> 下载并打包 Node ${NODE_VERSION}（FC custom runtime GLIBC 旧，需自带）"
if [ ! -f "/tmp/${NODE_TARBALL}/bin/node" ]; then
  curl -sL "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TARBALL}.tar.xz" -o /tmp/node.tar.xz
  tar -xf /tmp/node.tar.xz -C /tmp/ "${NODE_TARBALL}/bin/node"
fi
cp "/tmp/${NODE_TARBALL}/bin/node" code/node20
chmod +x code/node20

echo "==> 写 bootstrap"
cat > code/bootstrap << 'EOF'
#!/bin/bash
export PORT=${FC_SERVER_PORT:-9000}
export HOSTNAME=0.0.0.0
exec /code/node20 /code/server.js
EOF
chmod +x code/bootstrap

echo "==> 完成。code/ 大小：$(du -sh code/ | cut -f1)"
