# GLM.readme — Pickr UI/UX analysis & refinement brief

Written 2026-11-09 after a full read of the implemented app: every booking step, all four tabs, the trip screen, tokens, motion, haptics, catalog, schedule logic and both design docs (`CLAUDE.md`, `docs/UI_UX_DESIGNER_HANDOFF.md`). This file is my working reference: what the design system is, why it works, and exactly where I will refine it before designing anything new.

---

## 1. The product and its humans

Pickr books **trucks for construction material transport** in Kerala — not a materials store. The design is built around three real people:

| Who | Context | Design consequence |
|---|---|---|
| Customer (contractor, site supervisor, homeowner) | Books sand/bricks/jelly, pays the driver directly in cash/UPI | Fast booking, honest prices (±10% estimate, transport only), no fake payment UX |
| Driver (Malayalam-speaking, outdoors, gloves-on-phone) | Accepts jobs, photographs loads, collects payment | Full unit labels, large targets, English + Malayalam everywhere |
| Operator | Pilot-stage manual oversight | (Admin console is out of scope for the customer app work) |

The single most important human constraint in the codebase: **outdoor readability**. It explains light-only theme (no dark mode — `Colors.dark = Colors.light` on purpose), no blur on sheets ("text stays sharp outdoors"), darker orange `#C2410C` for text links, and no color-only signals (stale location always says so in words).

---

## 2. Architecture as built

**Stack:** Expo SDK 58 · React Native 0.88 · expo-router (file-based) · Reanimated 4 · react-native-maps with `.web.tsx` fallbacks · Saira font · AsyncStorage persistence. No backend yet — trips, sessions, sites, OTP are local stubs, clearly marked `DEMO`.

```
src/
  app/
    _layout.tsx          Root stack: Session→Trips→Sites→Booking providers,
                         splash reveal, sheet-depth shell, guarded route groups
    (onboarding)/        auth → otp → register   (session === null guard)
    (tabs)/              _layout: 4 tabs — index, my-loads, requests, profile
    book/                material → route → site → truck → review → submitted
                         + map (full-screen pin picker)
    trip/[id].tsx        One screen for all trip phases (searching → receipt)
  components/
    booking/             BookingLayout (header + segmented progress + sticky dock)
    trip/                searching-view, live-view, stage-stepper, cancel/details sheets
    home/                fleet-sheet
    maps/                mock-map, picker-map, trip-map (+ web fallbacks)
    navigation/          tab-bar (floating navy pill, animated indicator)
    ui/                  primary-button, bottom-sheet, pressable-scale,
                         rolling-text, sheet-depth, duo-icon, image-placeholder
  lib/                   booking (draft state machine), catalog (materials/vehicles/
                         demo quotes), schedule (school-hour windows), trips,
                         session, i18n, motion, haptics, simulate
  constants/             theme.ts (single source of color/font/spacing tokens)
```

**Patterns worth keeping:**
- **One draft, persisted** (`pickr.draft`): booking survives app kill; Home shows "Continue your booking" and `resume()` re-pushes reached steps so Back still walks in order.
- **Guarded stacks**: `Stack.Protected` switches `(tabs)+book+trip` vs `(onboarding)` on session — no conditional navigation logic scattered in screens.
- **Demo honesty**: `simulate.ts` drives a "(demo)" driver; maps are labelled "Demo map"; rates are `DEMO` per-load. The UI never pretends a backend exists.
- **Two-layer screens**: `TripScreen` splits hero map + rising sheet, with a compact `code · stage · price` bar once details scroll away.

---

## 3. The design system, as understood

### Color (Signal Orange on white, agreed 2026-11-04)
- **White canvas** `#FFFFFF`, **stone surfaces** `#F5F5F4`, hairline borders `#E7E5E4`.
- **Orange `#F97316` = primary action only.** One orange button per screen. Darker `#C2410C` for text links.
- **Night navy `#0B1520`** = chrome (Home band, tab bar, selected day chips, Profile loads card) — from the logo, with amber `#F6B91A` as the logo accent.
- Semantic fills are pale washes with dark text: warning `#FEF3C7`/`#78350F`, danger `#FDECEA`, success `#E8F5EC`.
- Selected fill token `#FFEDD5`; in practice screens also use `#FFF7ED` (orange-50) interchangeably — see §6.3.

### Type & spacing
- **Saira** in four weights (500/600/700/800). Display headlines 800, body 500–700.
- Spacing scale exists (`4/8/16/24/32/64`) but screens also use 6/10/12/14/18 ad hoc.
- Layout constants: 24px side margins everywhere, 56pt main button, content columns max 520 (tabs) / 560 (booking) / 720 (tablet), floating tab bar 64 + 12 gap.

### Motion (`src/lib/motion.ts`)
Three springs (tactile / sheet / bouncy) + ENTER 240ms, EXIT 140ms, MORPH 180ms, 40ms stagger. Exits faster than entrances. Everything animates transform/opacity only, `useReducedMotion` respected in sheet-depth. Signature moves: odometer price rolls (`rolling-text.tsx`), page steps back to 96% behind sheets, truck selection morph, stage-stepper breathing ring, rows cascading 40ms apart, splash reveal.

