/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Day 9 에서 Cloudinary 도메인을 허용해야 next/image 가 뜬다.
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default nextConfig;
