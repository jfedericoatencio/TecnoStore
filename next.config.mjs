/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Paquetes nativos / con archivos binarios: no los empaqueta webpack
    serverComponentsExternalPackages: ['better-sqlite3', 'xlsx', 'adm-zip', 'bcryptjs', 'pg'],
  },
  images: { unoptimized: true },
};

export default nextConfig;
