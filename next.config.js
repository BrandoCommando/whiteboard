/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to prevent double canvas renders in dev
};

module.exports = nextConfig;

if(!process.env.VERCEL)
  import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
