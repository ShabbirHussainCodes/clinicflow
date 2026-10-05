import { describe, expect, it } from "vitest";

import { buildIcs } from "@/lib/ics";

const appointment = {
  reference: "CF-7K4MP-9QXD2",
  startAt: "2026-10-12T04:50:00+00:00",
  endAt: "2026-10-12T05:10:00+00:00",
  summary: "General Consultation with Dr. Meera Iyer",
  location: "Sanjeevani Family Clinic, Shop 4, Jasmine Court, Pune 411099",
  description: "Booking reference CF-7K4MP-9QXD2.\nPlease arrive 10 minutes early; bring reports.",
  host: "clinicflow",
};

describe("buildIcs", () => {
  const ics = buildIcs(appointment, new Date("2026-10-05T10:00:00Z"));

  it("produces a valid calendar envelope with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("writes start and end as UTC instants", () => {
    expect(ics).toContain("DTSTART:20261012T045000Z");
    expect(ics).toContain("DTEND:20261012T051000Z");
    expect(ics).toContain("DTSTAMP:20261005T100000Z");
    expect(ics).toContain("UID:CF-7K4MP-9QXD2@clinicflow");
  });

  it("escapes commas, semicolons and newlines in text", () => {
    expect(ics).toContain(
      "LOCATION:Sanjeevani Family Clinic\\, Shop 4\\, Jasmine Court\\, Pune 411099",
    );
    expect(ics.replace(/\r\n /g, "")).toContain("minutes early\; bring reports.");
    expect(ics.replace(/\r\n /g, "")).toContain("CF-7K4MP-9QXD2.\\nPlease");
  });

  it("folds lines longer than 75 octets", () => {
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
