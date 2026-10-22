import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // /admin/import uploads a CV of up to 5 MB through a server action;
      // the default limit is 1 MB. The extra room covers the form encoding.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