### Haptics (`src/lib/haptics.ts`)
Six named tiers: selection (typing/toggles) → tap (light) → choice (medium, selecting cards/tabs) → heavy (weighty commits) → success/error (notifications). Milestone beats on ETA (15/10/5 min) and stage changes — progress is *felt*, not just seen.

### Interaction grammar
- **Tap, don't type**: quantity steppers, day chips, half-hour slots (school hours physically absent from the picker — the invalid state is unreachable), one-tap note chips.
- **One primary dock per screen**; destructive actions get explicit consequences (`cancel-sheet.tsx`).
- **Staleness is verbal**: "Updated 2 min ago" / "Last seen 25 min ago" — never a green dot alone.
- **Accessibility is real**: roles, states, labels, `accessibilityLiveRegion` on status lines, 44pt+ targets with hitSlop.

---

## 4. What the design already gets right (preserve list)

1. **The booking flow's shape** — 5 short steps, each with exactly one decision and one dock; price lives inside the Continue button on the truck step (`price-dock-button.tsx`).
2. **Ride-app route card** (`book/route.tsx`) — pickup/dot/connector/delivery in one card, GPS/map pills, favourites with use-counts. This is the most "familiar" screen and it earns it.
3. **Honest money** — ±10% range, "₹X+" not fake precision, fare breakdown behind one tap, "material cost not included" said twice (truck step chips + review).
4. **The amber status card on Home** — live trip as the first thing after the band, with a real green/neutral dot.
5. **Stage stepper** — food-app progress line with the breathing orange current stage.
6. **Home's restraint** — icon-led tiles, one-word labels, detail in sheets, no bell.
7. **Empty states as states** (`empty-state.tsx`) — intentional, not errors.
8. **Bilingual to the bone** — catalog names, keywords (including Malayalam search terms like 'മണൽ'), locale-aware date parts.

---

## 5. Friction points → refinement plan

### 5.1 Fewer steps (the felt kind)

The flow is structurally 5 steps and that's agreed; the win is making the **default path feel like 3**.

1. **Step 3 (site) hides its optionals.** Today: Now/Later cards, school chip, notes field + 4 quick chips, counter, transit pass all visible. Refine: collapse notes behind an "Add a note for the driver" row (quick chips appear inside it); transit pass stays conditional as now. Default path becomes: Now is preselected → Continue. One decision, one tap.
2. **Step 1's quantity block already fades in under the grid** — good. Refine further: when a tile is tapped, scroll the quantity card into view and focus the stepper so the eye lands on it (the only moment two things compete on this screen).
3. **Express repeat path.** Favourite rows on Home already prefill delivery. Extend `start()` to also carry last-used material+quantity, so "rebook to Kuttanellur" can land on the truck step directly (still passing through review — informed confirmation is not negotiable). This is the biggest honest step-count reduction available.
4. **Step 5 review without navigation for edits** (optional, needs agreement): inline steppers/sheet editors per row instead of `dismissTo` round-trips. The handoff allows combining/splitting as long as validation and re-quote rules hold; a re-quote banner would show when material/quantity changes.
5. **Kill the stale comment** — `booking-layout.tsx` says "step (1–6)"; it's 5.

### 5.2 Nicer grids (one rhythm, everywhere)

Current state: real variety but no shared recipe. Tile heights run 44/48/52/54/56/60/64/68/76; radii run 8→999 in 14 values; gaps run 4/6/8/10/12/14.

1. **Adopt an 8pt rhythm with a 4pt half-step.** Allowed: 4, 8, 12, 16, 20, 24. Map today's 6/10/14/18 paddings onto it. Gaps between sibling tiles: always 8 or 12 — never 10.
2. **One tile scale:** 56 (inputs/actions), 64 (compact stat/filter tiles), 80 (feature tiles). Reconcile 60/68/76 to this. The Live 2×2 grid (`live-view.tsx`, fixed 76) and Profile tiles (60) and Home stats (68) all become 80/64 consciously, not incidentally.
3. **One card recipe:** radius 16, border 1 `#E7E5E4`, white or stone, padding 16. Radius scale collapses to 12 (small: thumbs, chips inside cards) / 16 (cards, tiles) / 20 (sheets, heroes) / full (pills, avatars). Kill the one-offs: 11 (material tile images), 14 (book arrow, stat icons), 18/24 mixing inside one component.
4. **Material grid (`book/material.tsx`)** — the one to make "nice": responsive columns (3 phones / 4–5 tablet) from the measured width instead of fixed `COLUMNS = 3`; image radius 12; consistent 12px gaps; the selected state becomes the canonical selected recipe (§5.3).
5. **Schedule slots** use `width: '31.5%'` — a magic number that only works at one gap. Switch to `flex: 1` three-per-row so the grid survives future copy changes.
6. **Home vertical rhythm:** sections currently use 22/20/16 bottom margins ad hoc → one 24 margin between sections, 12 inside. The two stat tiles can become one slim 64pt strip (On route · Delivered today) — Home loses ~a third of a screen of height without losing information.

### 5.3 One selection language (biggest consistency win)

