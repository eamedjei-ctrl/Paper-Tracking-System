import type { NextConfig } from "next";

// cacheComponents is disabled: the app shell is client-driven (demo store / Supabase),
// and auth-gated API routes read cookies on every request.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
