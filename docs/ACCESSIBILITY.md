# Accessibility

Target: WCAG 2.1 AA. Automated checks (axe-core) run in `e2e/accessibility.spec.ts`; the items below need a human.

Built in: skip link and focus-managed step headings; visible 3px focus outline; real radio inputs for choices; labelled fields with `aria-describedby`/`aria-invalid` errors and
`(required)` text; status conveyed by icon + text; ARIA-grid calendar with roving tabindex and arrow/Home/End/PageUp/PageDown keys; native `<dialog>` modals; `aria-live`
regions for results and feedback; chart has a hidden data table; FAQ is native `<details>`; the hours table has a caption and row headers; the current page is marked with `aria-current`; touch targets ≥ 40 px; `prefers-reduced-motion` and forced-colours support; contrast checked (see `docs/DESIGN.md`).

## Manual checklist (not yet performed by a person)

- [ ] Complete a booking with the keyboard only; confirm focus order and that errors move focus to the first invalid field
- [ ] Screen reader pass (NVDA/VoiceOver): step changes announce the new heading; slot-taken alert is announced; calendar day labels read sensibly
- [ ] 200% zoom and 320 px width without loss of content
- [ ] High-contrast / forced-colours mode
- [ ] Admin: operate the cancel and reschedule dialogs and the schedule editor by keyboard
- [ ] Home page: FAQ and hours table with a screen reader; at 200% zoom the pinned Call and Book bar does not hide content or focus
