# Design system

Direction: calm, premium healthcare. Warm paper background, deep teal primary, soft sage, restrained clay accent; arches as the recurring motif (hero, doctor portraits, login panel).
Original art only: SVG logo/mark, hero scene, faceless doctor portraits, map sketch; no photos, no remote images or fonts (Fraunces for headings, Figtree for text, bundled under OFL).

Tokens live in `src/app/globals.css` (`@theme`). Verified contrast (WCAG ratio): ink-900 on paper 13.5, ink-700 9.1, ink-500 on paper 5.2 / on white 5.5 / on sand-50 4.9, white on teal-700 8.4,
teal-700 on paper 8.0, clay-700 on clay-50 5.5, danger on white 6.5, amber-700 on amber-50 6.4. `ink-400` (≈3.9) is used only for borders/icons, never text.
Components: `Button`/`ButtonLink`, `TextField`/`SelectField`/`CheckboxField`, `Alert`, `Dialog`, `StatusBadge`, `Card`, `EmptyState`, skeletons. Layouts were reviewed visually at 390 px (phone), 768 px (tablet) and 1280 px (desktop), and checked for horizontal overflow at phone and tablet widths.
