/** @type {import('next').NextConfig} */
const nextConfig = {
  // Local member hosts: app.lvh.me / {slug}.app.lvh.me (nested → **)
  allowedDevOrigins: ["lvh.me", "*.lvh.me", "**.lvh.me"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
