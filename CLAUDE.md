@AGENTS.md

# PICKR design source of truth

The functional UI/UX requirements for this app are in `docs/UI_UX_DESIGNER_HANDOFF.md`. Treat it as the spec for every screen.

Before implementing or changing any screen:

1. Find its screen ID in the handoff (C01–C23 customer, D01–D18 driver, A01–A15 admin) and the shared states in section 8.
2. Check the flow: where the user comes from, required inputs, primary and secondary actions, the next destination, back behaviour and which role owns each action (section 9 permission matrix).
3. Preserve the 14 business rules in section 3. Never hide payment due, location staleness, unverified driver access or the consequences of destructive actions.
4. Build the loading, empty, error, offline/stale and permission-denied variants the spec lists, not only the happy path.
5. Don't add anything section 11 says isn't implemented (in-app payment, OTP, chat, wallet, inventory and so on).
6. Design for Malayalam-speaking drivers outdoors: English + Malayalam, large touch targets, full unit labels, short action labels.

Visual style, colours and layout are free choices. Function, rules and flow are not.

## Decisions that override the handoff (agreed 2026-11-03)

- **Login uses OTP, on two minimal screens:** `/auth` takes the mobile number and sends the code; `/otp` verifies it and goes to Home. No step badges, progress bars or explanatory paragraphs on these screens; white canvas, sticky bottom action dock. New customers then complete `/register` (photo optional; name, email, Individual/Business customer, terms), which is where the C01 name is collected. Say "customer", never "buyer": Pickr is transport, not a store. Until an SMS backend exists, `src/lib/otp.ts` is a stub; keep the stub obvious in code.
- **Guest mode exists:** guests can browse truck types and estimates. Booking still requires sign-in.
- **Customer tabs (four, not the handoff's three):** Home, Loads (ongoing + past trips, C21), Requests (scheduled bookings and live searches, C11/C12), Profile (C23), on a compact floating navy pill (Uber-style, 2026-11-04): icon + one-word label, a lighter pill glides under the active tab.
- **Home (2026-11-04, Zomato-style header without search):** a navy band with the top site or current location (name, chevron, one-line address), a language icon and the avatar, and an orange "Book a truck" bar where search would be. Below on white: amber live-trip status, four material tiles, a truck row (opens a sheet), two stat tiles and favourite sites as compact rows. No bell. Compact, icon-led tiles with one-word labels; detail goes in sheets.
- **Booking flow: 5 short steps** (`src/app/book/`), each showing "Step n of 5": material + quantity (`material`) → pickup and delivery together in one ride-app card (`route`, with Select on map / Current location and favourites) → when and notes (`site`: Now/Later cards, tappable day chips + morning/afternoon/evening half-hour slots with school hours left out, optional notes with one-tap note chips, transit pass when needed) → truck (`truck`: a demo route map on top, compact rows, the recommended truck first, others behind "Find more trucks", price rolling inside the Continue button) → review (`review`: icon rows with edit pencils, the estimate with icon facts, fare breakdown behind a tap; the confirm button shows only the action and price, and a time that has gone stale blocks confirming). The draft is saved on the phone (`pickr.draft`); Home shows "Continue your booking" and "Book a truck" resumes rather than wiping it. `map` is the full-screen pin picker (react-native-maps, with a `.web.tsx` fallback). The catalogue and vehicles live in `src/lib/catalog.ts`. Sand is trimmed to M-Sand, P-Sand and River Sand, with no long descriptions. The ₹ shown is the **transport** price, never material cost, and estimates are a ±10% range.
- **Favourites** are the most-booked sites (`src/lib/sites.tsx`): pinned first, then by use count. They appear on Home and in the pickup/delivery steps.
- **Motion** (2026-11-08): shared springs and timings in `src/lib/motion.ts`; tiered haptics in `src/lib/haptics.ts`; screens push with an iOS-style parallax (`ios_from_right`); any bottom sheet sets the page behind it back to 96% (`src/components/ui/sheet-depth.tsx`); truck selection morphs fill/border, "drives in" the photo and springs the check; prices roll like an odometer (`rolling-text.tsx`). Everything is a separate sub-animation on transform/opacity, and reduced motion is respected.
- **Order flow animations** (`src/app/trip/[id].tsx`, `src/components/trip/`): confirm morph → trip screen slides up → Rapido/Swiggy-style search (`search-map.tsx`: illustrated map, breathing pickup pin with ripples, nearby trucks drifting and lighting up in turn; sheet with a sweeping progress bar and a rolling status line) → "Driver found" badge → live tracking (`track-map.tsx`: the truck glides along the route between updates with an ETA bubble; `stage-stepper.tsx`: Booked → Coming → Loading → On the way → Unloading) with rows cascading in 40 ms apart → delivered seal peel with confetti → receipt only after payment is confirmed. Illustrated maps are always tagged "Demo map" (rule 12).
- **School-hour safety:** no truck starts 8:00–10:00 AM or 2:30–4:00 PM (`src/lib/schedule.ts`). ASAP is refused inside a window; scheduled times inside one are rejected.
- **Trips:** submitted requests are saved on the phone (`src/lib/trips.tsx`) until a backend exists. A dev-only Profile switch adds demo trips, including an active one; with it on, Continue/Submit lock and sign-out is blocked (rules 8 and 11). Until real drivers exist, `src/lib/simulate.ts` drives a "(demo)" driver through the stages; its controls only appear in development.
- **Photos:** material and vehicle photos are WebP files in `assets/images/catalog/` (mapped in `src/constants/images.ts`), always labelled as representative. The Bolero pickup, 14ft lorry, Taurus and 17ft lorry photos are Canva-generated Kerala scenes (2026-11-08). `ImagePlaceholder` still draws a gradient when a photo is missing.
- **Trucks use Kerala names** in their second line (407 tipper, 1109 tipper, Ace, Bolero pickup, Mini lorry (Eicher), 17 ft lorry, Taurus). The 17ft Closed Body from the handoff is in the catalogue for bricks and blocks.
- **Languages:** English and Malayalam only.
- **Layout:** 24 px side margins on every screen, one 56 pt main button per screen in a sticky dock, no element wider than the screen, no large empty gaps.
- **Palette (Signal Orange on white, 2026-11-04):** primary/buttons `#F97316`, button text `#1F1F1F`, page background `#FFFFFF`, surfaces (tiles, inputs) `#F5F5F4`, body text `#1C1917`, selected fill `#FFEDD5`, chrome (navbar, Home band) logo navy `#0B1520`. Tokens live in `src/constants/theme.ts`.
- **Logo:** amber truck with speed lines, "PICKR" wordmark, "HEAVY LOGISTICS" tagline, on a dark navy background. The vector version is `src/components/brand/`.

## Decisions agreed 2026-11-09/10 (override the earlier bullets above where they conflict)

- **Orange and white only:** no navy chrome and no yellow. The Home band, navbar and logo use orange/white. Light and dark modes come from `src/lib/app-theme.tsx` (`useBrand`, `makeStyles`). The toggle lives in Profile › Theme (Auto/Light/Dark), stored in `pickr.theme`.
- **Booking steps auto-advance:** there are no Continue buttons on the booking steps. Tapping a choice moves on. Review keeps its one confirm button.
- **DPDP Act consent:**
  - Register collects consent for bookings (required), location and WhatsApp (optional).
  - Profile › Privacy & data lets the customer withdraw optional consent; every change is time-stamped.
- **Fare split** (`src/lib/fare.ts`):
  - Base, distance, a rain surcharge (with a rain animation), platform fee and GST.
  - 30 free minutes per site, then ₹4/min (small trucks) or ₹8/min.
  - A countdown ring shows at pickup and at drop.
  - The "30 min free" chip is gone.
- **Home and Loads:**
  - The active delivery shows in the live bar above the navbar on every tab (see Live bar below).
  - There is no "Delivered today" grid.
  - Loads cards open `/loads/[id]`, with "See more" for times, the fare breakdown, the driver, the plate, a map and photos.
- **Voice booking** (`/book/voice`): a guided EN/ML conversation fills material, quantity, pickup, drop and time, then opens the truck step.
- **Profile (Rapido-style hub):**
  - An identity card with the rating, then rows that open the `src/app/profile/*` pages: help, rides, payment, coins, truck-pass, notifications, favourites, theme, privacy, about, account and rating.
  - "Get help" is the one blue button.
  - Items that are demo or not live yet (handoff section 11), labelled as such in the UI:
    - the wallet balance, recharge and coins;
    - the rating;
    - help tickets and emailed ride history;
    - the store and Facebook links ("Soon").
  - The preferred payment method (Google Pay / WhatsApp Pay / Cash) is saved on the profile, shown on Review and recorded on the trip; the customer still pays the driver directly.
- **Navbar:** a smaller pill (56 pt, 20 pt icons) with a visible border and a near-solid fill; page content fades out behind it rather than showing through.
- **Trip state machine (2026-11-11, matches the pilot APK):**
  - Every stage change goes through `src/lib/trip-machine.ts`: events are `START_SEARCH`, `ACCEPT`, `LOCATION`, `ARRIVE_PICKUP`, `START_TRIP`, `ARRIVE_DROP`, `UNLOADED`, `PAID`, `RELEASE`, `CANCEL` and `EXPIRE`. Each has its valid source stages and its pilot server action. Send them with `useTrips().dispatch`; don't patch `stage` directly.
  - The cancel charge is 0 while searching and `min(₹100, 10% of fare)` once a driver has accepted (pilot config). It's shown before confirming and recorded on the trip.
  - The search timer counts from `max(searchStartedAt, scheduled time)`, so a retry never overwrites the booking time.
  - A driver release clears the driver, plate and pickup clock and returns the customer to searching, with a notice.
- **Trips keep running app-wide:** `src/lib/trip-runner.tsx` (mounted in `_layout.tsx`) starts scheduled searches at their time, expires searches after five minutes, and runs the demo driver.
- **Live trip screen:**
  - One page per stage, swapped with a shared-axis transition (`src/lib/transitions.ts`: the old page slides left and fades, the new one springs in from the right). The pages never stack.
  - The stage strip stays fixed above the pages. The sheet scrolls up over the map, which drifts up and dims.
  - Each page has a title, one hero (the big ETA, or the free-time ring) and **one** glass grid (`src/components/ui/glass.tsx`) holding only that stage's facts, with the driver as its last row. It has at most one action: cancel (Coming only) and the details link.
- **Zoom in/out:** the trip screen zooms up when opened. The minimise chevron shrinks it toward the bottom, then returns to the tabs.
- **Live bar:** a frosted bar above the navbar on every tab (`LiveTripBar` in `src/components/home/active-delivery.tsx`). It shows the stage icon with a pulse and one live number (ETA or countdown), and tapping it zooms the trip back up. Home no longer has a separate live-trip card.
- **Icons:** Material Design icons (`@expo/vector-icons` MaterialCommunityIcons, via `src/components/ui/m-icon.tsx`) for anything identified at a glance: stages, driver, truck, timer and route. These are the same family the pilot driver app uses. Lucide line icons stay for navigation and settings rows. No emoji or 3D icons, and no "$" imagery.

## Decisions agreed 2026-11-11

- **Quantity:** three one-tap amounts (1, 2, 3 units; 500/1,000/2,000 bricks; 100/200/500 blocks) and a box to type any other amount, checked against the material's limits. Each chip shows the number, the unit word and, for bulk, the cubic feet.
- **Transit pass step:** materials that need a KOMPAS pass (river sand, jelly, soil) get a sixth step, `/book/pass`, before Review. It takes the pass number and a photo (camera or gallery). Review is locked until both are in. M-Sand and P-Sand don't need it.
- **Stage names:** "On the way" means the driver is heading to pickup, and "Delivering" means the load is moving. Page titles show the full address on two lines, never a fragment such as a door number.
- **Load photos (driver ↔ customer):**
  - The driver app sends `PHOTO_ADDED` once each upload is acknowledged.
  - `START_TRIP` is refused until two photos are in, unless a pilot skip is recorded.
  - The customer sees two slots filling live while loading, then the two photos on the Delivering page.
- **Driver card (On the way):** the driver's name and verification at the top, a four-digit start PIN on the side, track-record tags (only when the server sends real numbers; the demo driver's are demo), then the truck and a call button under a separator. The PIN goes against the handoff's "no OTP" scope (section 11); it was requested by the product owner, is labelled Demo, and is generated locally until the server issues it.
- **Trip completed / payment:** "Delivered" appears as orange text on white (no orange box), with the amount and three ways to pay the driver (Google Pay, WhatsApp Pay, Cash). This is informational only, with no in-app payment. Then a calm "waiting for the driver to confirm".
- **Receipt:** a short "payment received" grid, then a white paper receipt that prints out of a slot. It has dashed rules, a torn edge and very few words. Paper stays white in dark mode.
- **Favourites:** + adds a site (name and address), tapping a site edits it, and deleting asks for a second tap. Pins stay.
- **Voice agent:**
  - Siri-like: a blurred orb of warm blobs, a large question, a glowing screen edge while listening, and a five-segment progress line.
  - One sentence can fill every slot ("2 units M-Sand from Ollur to Ayyanthole now") and jump straight to the truck step. Anything missing is asked one at a time.
