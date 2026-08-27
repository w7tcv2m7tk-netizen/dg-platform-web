import type { MetadataRoute } from "next";

/**
 * Platform host robots.txt — app.digitalgate.com.au and Vercel preview hosts.
 * Marketing content lives on brand apex domains; the app is not indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
  };
}
