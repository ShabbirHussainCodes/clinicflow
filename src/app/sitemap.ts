import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return ["/", "/services", "/doctors", "/book", "/privacy"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
