/**
 * Review phase: a fully static export (no server), so the staging site is
 * just files on Netlify. When Supabase arrives (phase 2) remove `output`
 * and Netlify's Next.js runtime takes over with no other config change.
 */
const nextConfig = {
  output: "export",
  // WordPress URLs end in a slash (/spider-noir/); keep every old link working.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
