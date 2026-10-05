import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { fetchConfirmation } from "@/lib/data/booking";
import { buildIcs } from "@/lib/ics";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { normalizeReference } from "@/lib/validation/booking";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const reference = normalizeReference((await params).reference);
  if (!reference) return new NextResponse("Not found", { status: 404 });

  const ip = clientIpFrom(await headers());
  if (!rateLimit(`confirm:${ip}`, 40, 10 * 60 * 1000).allowed) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  let confirmation;
  try {
    confirmation = await fetchConfirmation(reference);
  } catch {
    return new NextResponse("Service unavailable", { status: 503 });
  }
  if (!confirmation || confirmation.status === "cancelled") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { clinic, doctor, service } = confirmation;
  const location = [clinic.name, clinic.address_line1, clinic.address_line2, `${clinic.city} ${clinic.postal_code}`]
    .filter(Boolean)
    .join(", ");
  const body = buildIcs({
    reference: confirmation.reference,
    startAt: confirmation.start_at,
    endAt: confirmation.end_at,
    summary: `${service.name} with ${doctor.name}`,
    location,
    description: `Booking reference ${confirmation.reference}. Please arrive 10 minutes early. Clinic phone: ${clinic.phone}.`,
    host: "clinicflow",
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointment-${confirmation.reference}.ics"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