Today selection is expressed four different ways:
- Material tiles / quick chips: **orange border + `#FFF7ED`**
- Schedule days/slots, Now/Later cards: **night navy fill** (slots) or navy border (cards)
- Filter chips (my-loads, material search): **near-black fill** (`Brand.text` / `Brand.onPrimary`)
- Home status, live dot: amber/green

Refine into a rule:
- **Choices that are answers** (material, truck, day, slot, Now/Later): orange 2px border + `selected` token fill, orange check where space allows.
- **Filter chips** (they filter, not choose): navy fill — distinct from answers, matches chrome.
- **Night navy stays chrome-only** (tab bar, band, hero cards).
Replace stray `#FFF7ED` with `Brand.selected`; add a `selectedBorder`/`selectedFill` pair to `theme.ts` and a `Chip` component so the five hand-rolled chip styles (material, my-loads, route pills, quick notes, searching chips) converge on one.

### 5.4 Type scale

Sizes in use: 11, 12, 13, 14, 15, 16, 17, 19, 20, 22, 24, 26, 28, 30. Collapse to **11 / 13 / 15 / 17 / 20 / 24 / 30** with names (`caption/footnote/body/Callout/title/display`). Section headers are currently 17/800 on Home but 13/700-uppercase in `tab-screen.tsx` — pick one (recommend the uppercase 13 `SectionLabel` for scannability, keep 17/800 only for screen titles). 19 (`booking-layout` title) folds into 20.

### 5.5 Tokenize the strays

A dozen one-off hexes live outside `theme.ts`: three greys for placeholders (`#A8A29E`, `#A39B94`, `#9AA3AE`), three hairlines (`#ECE7E2`, `#EFEAE5`, `#ECE6E0`), plus `#C7CFD9`, `#5B6472`, `#E6EBF1`, `#C4BEB8`, `#FFFBEB`, `#FCD34D`, `#8A5A00`… Consolidate into tokens (`border`, `borderStrong`, `placeholder`, `chrome`, `warnBorder`, `warnText`) so the next screen can't fork the palette. `PressableScale` springs hardcoded (`stiffness: 400, damping: 22`) and several screens inline `springify()` where `SPRING_*` tokens exist — sweep them into `motion.ts`.

### 5.6 Micro-fixes (pick up while refining)

- `price-dock-button.tsx` fires `successHaptic()` on Continue — success notification is for real commits (booking placed, receipt); Continue should be `tapHaptic`.
- `.web.tsx`/web-only `outlineWidth: 0` on TextInputs is fine, but search field in `material.tsx` lacks a clear (×) affordance; `route.tsx` has one — align.
- `TabScreen` 520 vs booking 560 content width: unify on 560 (or 520) so tiles align visually across contexts.
- Contrast: 13px `Brand.muted` on `Brand.surface` is ~4.3:1 — acceptable for weight-600+ but keep an eye on it in Malayalam at 12–13px.
- `my-loads.tsx` chip `borderWidth: 1` vs material chips `1.5` — the Chip component (§5.3) ends this class of drift.

---

## 6. Design principles I will follow when designing

1. **One decision per screen; one orange button per screen.**
2. **Tap beats type; invalid states should be unreachable** (school hours absent from the picker is the model).
3. **Money is a range and transport-only; never let UI imply a fixed quote or an in-app payment.**
4. **Staleness and failure speak in words; a map may fail while trip text survives.**
5. **Detail lives one tap away** (sheets over pages), but **consequences stay explicit** (cancel charges, sign-out lock).
6. **Motion explains, never decorates**: exits faster than entrances, springs on things under the thumb, reduced-motion respected.
7. **Bilingual from the first sketch** — if a Malayalam label doesn't fit the grid, the grid is wrong, not the label.

## 7. Constraints I will not break (from `CLAUDE.md` / handoff)

The 14 business rules (service-area check, one material + one vehicle, system-computed eligibility/price, 30-min included waiting, 5-min search with 1-min expansion, first acceptance wins, no jobs while reserved, server-validated progress, distinct cancel/release/intervene, sign-out lock, independent map/ETA/GPS, admin-gated skips, no road-width question). No invented features (no in-app payment, chat, wallet, OTP-in-UI promises). 24px margins, 56pt dock, English+Malayalam only, "customer" never "buyer".

## 8. Priority order for the next working session

| # | Refinement | Effort | Payoff |
|---|---|---|---|
| 1 | Chip/Card/Tile recipes + token consolidation (§5.2.3, §5.3, §5.5) | M | Kills 80% of visual drift; every future screen inherits consistency |
| 2 | Step 3 collapse + default path polish (§5.1.1–2) | S | Booking feels 2 steps shorter |
| 3 | Express repeat from favourites (§5.1.3) | M | The real step-count win for the core loop |
| 4 | Material grid responsive + rhythm pass on Home (§5.2.4, §5.2.6) | M | The "nicer grids" ask, visibly delivered |
| 5 | Type scale + micro-fixes (§5.4, §5.6) | S | Polish layer |

*Ready to design against this. Next step when you say go: implement #1 (tokens + shared components), then re-skin existing screens onto them before any new screens are drawn.*
