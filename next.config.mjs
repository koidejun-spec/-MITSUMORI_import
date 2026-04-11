/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xlsx', 'sharp', 'canvas', 'pdfjs-dist'],
  },
  // 複数ファイル同時アップロード対応（デフォルト4MBでは超えるケースがある）
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

export default nextConfig