- **Calm motion:** no shaking, tilting, bouncing or bobbing. Springs settle without overshoot, and haptics are one step lighter.
- **Background:** a soft orange wash fading into white behind the top of booking and profile pages (about one part orange to nine parts white).

## Decisions agreed 2026-11-13/14 (override earlier bullets where they conflict)

- **Press feedback:** cards and buttons only dim when touched. Nothing shrinks, bounces or jumps (`PressableScale` is now a plain dim).
- **Trip cards** (`src/components/trips/trip-card.tsx`): a three-band ticket split by hairlines: what and amount, from → to, date/time and status. Dates use `formatDay` and `formatTime`, so they are never cut short. Cancelled and "no truck" are the only red.
- **Requests tab:** two groups, Pending (scheduled, searching) and Cancelled or no truck (red), as compact rows.
- **Load record** (`/loads/[id]`): demo map on top, with a sheet of separate cards sliding over it (summary, route, driver and truck, two load photos, timeline, fare). Completed trips without photos show catalogue pictures tagged "Demo".
- **Trip flow (ride-app pattern), one state per page, no stage strip:**
  - Finding a truck: a centred title, one progress bar and one "meet at" card.
  - Driver on the way: "Pickup in N min", a full-width PIN bar, the meet card, then the driver card (name, verification, plate large on the right, trust tags, a wide Call button).
  - The sheet grows and shrinks per state (`HERO_SHARE` in `src/app/trip/[id].tsx`).
