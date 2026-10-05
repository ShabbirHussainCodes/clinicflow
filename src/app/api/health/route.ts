import { NextResponse } from "next/server";

import { ConfigError } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createPublicClient } from "@/lib/supabase/clients";

export const dynamic = "force-dynamic";

/**
 * Liveness / readiness probe.
 *
 *   GET /api/health          -> process is up (no dependencies; use for Render's health check)
 *   GET /api/health?deep=1   -> also verifies the database answers and a clinic is configured
 *
 * The response never includes secrets, versions of dependencies or internal error text.
 */
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const deep = new URL(request.url).searchParams.get("deep") === "1";

  if (!deep) {
    return NextResponse.json({ status: "ok", time: new Date().toISOString() }, { headers });
  }

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("health_check");
    if (error) throw error;
    const clinicConfigured =
      typeof data === "object" && data !== null && "clinic_configured" in data
        ? Boolean((data as { clinic_configured: unknown }).clinic_configured)
        : false;
    return NextResponse.json(
      { status: clinicConfigured ? "ok" : "degraded", database: "ok", clinicConfigured, time: new Date().toISOString() },
      { status: clinicConfigured ? 200 : 503, headers },
    );
  } catch (error) {
    if (error instanceof ConfigError) {
      return NextResponse.json({ status: "error", database: "not_configured" }, { status: 503, headers });
    }
    logger.error("health.database_unreachable", error);
    return NextResponse.json({ status: "error", database: "unreachable" }, { status: 503, headers });
  }
}
