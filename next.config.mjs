/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // VPS'da RAM kam — `next build` ning type-check/lint bosqichi xotirani tugatib
  // OOM bilan qulaydi. Bu bosqichlar build vaqtida o'chirilgan; sifat lokalda
  // `npx tsc --noEmit` orqali tekshiriladi (deploydan oldin ishlating).
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