- **Fixed fare:** the truck step, Review and trip screens show one transport fare, not a range. Waiting beyond the free time is still charged extra and is stated (rule 5); this is the product owner's choice over the handoff's "estimate" wording (rule 4).
- **Quantity:** a sideways number wheel that snaps to valid amounts, with 1/2/3 quick picks. No keyboard.
- **Time step:** one question, two full-width rows (Now, Schedule) with a radio. No lightning-bolt icon.
- **Catalogue:** ten more Kerala materials (6 mm jelly, quarry dust, GSB, rubble, laterite, solid blocks, interlock, AAC blocks, red earth, gravel). They have no photos yet and show the gradient placeholder.
- **Home:** "See all" opens the full materials menu; truck tiles show the name and capacity in full; the #go pickr art fades into the page at the very end of the scroll.
- **Favourites:** each site has visible Pin, Edit, Map and Delete buttons; sites can be added or moved on the map (`/book/map?purpose=favourite`).
- **Service states** (`src/lib/service-status.ts`, `/service`): no internet, heavy rain, all trucks busy, service paused, outside the service area. Demo until real sources call `setServiceStatus`; a dev row in Profile steps through them.
- **Voice agent:** opens as a bottom sheet over the current screen. Parsing lives in `src/lib/voice.ts`; `parseUtterance` is the single hook for the backend's `voice/parse`.
- **Dark mode:** brighter orange text and a stronger orange fill; stage colours come from the active palette.
- **Profile:** Help is the last row.

