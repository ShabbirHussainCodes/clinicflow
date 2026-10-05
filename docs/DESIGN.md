# Design system

Direction: a printed-stationery look for a real neighbourhood clinic. Warm paper, one deep brand colour, serif headlines, ruled lists, almost no shadow. The clinic's own name and photographs carry the identity. ClinicFlow appears only in the staff area and as a small footer credit.

## Principles

- **Real content, not slogans.** The hero says what the clinic is and where it is. The facts row is computed from the data (number of doctors, combined years, services, days open). Opening hours are the true merged working hours of the doctors, with "Open now" or "Closed now" worked out in the clinic's own time zone.
- **Typography leads.** Source Serif 4 for headings and Source Sans 3 for text (both SIL Open Font License, bundled locally, Latin subset, about 80 KB together). Left-aligned text, a measured line length, tabular numerals for times and phone numbers.
- **Structure instead of decoration.** Hairline rules and generous space replace cards, shadows, gradients, icon tiles and illustrations. Sections use different layouts (ruled list, ruled columns, definition lists, accordion, table) rather than one card grid repeated.
- **Honest imagery.** Photographs are slots filled by file name (see [CUSTOMIZE.md](CUSTOMIZE.md)). With no photo, the page uses a finished no-photo layout: the live availability panel beside the headline, and a ruled doctor directory with initials badges. No cartoon art, no stock images, no fake map.
- **Booking first.** Each doctor's next free times sit in the hero and are real links that open the booking form with that time selected. Phones get a Call and Book bar pinned to the bottom.

## Tokens

Defined in `src/app/globals.css` (`@theme`).

- Colours: `paper` and `surface` backgrounds, `sand-*` warm greys for bands and rules, `ink-*` text, `brand-*` the primary ramp (50 to 900), `sage-*` and `clay-*` supporting colours, plus status colours. Changing the `brand-*` ramp re-colours the site.
- Type: `--font-display` (serif, headings, numerals) and `--font-sans`. Body text is 17 px. Section titles are 28 px on phones and 36 px from the `sm` breakpoint; the home page headline is 38 / 48 / 56 px.
- Shape: radii 3 / 6 / 8 / 12 px (buttons and inputs use 6). Shadows are nearly flat.
- Motion: one short fade-up on the hero text; everything respects `prefers-reduced-motion`.

## Page patterns

| Part              | Pattern                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| Top of every page | optional demo strip, utility bar (open or closed, address, phone; large screens), sticky header           |
| Header            | clinic logo or monogram with the name; four links; phone and Book button; menu button on small screens    |
| Hero              | eyebrow, serif headline, one paragraph, Book and Call buttons, live "Next available times" panel or photo |
| Facts             | four figures separated by hairlines                                                                       |
| Services          | heading column beside a ruled list; each row is one link                                                  |
| How booking works | four columns under a dark rule                                                                            |
| Doctors           | four columns; large portraits when photos exist, otherwise a ruled directory with initials badges         |
| About             | text beside a ruled facilities list (and a photo when `about.jpg` exists)                                 |
| Patients          | large serif quotes between hairlines                                                                      |
| Questions         | native `<details>` accordion (works without JavaScript)                                                   |
| Visit             | address and contact beside a day-by-day hours table with today marked; optional map picture               |
| Closing           | one dark band with the two actions                                                                        |
| Footer            | dark; clinic, links, contact; legal line, privacy and staff sign-in                                       |
| Phones            | Call and Book bar fixed to the bottom (hidden during booking)                                             |

## Contrast

Ratios computed with the WCAG formula (verify any change with a contrast checker): ink-900 on paper 13.5, ink-700 on paper 9.1, ink-500 on paper 5.2 / on white 5.5 / on sand-50 4.9, brand-700 on paper 8.0, white on brand-700 8.4, paper on brand-800 10.1,
brand-100 on brand-800 8.3, footer text (brand-100 at 85 per cent) on brand-900 8.3, footer small print (80 per cent) 7.5, brand-200 on brand-900 8.3, sage-700 on sage-100 5.1, clay-700 on clay-100 4.8. `ink-400` (about 3.9) is used only for borders and icons, never for text.
axe-core checks the rendered pages in CI.

## Review

Layouts were reviewed visually at 390 px (phone), 768 px (tablet) and 1280 px (desktop), with and without photographs, and are checked automatically for horizontal overflow at 320, 390, 768, 1024, 1280 and 1440 px (and on a Pixel 7 phone profile, 412 px wide).
Components: `Button` / `ButtonLink`, form fields, `Alert`, `Dialog`, `StatusBadge`, `SectionHeading`, `ClinicBrand`, `DoctorPortrait`, `AvailabilityPanel`, and the page sections in `src/components/public`.
