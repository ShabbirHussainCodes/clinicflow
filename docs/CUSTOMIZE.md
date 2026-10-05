# Make it your client's

The demo clinic ("Sanjeevani Family Clinic") is only data and text. To turn the site into a real clinic's site you change four things: **data**, **words**, **pictures** and **colours**. No component code needs to change.

| What                                                                            | Where                                         | How                                                               |
| ------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| Clinic name, tagline, description, phone, e-mail, address, time zone            | database table `clinics`                      | Supabase **Table Editor**, or `supabase/seed.sql` for a local run |
| Doctors: name, qualification, speciality, years, bio, languages                 | tables `doctors` and `doctor_services`        | same                                                              |
| Services: name, description, minutes                                            | table `services`                              | same                                                              |
| Weekly hours, breaks, holidays                                                  | **Admin, Schedule** page                      | no code                                                           |
| Headline, About text, FAQ, testimonials, closing call to action, WhatsApp, etc. | `src/config/site.ts`                          | edit the text and save                                            |
| Photographs and logo                                                            | folders inside `public/`                      | copy files in (names below)                                       |
| Colours and fonts                                                               | `src/app/globals.css`, `src/assets/fonts`     | edit values                                                       |
| Browser-tab icon                                                                | `src/app/icon.svg`                            | replace the file                                                  |
| "Demonstration site" strip                                                      | environment variable `SHOW_DEMO_NOTICE=false` | set it on the host                                                |
| Privacy notice                                                                  | `src/app/(public)/privacy/page.tsx`           | have a lawyer review it, then edit                                |

See the result while you work:

```
npm run db:start
npm run dev
```

Then open http://localhost:3000. Text and photo changes show after a browser refresh.

## 1. Clinic, doctors and services (data)

**Hosted Supabase project (the client's real site):** Supabase dashboard, **Table Editor**, then edit the rows in `clinics`, `doctors` and `services`. Add or remove rows as needed.

**Local demo:** edit the inserts in `supabase/seed.sql`, then run `npm run db:reset`. This **erases the local database, including your admin login**, so create the admin again afterwards with `npm run admin:create`.

Things that are easy to miss:

- `clinics` has exactly one row. `timezone` must be a real name such as `Asia/Kolkata`.
- A doctor only appears as bookable when they have rows in `doctor_services` (which services they offer) **and** weekly hours in Admin, Schedule.
- `slug` is lowercase letters, digits and hyphens (for example `dr-meera-iyer`). It names the doctor's photo file and appears in booking links, so do not change it after launch.
- `avatar_theme` (`teal`, `green`, `sand` or `clay`) is the colour of the initials badge shown until the doctor has a photo.
- `icon` on a service is one of `stethoscope`, `repeat`, `baby`, `syringe`, `sparkles`, `heart`, `clipboard`. It is used in the booking form.
- Do not store diagnoses or any real patient information in these tables.

## 2. Words (`src/config/site.ts`)

One plain file holds everything the clinic says about itself that is not in the database: year opened, registration number, the headline and first paragraph, the About section, FAQ, testimonials, the closing call to action, a WhatsApp number, map link and social links.

- Text may contain `{clinic}`, `{city}`, `{locality}`, `{phone}`, `{email}` and `{year}`; they are filled in automatically.
- Set a value to `null`, or a list to `[]`, to hide that part of the site. For example `testimonials: []` removes the whole section, and `about: null` removes the About section and its menu link.
- `hero.headline: null` uses the clinic's tagline from the database instead.
- **Replace the sample testimonials with real reviews you have written permission to publish, or remove them.**
- Set `testimonialsNote: null` and `credit: null` to remove the demo note and the "Online booking by ClinicFlow" footer line.
- `npm test` fails with a clear message if a placeholder is misspelled.

## 3. Photographs and logo (`public/`)

Copy files into these folders (create a folder if it does not exist). The file name decides where the picture is used. Nothing is found means the page uses its finished no-photo layout.

| File                                     | Used for                                                    | Best size                                 |
| ---------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| `public/doctors/<doctor-slug>.jpg`       | Doctor portrait: home, doctors page, booking, confirmation  | 4:5 portrait, about 800 x 1000 px         |
| `public/clinic/hero.jpg`                 | Wide photo beside the home page headline                    | 1600 px or wider, clinic or reception     |
| `public/clinic/about.jpg`                | Photo in the About section                                  | 4:3, 1200 px or wider                     |
| `public/clinic/map.jpg`                  | Map picture in the Visit section (links to the maps app)    | screenshot about 1600 x 700 px            |
| `public/brand/logo.svg`                  | The clinic's logo in the header (replaces the written name) | about 208 x 44 px, transparent background |
| `public/brand/logo-light.svg` (optional) | The same logo for the dark footer                           | same                                      |

Accepted types: `.webp`, `.jpg`, `.jpeg`, `.png`, `.avif`. Logos: `.svg`, `.png`, `.webp`.

- If **any** doctor has a photo, every doctor card switches to large portraits (doctors without one show an initials tile). Add all the portraits, or none.
- With `hero.jpg` present, the doctors' "Next available times" move into a strip under the photo.
- Photos are resized automatically for each screen. Keep originals under about 500 KB so the repository stays small.
- Only use pictures you own or have written permission to use. Never real patients.

## 4. Colours and fonts

Open `src/app/globals.css`. The brand colour is the ramp `--color-brand-50` to `--color-brand-900`. Change those nine values and the whole site follows, including the staff area. Keep `--color-brand-700` dark enough for white text (contrast ratio of at least 4.5 on white; check it with any online contrast checker).

Fonts: replace the two `.woff2` files in `src/assets/fonts` and the two `localFont` blocks in `src/app/layout.tsx`. Keep the `variable` names. Use only fonts whose licence allows embedding.

## 5. Browser-tab icon

Replace `src/app/icon.svg` with the clinic's mark (a square SVG).

## 6. Before the site goes live

- [ ] Real clinic, doctors and services entered; weekly hours set in Admin, Schedule
- [ ] `src/config/site.ts` has no sample text; the registration number is real
- [ ] Photographs and logo added with permission
- [ ] Privacy notice reviewed by a lawyer
- [ ] `SHOW_DEMO_NOTICE=false` and `SITE_URL` set to the real address on the host
- [ ] `npm run verify` passes
- [ ] The deployment checklist in [DEPLOYMENT.md](DEPLOYMENT.md) is complete

## Keep the tests meaningful

The browser and database tests expect the **demo** data (for example the doctor `dr-meera-iyer`). Keep `supabase/seed.sql` as the demo for local work and tests, and put the client's real rows into the **hosted** project through the Table Editor. Then `npm run test:e2e` keeps working on your computer without touching the client's database.

## Not editable from the admin screen yet

Clinic details, doctors, services, the text in `src/config/site.ts` and the photographs are changed as described above. Editing them from the staff area (with photo upload) is listed in [NEXT_STEPS.md](NEXT_STEPS.md).
