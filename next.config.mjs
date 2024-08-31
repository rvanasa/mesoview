/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: 'www.spc.noaa.gov',
    //     port: '',
    //     pathname: '/exper/mesoanalysis/**',
    //   },
    // ],
  },
};

export default nextConfig;
