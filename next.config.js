/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // 启用独立输出，减小部署包体积
};

module.exports = nextConfig;