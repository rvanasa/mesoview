/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.spc.noaa.gov",
        port: "",
        pathname: "/exper/mesoanalysis/**",
      },
    ],
  },
};

export default nextConfig;