## Decisions agreed 2026-11-14 (override earlier bullets where they conflict)

- **No colour mixing:** no orange-to-white gradients and no frosted blur. A section is either white or solid orange. `GlowBackdrop` is gone, and "glass" cards are now solid outlined cards.
- **Grids** (`src/components/ui/glass.tsx`: `GlassCard`, `GlassRow`, `GlassCell`, `InfoRow`, `ActionCell`): one outlined card, rows and cells split by 1 px lines that meet the card edge, 16 px inset, icons in one fixed 40 px column. `accent` (orange outline, pale orange fill) marks the most important grid on a page.
- **Live trip pages:** a centred headline, then grids 12 px apart in order of importance.
  - On the way: PIN bar, driver/truck/track-record grid, pickup and payment grid, then Call driver | Cancel booking as one two-cell grid.
  - Delivering: destination with progress (accent), distance and location age, driver with Call, load photos.
  - Loading / unloading: the timer ring, waiting cost grid, driver with Call, photos.
- **Nothing jumps:** a stage change fades the new page in (the old one leaves at once); bottom sheets slide without a spring, and the page behind a sheet no longer scales back.
- **Trip details sheet:** three titled grids (route, load and truck, fare).
- **Loads tab:** the month's numbers are one three-cell grid; "All" is split into Ongoing and Past sections.
- **Home location header:** tapping it asks for location access (or opens Settings) and refreshes the place. It no longer starts a booking.

