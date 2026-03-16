/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // 必须在这里，不能在任何 experimental 里面
  // 其他配置...
};

module.exports = nextConfig;