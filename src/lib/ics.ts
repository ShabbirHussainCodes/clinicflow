/** Minimal RFC 5545 calendar file for a single appointment. */

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds content lines longer than 75 octets as the specification requires. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const chunks: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = chunks.length === 0 ? 75 : 74; // continuation lines start with a space
    if (encoder.encode(current + char).length > limit) {
      chunks.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  chunks.push(current);
  return chunks.join("\r\n ");
}

function utcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export interface IcsAppointment {
  reference: string;
  startAt: string;
  endAt: string;
  summary: string;
  location: string;
  description: string;
  /** Used to keep the UID stable across downloads. */
  host: string;
}

export function buildIcs(appointment: IcsAppointment, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClinicFlow//Appointment//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointment.reference}@${appointment.host}`,
    `DTSTAMP:${utcStamp(now.toISOString())}`,
    `DTSTART:${utcStamp(appointment.startAt)}`,
    `DTEND:${utcStamp(appointment.endAt)}`,
    `SUMMARY:${escapeText(appointment.summary)}`,
    `LOCATION:${escapeText(appointment.location)}`,
    `DESCRIPTION:${escapeText(appointment.description)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Appointment reminder",
    "TRIGGER:-PT2H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