## Decisions agreed 2026-11-17 (override earlier bullets where they conflict)

- **Motion system** (`src/theme/motionTokens.ts`, re-exported from `src/lib/motion.ts`):
  - Curves from Uber Base: `CURVE.decelerate` for arrivals, `CURVE.accelerate` for exits, `CURVE.standard` for moves across the screen.
  - `DURATION` tokens of 100–400 ms, following Swiggy's 100–300 ms mobile range.
  - Swiggy's choreography: what leaves goes first and fastest, and children follow their parent.
  - Every spring is critically damped (`dampingRatio: 1`). Never pass `damping` alone and never `.springify()` an entrance: Reanimated 4's defaults (mass 4, stiffness 900) make that wobble four or five times.
  - Use `enterAt(index, delay)` (fade plus an 8 px rise), `fadeAt`, `popIn` and `ruleIn`, never raw `FadeInDown` (25 px).
  - On web the helpers fall back to stock presets. Reanimated web pins custom entrances as absolute boxes once they end, which breaks reflow.
- **Grids load as one piece** (`GlassCard index`):
  - The card rises at `cardDelay(index)`.
  - Its rows fade in 40 ms apart.
  - Each divider (`GlassRule`) rules itself in from its start edge.
  - Live updates never replay it.
- **Haptics:**
  - Android uses the system haptics engine (`performAndroidHapticsAsync`). The vibration-motor calls felt like the phone shaking.
  - Taps and choices share the lightest tick.
  - Only results are felt: booking sent, driver found, work done, paid, no truck.
  - Auto-advance, stage changes and ETA updates are seen, not felt.
- **Calm search map:** nothing bobs, pans or orbits. It has two slow rings, near-still trucks lighting up in turn, and no-overshoot badges.
- **Map picker** (`/book/map`, C05):
  - The pin lifts 14 px while the map moves (a dot marks the exact point), settles on the standard curve with one landing ring, and a "Pickup here" label rises back in.
  - The address card holds a fixed height and shows skeleton bars while resolving. Answers for old pin positions are dropped.
  - Android needs location permission to geocode, so "Allow" is offered inline and the pin is kept either way.
  - GPS gives up after 12 s and never re-centres once the customer has moved the map.
  - A saved site within 60 m is offered ("Use").
  - Web gets a pannable demo map tagged "Demo map".
- **Service area** (rule 1, DEMO): a Kerala outline in `src/lib/service-area.ts` until the server sends admin areas.
  - The map shows inside/outside on every pin and blocks Confirm outside, with "Go to Thrissur" to recover.
  - "Current location" refuses a GPS fix outside the area.
- **Booking for someone else** (Uber's rider switch, Porter's receiver details):
  - A "For me ▾" chip sits on the route step, and Review has a row with a pencil.
  - The sheet offers Me, recent people (`pickr.people`, last five, phone only) or someone new: name, 10-digit mobile, where they meet the truck (Drop, Pickup or Both) and who pays the driver (I pay or They pay).
  - The person is saved as `trip.forOther`. Live pages show a "Booked for" grid with Call and Share trip, and the details sheet, searching card, payment and loads card name them.
  - "Share trip" opens the phone's share sheet; Pickr sends no message. The start PIN is included only when they meet the truck at pickup.
  - Payment is still direct to the driver either way. The sheet says the number goes to the driver for this trip only (DPDP).

@docs/UI_UX_DESIGNER_HANDOFF.md
