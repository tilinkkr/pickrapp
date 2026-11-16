# Pilot APK analysis (0.9.7, customer + driver)

Read 2026-11-09 from `pickr-customer-0.9.7-pilot.apk` and `pickr-driver-0.9.7-pilot.apk`. Both are Capacitor shells around **the same web bundle** (`index-p58H_EUQ.js`, byte-identical); the role is chosen at runtime. So the customer and driver apps share one data model and one API. This app must speak that model to work with the driver app.

## 1. Booking status machine (server-owned)

```
SEARCHING ─accept─► ACCEPTED ─arrive─► AT_PICKUP ─start trip─► IN_TRANSIT ─arrive─► AT_DROP ─unloaded─► COMPLETED
    │                  │  ▲                 │                                                        │
    │ 5 min, no taker  │  └── RELEASE ──────┘ (driver, before IN_TRANSIT: back to SEARCHING)          payment_status
    ▼                  ▼                                                                             pending → paid
 NO_DRIVERS        CANCELLED (customer before AT_PICKUP; admin any non-terminal)
```

| Pilot status | This app's stage | Owner of the next move |
|---|---|---|
| (payload.schedule) | `scheduled` | system starts the search at the scheduled time |
| SEARCHING | `searching` | driver accepts (`offers/{id}`); customer may cancel free |
| ACCEPTED | `to_pickup` | driver: arrive, or RELEASE; customer: cancel (₹100 / 10% fee) |
| AT_PICKUP | `loading` | driver: load photos (2–8, skip recorded) → start trip, or RELEASE |
| IN_TRANSIT | `in_transit` | driver: arrive at drop; no release |
| AT_DROP | `unloading` | driver: unloading finished |
| COMPLETED + pending | `payment_due` | driver: payment received (cash / UPI + ref) |
| COMPLETED + paid | `completed` | — receipt, feedback |
| CANCELLED / NO_DRIVERS | `cancelled` / `no_driver` | customer: retry / repeat |

Timestamps the bundle reads: `search_started_at`, `pickup_at` (arrived at pickup), `started_at`, `drop_at` (arrived at drop), `completed_at`, `paid_at`.

Driver moves go through `POST /api/bookings/{id}/action` with `{ action }` (seen: `RELEASE` with a reason; the rest are the stage buttons). Other routes: `bookings`, `quote`, `voice/parse`, `sites`, `upload`, `file?path=`, `geocode`, `reverse-geocode`, `map/config`, `driver/position`, `driver/availability`, `driver/onboard`, `offers/{id}`, `road-reports`, `logout`, `health`.

## 2. Money

- Quote lines: **Base fare, Distance charge, Loading helpers, Waiting, Time adjustment, Platform fee, GST**. Material cost is excluded.
- Waiting: 30 min free at each site, then **₹4/min (small trucks) or ₹8/min (large)**. The countdown is `1800 − (now − pickup_at | drop_at)` seconds.
- Customer cancellation after acceptance: **₹100 or 10%**. Free while searching.
- Payment is outside the app (cash / direct UPI); the driver records it, which flips `payment_status` to `paid`.
- No rain or weather surcharge exists in the pilot. This app shows one as a **demo** line only.

## 3. Booking payload

`materialId, quantity, unit, vehicleTypeId, pickup{label,lat,lng}, drop{…}, schedule, helpers, notes, transitPass, loadPhotos[], photosSkipped`. The trip card everywhere shows `material · quantity`, the route, the stage chip and, once paid, the amount.

## 4. Voice booking

`Speak to book` → a guided conversation that fills **slots**: material, quantity + unit, pickup text, drop text, time (and helpers). `voice/parse` turns speech or typed text into slots; answered slots show as chips above the next question; every slot is editable; "Type instead" is always offered; TTS reads questions (`speechSynthesis` or the native bridge). Places spoken by voice are then confirmed on the map, never trusted as-is.

## 5. What the pilot does well, and what we change

Keep: one shared status model, stage chip colours by meaning (searching = neutral, at a site = amber, done = green, failed = red), the 30-minute countdown at sites, load photos as evidence, honest "Demo"/"pilot" labels.

Fix in this app: grids that repeat the same facts (route, load and truck appear three times on one screen), long sentences in tiles, buttons that carry paragraphs, no loads detail view, no way back into a finished trip's evidence (photos, times, breakdown), no consent record for personal data (DPDP Act 2023).
