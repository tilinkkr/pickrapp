# PICKR — functional UI/UX designer handoff

Prepared 1 November 2026 from the current application source. This describes the implemented product, including pilot exceptions. It is not a proposal for additional features or a claim that every integration is production-ready.

## 1. Design assignment and freedom

Redesign the complete customer app, driver app and admin website while preserving their functional purposes, business rules and connected journeys. This document intentionally does not prescribe colors, themes, visual styling, component positions or existing page layouts.

The numbered screens below are functional destinations/states, not mandatory separate physical pages. A designer may combine related information, split an overloaded screen, use a sheet instead of a page, or change navigation patterns. Preserve the information, available actions, validation, consequences and progression described for each destination. In particular, do not hide payment due, location staleness, unverified driver access or destructive-action consequences.

Target users include Malayalam-speaking truck drivers, contractors, site supervisors and customers arranging construction-material transfers. English and Malayalam are supported. Use familiar words, full unit labels and short action labels. Avoid abbreviations such as “nos” in user-facing questions. Drivers use the app outdoors and around work sites: prioritize readable information, large touch targets and unmistakable next actions.

The pilot transports construction materials and transfers between sites. It is a transport-booking service, not a store selling materials. There is no inventory-management or materials-shopping journey in the current product.

## 2. Product structure

| Surface | Audience | Purpose | Entry |
|---|---|---|---|
| Customer app | People booking transport | Describe load, choose sites and truck, book, track, pay driver, view history | Customer Android APK; `/customer` on web |
| Driver app | Truck drivers | Register truck, submit documents, become available, accept and execute jobs | Separate driver Android APK; `/driver` on web |
| Admin console | PICKR operators | Monitor dispatch, manage drivers/accounts/areas, intervene in trips and inspect system readiness | `/admin` on web |

Customer and driver apps share functional components and backend data, but have separate entry points and permissions. Android packages bundle their interface and connect to the backend. The web version supports testing and foreground operation. Android additionally supports location services, notifications, optional floating job alerts, camera/file access, speech integration and opening external navigation. Do not imply equivalent background reliability in a browser.

### Core records, in product language

- **Account:** name, phone, role and enabled/disabled status.
- **Driver profile:** truck category, vehicle number, measurements, documents, approval, availability and last location.
- **Service area:** named geographical boundary, active or paused.
- **Saved site:** customer-chosen name, address and map coordinates.
- **Booking/trip:** customer, load, pickup, delivery, selected truck category, time, instructions, price, assigned driver and progress.
- **Offer:** a booking shown to eligible drivers during a search. Multiple drivers can see it; only one can win acceptance.
- **Payment record:** driver confirmation of direct cash/UPI collection. It is not an online payment transaction.
- **Road report:** location-based issue submitted for operator review.
- **Activity record:** timestamped operational changes used by admin for support and traceability.

## 3. Rules every design must preserve

1. Pickup and delivery must both be inside active service areas. Customers may book remotely; their physical location normally does not restrict booking. An admin setting can explicitly enable device-location restrictions.
2. One material category and one vehicle category are selected for a booking. Mixed/Other is a catalogue choice, not a multi-select interface.
3. Truck eligibility and prices are calculated by the system. Voice assistance collects information; it does not invent prices or override eligibility.
4. A quote is an estimate for transport, excluding material purchase cost. Final waiting charges depend on actual loading/unloading duration.
5. Each site has 30 minutes of included loading/unloading time. Additional waiting uses the selected vehicle’s configured rate.
6. Search expands once per minute and expires after five minutes. Admin controls initial radius and the increment.
7. First valid acceptance wins. A declined request must not reappear to that driver in the same search session.
8. A driver with an active job receives no new jobs. Work completion alone does not release the driver: payment must also be confirmed.
9. Trip progress is validated by the server. Tapping a button is not success until acknowledged.
10. Customer cancellation, driver release and admin intervention are distinct actions with different permissions and outcomes.
11. Normal sign-out is blocked during an active trip or unpaid completed job. Truck editing is also blocked for a reserved driver.
12. Location, ETA and map availability are independent. A map can fail while trip details remain usable; a visible vehicle marker may be old.
13. Pilot skip controls only appear when enabled by admin, and skipped verification/photos remain explicitly recorded.
14. The road-width question has been removed from new manual/voice booking. Older bookings or explicitly supplied narrow-access information may still carry an access warning.

## 4. Connected end-to-end journey

Customer signs in → describes load manually or by voice → confirms pickup → confirms delivery → supplies site instructions and time → reviews eligible trucks and price → confirms booking.

For an immediate booking: searching begins → eligible drivers receive offers → first driver accepts → customer sees assigned driver and tracking → driver travels to pickup → marks arrival → loading timer starts → driver adds load photos → starts delivery → customer tracks progress → driver marks arrival at delivery → unloading timer starts → driver marks work finished → final amount is shown → customer pays driver directly → driver confirms receipt → driver is released for new jobs → customer receives receipt and can leave feedback.

For a scheduled booking: confirmation first creates a waiting/scheduled state. The UI must distinguish a saved future request from a truck already assigned. Driver search is associated with the scheduled start, followed by the same execution flow.

If no driver accepts: show No truck found, preserve trip information, allow a fresh five-minute retry or return home. Historical trips can also be repeated as a new booking with a fresh price review.

## 5. Customer screens and states

### C01 — Sign in

**Purpose:** identify the customer for the pilot.

**Content and inputs:** PICKR identity, brief service description, English/Malayalam language choice, name, Indian mobile number with country-code context, pilot notice explaining that the number is not OTP-verified.

**Actions:** Continue; change language. Android also exposes a testing-only backend-connection section with server URL and save action; keep this separate from normal customer onboarding.

**Progression:** successful sign-in loads the account and opens Home. Returning sessions load automatically. Invalid phone/name, disabled account, server failure and loading must have explicit states. There is no customer password, OTP, social login or password-recovery journey currently implemented.

### C02 — Home/dashboard

**Purpose:** help a customer start a booking or resume the current trip.

**Elements:** current location label and address, refresh/location action, customer greeting, service-area information/check action, account access, language access, construction-service introductory content, Book a truck, Speak to book, truck catalogue preview, show-all/show-less catalogue action, actual active/completed trip counts, payment and included-waiting explanations.

**Truck details:** selecting a catalogue vehicle shows its image, name, capacity/volume, representative-image explanation and Start booking/Close actions. This preview is not a guarantee of live availability or a binding selection; the booking flow determines suitable options.

**Active-trip variant:** stage, trip code, sites, material/quantity, truck, available ETA, last location update and View trip. Starting another booking is blocked until the current trip and payment finish.

**Paused variant:** explain that new bookings are paused, retain access to existing trips and history. No-active-service-area state also prevents new bookings.

**Location variants:** locating, address available, permission denied, GPS unavailable and reverse-address failure. The customer can still search for sites manually when device location is unavailable.

**Primary navigation destinations:** Home, Trips and Account. Their placement is the designer’s choice.

### C03 — Load/material and quantity

**Purpose:** define what is being transported.

**Elements:** booking progress, back action, material search, image/name choices, selected-state indicator, show-more/show-less materials, quantity input, increase/decrease controls, current unit and minimum-quantity guidance, transit-pass reminder when applicable, Continue and Speak to book alternative.

**Behaviour:** exactly one material selected. Selecting a different material resets quantity to that material’s minimum. Quantity must meet the catalogue minimum. Search includes material synonyms. The initial subset contains six categories; all categories remain available.

**Current catalogue:** M-Sand, P-Sand, River Sand, 20mm Jelly, 40mm Jelly, 10mm Jelly, Mud/Soil, Debris/Waste, Cement, TMT Steel, Bricks, Hollow Blocks, Tiles, Pipes, Wood/Shuttering and Mixed/Other.

**Units:** sand/aggregate use bulk units (1 unit = 100 CFT); cement uses bags; bricks/blocks use numbers; tiles use boxes; pipes use bundles; several materials use loads. TMT Steel currently uses kilograms in the source catalogue—retain this as a documented implementation exception rather than assuming every material uses bulk units.

**Next:** pickup selection. Draft values are retained locally during the booking flow.

### C04 — Pickup selection

**Purpose:** identify the exact loading site.

**Elements:** place/address search input and search action, search results with location name and address, one Select on map action, up to five recent/saved locations, selected-location summary, serviceability status, optional naming/saving of the selected site, Confirm pickup.

**Behaviour:** choosing a result or recent site selects its coordinates. Addresses in compact lists are limited to two lines. Do not present raw coordinates as the normal user-facing address. Search must distinguish loading, no matches and service failure.

**Next:** delivery selection. Confirmation is disabled until a serviceable location is selected.

### C05 — Full-screen location selection (shared with delivery and saved sites)

**Purpose:** precisely position a site entrance or meeting point.

**Elements:** location-purpose title, close/back, map, fixed central pin, instruction to move the map underneath the pin, zoom controls, use-current-location action, selected place/address summary, inside/outside service-area status, address-resolution progress and Confirm location.

**Pickup default:** if no pickup has already been selected, request current GPS and start there. If a site already exists, preserve it. Delivery does not automatically replace its position with customer GPS.

**Behaviour:** panning/zooming changes the point beneath the pin; the address is resolved after movement. A GPS loading state offers a manual-map alternative. Do not repeatedly re-center the map while the user is positioning it.

**Failures:** permission denied, GPS timeout, unavailable map, address unavailable, outside area and stale request results. Preserve a valid coordinate even when address lookup fails, with an honest explanation. Confirm is blocked while locating/moving/resolving or outside the active area.

**Exit:** confirmation returns the chosen point to the calling screen; closing dismisses the unfinished map selection.

### C06 — Delivery selection

**Purpose:** select the unloading destination.

Same search, recent places, map and save-site capabilities as pickup. Also show pickup context and a Change pickup action. Confirm delivery requires a serviceable point and leads to Site details.

### C07 — Site details and timing

**Purpose:** capture practical instructions and when the truck is needed.

**Elements:** pickup/delivery summaries; optional site instructions (gate, approach, contact guidance; currently up to 1,000 characters); loading/unloading-help choice where relevant; mineral transit-pass number and reminder for applicable materials; Now/Schedule choice; Continue.

**Conditional elements:** self-tipping materials do not show the helper choice. The removed road-width question must not be reintroduced as a mandatory step.

**Schedule state:** seven date choices starting today, then hour/minute/AM-PM selection in India Standard Time. A future time is required; selecting a past time shows an error. The designer may choose a different accessible date/time control while preserving the same selection scope and validation.

**Next:** the app checks sites, requests a route and calculates eligible truck quotes. Show a clear checking-price state, disable duplicate submissions and retain entered details on failure.

### C08 — Choose truck

**Purpose:** compare suitable truck options and choose one.

**Elements:** material and quantity summary, estimated route distance and duration, eligible vehicle choices, vehicle image/name/local terminology, capacity/volume, recommended indicator and explanation, estimated price per option, single selection, route-estimate details and Continue with selected truck.

**Current vehicle categories:** Pickup Auto, Tata Ace, Bolero Pickup, 14ft Lorry, 17ft Closed Body, Tipper Lorry (1 unit), Medium Tipper (2 unit), Leyland Taurus (7 unit).

Show only options returned by the quote service. A catalogue vehicle image represents a vehicle category, not the exact truck eventually assigned. Preserve no-suitable-truck, unavailable-route, invalid-load and pricing-error states. If inputs change, the old quote must no longer be treated as valid.

### C09 — Review and confirm

**Purpose:** obtain informed confirmation before dispatch.

**Elements:** pickup, delivery, material/quantity, truck, timing/site information and individual Change actions; distance; transport estimate; included waiting and additional waiting rate; estimated total; expandable fare breakdown; route qualifications; direct cash/UPI payment explanation; final confirmation action.

Fare detail includes base fare, distance, helpers where applicable, waiting, time adjustment, platform fee and GST. Material cost is excluded. Use returned amounts, not fixed figures in mockups.

**Actions:** Confirm and find a truck, or Confirm scheduled booking. Changes return to the relevant information and may require a fresh quote. During submission prevent duplicate taps. If the request fails, retain the review and show recovery without silently creating another trip.

### C10 — Voice-assisted booking

**Purpose:** collect the same booking information through a guided conversation.

**Elements:** language context, microphone/listening control, spoken/transcribed or typed instruction, current follow-up question, tappable answer suggestions, Type instead, processing/error feedback, completed answers with Change actions, pickup/delivery selectors and scheduling where needed.

**Progression:** collect material, quantity and missing details; confirm exact pickup and destination rather than trusting a spoken place name alone; collect timing and helper requirements where applicable; review collected information; continue to truck quotes and final confirmation.

The current interaction keeps completed sections available above the current question, collapsible and editable, with the next required section appearing below. Preserve the ability to review/edit the conversation without starting again. Pricing and final booking still require explicit confirmation. Road width is not a standard follow-up question.

**Failure states:** microphone denied, unsupported speech recognition, no speech, unrecognized/ambiguous input, parser/network failure and incomplete information. Every voice-dependent action must have typed or tappable alternatives. Do not promise a particular voice AI provider or universal speech availability from the UI alone.

### C11 — Scheduled booking waiting state

**Purpose:** confirm the future request is recorded but not yet being executed.

**Elements:** scheduled pickup date/time, trip code, load/sites/truck/price context, explanation of pending search, permitted cancellation and return-to-home access. Avoid language suggesting a driver is guaranteed before acceptance.

### C12 — Finding a truck

**Purpose:** explain dispatch progress and allow cancellation while searching.

**Elements:** search state, selected vehicle context, remaining search time, current search radius, explanation of minute-by-minute expansion, pickup/delivery/load/estimate and Cancel booking.

**Transitions:** accepted → Driver coming; timeout → No truck found; customer cancellation → Cancelled. A driver releasing an eligible job returns the customer to a search state rather than silently cancelling the customer’s booking.

### C13 — No truck found

**Purpose:** give a clear failed-search outcome.

**Elements:** no driver accepted message, original booking details, recorded charge, Try again (fresh five-minute search), Back to home and eligible Repeat trip action. A retry is distinct from editing and submitting a new booking.

### C14 — Driver coming to pickup

**Purpose:** track the assigned driver and prepare for loading.

**Elements:** stage heading, ETA/last known estimate, last GPS update, live map with sites and driver, driver name, vehicle category/registration, call action, trip progress, load/sites/instructions, fare information, route/GPS details and eligible cancellation.

ETA and freshness information must remain understandable without inspecting the map. Missing GPS, missing ETA, delayed location and provider failure must not look like live accurate tracking. The route refresh action recalculates route/arrival information; it does not change the booking or begin navigation.

### C15 — Loading at pickup

**Purpose:** show that the driver has arrived and loading is underway.

**Elements:** loading status, site context, 30-minute allowance, elapsed/remaining time, overtime indication and vehicle-specific waiting rate, driver contact, trip details and available load-photo evidence.

The driver controls arrival and departure. The customer cannot advance the trip. Normal customer cancellation is no longer offered at this stage; unresolved issues require support/operator handling.

### C16 — On the way to delivery

**Purpose:** track the loaded vehicle to the destination.

Use the tracking elements from Driver coming, with delivery as the target. Show current stage, route/ETA, location freshness, destination, driver contact, load information and available photos. No normal customer cancel action is offered after loading has begun.

### C17 — Unloading at delivery

**Purpose:** show destination arrival and unloading progress.

**Elements:** unloading state, destination, 30-minute included unloading period, elapsed/remaining/overtime information, driver contact and price context. Driver confirms unloading completion; final waiting charges are then reflected in the amount due.

### C18 — Payment due

**Purpose:** tell the customer what to pay and to whom.

**Elements:** work-complete status, final amount, fare explanation, driver contact, cash/direct UPI instructions, receipt access and waiting-for-driver-confirmation state.

The customer pays outside PICKR. There is no implemented in-app payment gateway, wallet, bank debit or payment-success button for the customer. The interface changes when the driver confirms collection.

### C19 — Receipt and feedback

**Purpose:** document the completed trip and collect optional feedback.

**Elements:** trip code, paid/payment-due status as applicable, amount, payment method and recorded time, sites, load, vehicle information, fare breakdown, print action, return home. For an eligible paid customer trip: 1–5 rating, optional comment (up to 500 characters), submit and feedback-received state.

Do not show a paid receipt merely because work finished. Repeat trip is available for eligible historical outcomes when the customer has no active trip.

### C20 — Cancel booking and cancelled outcome

**Entry:** customer can cancel during searching or after acceptance, before pickup arrival.

**Confirmation content:** reason choices (plans changed, booked by mistake, waiting too long, other), editable reason, applicable cancellation charge, explicit no-automatic-debit statement, keep-booking action and final confirmation.

Searching cancellation has no cancellation charge. After acceptance the configured cancellation rule applies; display the actual calculated amount before confirming, rather than hardcoding it into designs.

**Outcome:** cancellation reason, original sites, recorded charge, return home and eligible Repeat trip action. The current implementation has a reason sheet followed by confirmation; the designer can simplify this presentation provided the consequence and affirmative confirmation remain clear.

### C21 — Trips/history

**Purpose:** find current and past bookings.

**Elements:** All, Ongoing, Scheduled and Past filtering; trip entries with stage, date/time context, load/quantity, route summary, vehicle image/context and amount where available; empty states. Selecting an entry opens its stage-specific trip screen.

### C22 — Repeat trip

**Entry:** a completed, cancelled or no-driver trip, with no other active customer trip.

**Behaviour:** copy reusable load, site and instruction parameters; request a fresh quote; preserve the old truck category only if still eligible; open directly at Review. Timing resets for a new request and transit-pass information must be entered afresh if required. Clearly explain that old price and availability are not guaranteed.

**Failures:** changed service boundaries, unavailable truck category, invalid old load or route/quote failure. Allow correction instead of presenting an unconfirmable booking as ready.

### C23 — Account and saved sites

**Elements:** account name/phone, pilot status, language selection, payment explanation, help, saved-site list, Add site and sign-out.

**Saved-site flow:** choose/search/map a site → name it → save → return to list. Current UI supports listing and adding saved sites; do not assume edit/delete management is already present.

Name/phone changes are operator-managed during the pilot. Help offers configured support calling or a message to contact the pilot organiser if no phone is configured. Sign-out is disabled until the active trip and payment finish.

## 6. Driver screens and states

### D01 — Driver sign in

Name, Indian phone, language, pilot/no-OTP explanation and Continue. The driver route opens onboarding if no usable profile exists; otherwise approval status or Jobs. Android backend connection is a testing utility, not a normal driver task.

### D02 — Truck category and registration

Choose one of the eight truck categories, with image/name/capacity. Enter vehicle number as on registration records. Continue to measurements. Support validation and existing-value editing. A vehicle number remains necessary even when pilot verification is skipped.

### D03 — Truck measurements

Collect overall height, width, length, maximum gross weight including load, and axle load. Show units and accepted ranges alongside inputs:

| Field | Unit | Current input bounds |
|---|---|---|
| Height | metres | 0.5–10 |
| Width | metres | 0.5–6 |
| Length | metres | 1–30 |
| Maximum gross weight | tonnes | 0.2–100 |
| Axle load | tonnes | 0.1–30 |

These are data-validation bounds, not a legal-road-access guarantee. Explain where the information comes from and avoid implying every route has verified truck clearance. Continue to documents; back to vehicle choice. When pilot skips are enabled, an explicit unverified-test-access skip is available here as well.

### D04 — Documents

Four required categories: vehicle registration, RC book, driving licence and Aadhaar. Each needs missing/uploading/uploaded/error states, Take photo or Choose file, and Replace for an existing upload. Supported UI formats are image or PDF, up to 10 MB per document.

Show progress out of four, private-review explanation, Submit for approval and enabled pilot skip. Uploaded is not the same as approved. Successful submission leads to the approval state; permitted skip leads to test access.

### D05 — Approval and phone readiness

Variants: pending review, rejected/details need attention, approved, or permitted test access. Pending/rejected drivers cannot receive normal jobs. Include Review truck/documents and contact support.

Phone setup explains precise location, GPS enabled, notification access and optional floating alerts. Each permission has current status, explanation, request/check action and relevant Android settings link. Browser users receive appropriate foreground-only guidance. Test drivers must remain visibly identified as unverified.

### D06 — Jobs dashboard

**Purpose:** manage availability and resume work.

**Elements:** online/offline state, Go available/Go offline, GPS health and last update, Refresh GPS, completed trips today, cash/UPI collections recorded today, pilot verification notice where relevant, setup completion and job-alert settings access.

Counters are operational records, not wallet balance or net earnings. Going available first obtains/sends location. Inaccurate or stale location must have a recovery state; matching requires sufficiently fresh and accurate location. Existing checks reject accuracy worse than 150 metres.

**Busy variant:** show current job and Open job rather than presenting availability as free for new work. An unpaid completed job still reserves the driver.

**Navigation:** Jobs, Trips and Account; onboarding/approval may use a focused flow without normal navigation.

### D07 — Incoming job request

**Elements:** new-job heading, remaining search time, first-to-accept explanation, trip distance/estimated duration, pickup and delivery, material/quantity, required truck, notes/access warnings where recorded, fare and payment-after-work explanation, Take job and Decline.

**Acceptance:** show progress, prevent double submission; successful acceptance opens the assigned trip and removes the offer for others. Handle another driver winning, expired request, customer cancellation and network failure explicitly.

**Decline:** dismiss this request for the current search session; it may reveal another pending offer. It does not cancel the customer’s booking.

**Android variants:** in-app alert, notification entry and optional floating alert above other apps. Opening an alert must resolve to the current booking state, including if the offer has already disappeared.

### D08 — Travel to pickup

Show pickup target/map, customer name/contact, delivery context, load/quantity/truck, instructions, route/ETA freshness and external Google Maps navigation action. Primary action: Reached pickup. Secondary actions: report road/site issue; Cannot do this job where allowed.

External navigation does not advance the PICKR trip stage. On returning to PICKR, retain the current job and latest state.

### D09 — Loading

Show pickup arrival, loading timer, included 30 minutes, overtime/rate, customer contact, load/site details. Primary progression: Add load photos. The driver may finish loading before the allowance runs out; this is an included waiting period, not a mandatory delay.

### D10 — Load photo capture and departure

At least two clear photos of the loaded vehicle are required before normal departure; current UI accepts up to eight. Include capture/file selection, upload progress, previews/open-photo, count, failures/retry and the recorded pilot photo-skip choice when enabled.

Primary action: Load ready / Start trip. Require confirmation before changing to In transit. Uploaded files or skipped status accompany the trip. Do not imply a remove-photo feature if not designed as a new addition; current UI primarily supports adding/viewing.

### D11 — Delivery journey

Show destination map, external navigation, customer contact, load and trip information, route/ETA/freshness and issue reporting. Primary action: Reached delivery. Normal driver self-release is not available once the load is in transit.

### D12 — Unloading

Show destination arrival and the separate 30-minute unloading allowance, elapsed/remaining time and overtime. Primary action: Unloading finished, with confirmation. On success move to payment collection; the driver remains reserved.

### D13 — Collect payment

Show work complete, final amount and fare details, reservation-until-payment explanation, Cash/Direct UPI choice, optional UPI reference, Payment received and receipt access. Require confirmation that the full amount was actually received. Failure leaves the job unpaid/reserved and offers retry; do not display completion optimistically.

### D14 — Job finished

Show payment received/recorded, amount, receipt and Back to jobs. Availability messaging must reflect whether the driver is actually online or offline. Only after recorded collection is the driver released for another job.

### D15 — Cannot do this job / release

Available to the driver after acceptance and while at pickup, before transit. Show consequences: the driver loses this assignment and PICKR searches for another driver. Reasons include truck problem, cannot reach pickup, load does not fit and other; allow an editable reason and affirmative confirmation.

Release is not a cancellation of the customer’s booking. Customer returns to searching. After departure, direct the driver to support/issue reporting rather than offering this normal self-release action.

### D16 — Road/site issue report

Entry from active job stages. Remind the driver to stop safely first. Choose one issue: road closed, water on road, accident, heavy traffic or site access problem. Confirm location using GPS/map; enter useful details (up to 500 characters; minimum useful text required); Send report; show submitting, failure and success.

Driver reports await operator review and expire after two hours. Do not imply that reporting automatically reroutes the vehicle or broadcasts an unverified event to everyone.

### D17 — Driver trip history and receipt

Browse recorded jobs and open their relevant details/status. Completed records expose fare/payment/receipt information. Preserve unpaid versus paid, cancelled/released context where recorded, and empty history.

### D18 — Driver account and settings

Profile name/phone/approval; current vehicle and measurements; Edit truck details; document count/status and private-document viewing; update documents; language; location status/check/settings; notification and floating-alert status/settings; support; sign-out.

Truck/document editing returns through onboarding. Editing and sign-out are blocked while a job/payment is active. Name/phone changes are operator-managed. Phone permissions are actual system settings: distinguish denied, approximate, precise, GPS off and unavailable/unknown.

## 7. Admin screens and workflows

### A01 — Admin sign in

Phone and password with validation, submitting and invalid-credentials/server-error states. Admin credentials differ from customer/driver name-and-phone entry. No self-service password-reset journey is currently exposed.

### A02 — Live operations

**Purpose:** understand fleet and trip status and identify jobs needing attention.

**Elements:** active service areas/bookings-paused indicator; last refresh time and Refresh; active/searching/payment-due counts; online drivers with fresh GPS and available/busy breakdown; collections recorded today; warnings when free waiting is exceeded; trip search; All/Searching/At a site/Payment due filters; include/exclude QA-test data; live map and trip queue.

Map distinguishes available, busy and stale-location vehicles. Queue is oldest first, with trip code, stage, driver/unassigned, load, timing/ETA and relevant overtime. Selecting a trip opens operational detail. On smaller screens the map must not prevent access to the queue.

### A03 — Trip detail

Trip code/stage, refresh, map with sites/driver/route, pickup/delivery, material/quantity/truck, instructions, transit pass where supplied, customer and driver contact, private load photos or recorded-skip state, fare/payment information and chronological activity timeline.

Actions depend on stage: assign during searching, release/restart search after acceptance, and operator trip controls for permitted progression/intervention. Quote versus final waiting-adjusted amount must be distinguished.

Operator controls reuse the trip-stage actions and their confirmations; admin can cancel eligible nonterminal stages that normal customers/drivers cannot. Do not design an unrestricted arbitrary-status dropdown as though it already exists.

### A04 — Assign driver

Show booking/sites/truck context, search available drivers, eligible driver name/vehicle/GPS age, single selection, Confirm assignment and Back/Close.

Eligibility includes matching vehicle category, availability, enabled account, approved or permitted test access, no active booking, fresh device/location information and acceptable accuracy. UI currently treats freshness within 90 seconds and accuracy up to 150 metres as eligible. Handle no eligible drivers, a selected driver becoming unavailable, booking cancellation/acceptance elsewhere and paused bookings.

Replacing an already assigned driver requires releasing that assignment and restarting search first. Confirm the consequence of this action.

### A05 — Service areas list

Map of active/paused areas, search by name, list with name/status/boundary-point count, Add area, Edit and Activate/Pause. Explain that both sites must be covered and remote customers are normally allowed.

### A06 — Service area editor

Area name, geographical boundary map, add boundary points, finish drawing, undo, clear, validity/point-count feedback, accept-bookings toggle, Save, Discard and Delete existing area with confirmation. Advanced coordinate entry accepts longitude/latitude pairs.

Reject incomplete/invalid boundaries, crossing or otherwise invalid polygons, malformed coordinates and missing names. Explain that changes affect new booking eligibility; existing trips retain their recorded sites. This supports areas anywhere, not only Thrissur. A place-search tool for this editor is not currently present in this component; treat adding one as a proposed improvement, not an existing function.

### A07 — Drivers list

Search driver name/vehicle number; filter all, pending, approved, test, rejected. Show identity/contact, truck/registration, approval, available/offline/busy state, last GPS and Review action. Empty/loading/error states required.

### A08 — Driver review

Identity/contact, approval, vehicle and measurements, online/reserved state, four private-document slots with Open document, missing-upload states and test-skip warning. Approve and Reject/Suspend require confirmation. Approval changes are blocked during an active job. Uploading a document never implies that staff have verified it.

### A09 — People/accounts list

Search name/phone; role filter; name, phone, role, enabled/disabled and created date; Create account, Edit and Disable. The current “delete account” backend action is a soft disable that retains trip/audit records. The UI should call it Disable, not permanent deletion.

### A10 — Create/edit account

Name, valid Indian phone, role on creation, enabled status, and password for admin accounts. Existing account role is not editable. An existing admin’s password can be changed; blank retains the current password. Save and Cancel; validation and save feedback.

Protect the signed-in admin from disabling themselves. Active jobs must be resolved before disabling an associated account. Duplicate/invalid details and server refusal must be visible.

### A11 — Trip ledger

Historical trip records; trip/customer/driver search; stage filters; date-from/date-to; paid/unpaid/all payment filter; QA inclusion; collections recorded; record detail access and Export CSV. Distinguish recorded cash/UPI collections from business revenue. Cancelled/no-driver outcomes must not appear as normal full-fare collections.

### A12 — Pilot settings

Controls: pause new bookings/assignments; require customer device inside service area; allow pilot verification/photo skips; support phone; initial search radius; radius expansion each minute. Current radius inputs accept 1–50 km. Include explanatory copy, unsaved-changes state, Save and Discard.

Show pending-push count and configuration explanation. Pausing new bookings does not stop existing trip execution. Turning on customer-device restrictions changes remote-booking behaviour and deserves clear wording.

### A13 — Road issues

Filter all/pending/verified/dismissed; issue type, notes, location, status, expiry; Verify/Dismiss; create operator report using category/location/notes. Admin reports are immediately verified; driver reports are reviewed. Reports expire after two hours.

These are local operator reports, distinct from Mappls traffic estimates. A provider-wide incident feed is not enabled; do not label this as comprehensive live traffic incidents or automatic incident avoidance.

### A14 — Activity/audit

Search action or trip ID; timestamp, action, actor, trip reference and expandable details. Empty state and unknown/system actor fallback. This is read-only history, not an editable timeline.

### A15 — System health

Run checks, checking state, checked time, errors; database connectivity, required database migration readiness, Mappls configuration presence, Firebase configuration presence and pending push records.

Important distinctions: configured Mappls keys do not prove provider entitlement; configured Firebase does not prove device delivery; pending-push count is not delivered-notification count. Use Ready/Needs setup/Unknown only in the context of what the check actually verifies.

## 8. Shared interaction and recovery screens

### Connection interruption and offline help

Preserve the last available trip data but prominently identify it as potentially stale. Offer Retry/Check connection, return to last screen, relevant contact information and foreground/background guidance. Do not allow apparent successful progression without a server acknowledgement. Distinguish account-loading from offline recovery.

### Session expiry or account disabled

Return to sign-in with an explanation. Stop driver availability/tracking associated with the invalid session. Do not leave private trip data presented as an active signed-in account.

### Map unavailable

Keep useful location/trip text and call actions accessible. Show retry and a clear failure message. A route estimate may still exist independently of map tiles. Do not replace unavailable GPS or ETA with a fictional live value.

### Quote/input invalidation

Changing material, quantity, sites, assistance or timing can invalidate price and truck options. Show recalculation and prevent confirming an old quote. Recover to the relevant field when validation fails.

### Confirmation pattern

Use explicit consequences for cancellation, releasing a job, beginning loaded travel, finishing unloading, recording full payment, disabling accounts, driver approval/suspension and deleting an area. Provide an obvious non-destructive exit. Preserve input when the server rejects an action.

### Update available

A web release notice can offer refresh to load the latest interface. Explain impact on in-progress work and preserve recoverable booking details. This is distinct from an Android package update.

### Empty and loading states

Design intentional variants for no trips, no saved sites, no offers, no search matches, no eligible trucks/drivers, missing documents, pending approval, no GPS, unavailable ETA, no service areas, no road reports and no audit events. Empty does not necessarily mean error.

## 9. Trip-stage permission matrix

| Stage | Customer | Assigned driver | Operator |
|---|---|---|---|
| Scheduled/searching | View, cancel; wait for assignment | Eligible offer accept/decline | Monitor; assign when valid; cancel |
| Accepted/heading to pickup | Track, call, eligible cancellation | Navigate, mark pickup arrival, release with reason, report issue | Monitor, release/restart search, permitted intervention |
| At pickup/loading | View timer/contact/details | Photos, confirm departure, eligible release, report | Monitor and permitted intervention |
| In transit | Track/contact | Navigate, mark delivery arrival, report | Monitor and permitted intervention |
| At delivery/unloading | View timer/contact | Confirm unloading complete, report | Monitor and permitted intervention |
| Completed, payment pending | Pay directly; view amount/receipt | Record cash/UPI and confirm full receipt; remains reserved | Inspect and permitted payment intervention |
| Completed, paid | Receipt, feedback, eligible repeat | Receipt, return to jobs | Ledger/detail |
| Cancelled | Reason/recorded charge; eligible repeat | Relevant record/history | History/detail |
| No driver found | Retry search or eligible repeat | No active assignment | Inspect outcome |

Exact server validation remains authoritative if a state changes while an action is open.

## 10. Designer deliverables

Please provide a complete linked prototype and screen/state inventory covering:

1. Customer: sign-in, home variants, six-step manual booking, location search/map, schedule selection, voice collection/editing, scheduled waiting, searching, timeout/retry, every active-trip stage, cancellation, payment, receipt/feedback, history/repeat and account/saved sites/help.
2. Driver: sign-in, three-stage onboarding, pending/rejected/test/approved access, permissions, offline/available/busy dashboard, incoming/expired/taken offer, every job stage, load photos, release, issue report, payment, receipt/history and account settings.
3. Admin: sign-in, live operations, trip detail/controls, assignment, service-area list/editor, drivers/review, people/create/edit/disable, ledger/export, pilot settings, road reports, audit and health.
4. Shared states: loading, empty, disabled, validation, saving, success, retry, offline/stale, permission denial, map failure, concurrent-update rejection and destructive-action confirmation.
5. Responsive behaviour for customer/driver on mobile web and Android, and admin on desktop and small screens. Include long addresses, Malayalam labels, large text, keyboard-open forms and scrolling content.
6. Interaction annotations: entry point, required inputs, selected states, primary/secondary actions, next destination, back behaviour, preservation of unfinished data and which role owns each action.

## 11. Scope boundaries and implementation caveats

Do not assume the following are already implemented: materials purchasing, inventory, multi-stop delivery, multi-material itemized orders, customer/driver OTP, in-app chat, wallet/payouts, automatic online payment/refunds, self-service profile editing, customer-controlled live-trip editing, guaranteed truck-specific routing, predictive routing, automatic incident avoidance or a published iOS app.

Some supported capabilities depend on external setup: location search/provider entitlement, map-domain allowlisting, push configuration, device permissions and speech availability. The design should contain their failure/recovery states without presenting them as always successful.

This handoff is based on repository components, not only earlier requested features or screenshots. In particular: account deletion is currently disable; users have three primary destinations rather than an inventory tab; voice and manual booking share the same final booking requirements; completed-but-unpaid remains active; and driver release restarts customer search.

### Source reference for implementation discussions

Main flow: `src/components/pilot/PilotApp.tsx`; customer booking: `BookingForm.tsx`, `VoiceIntake.tsx`, `LocationPicker.tsx`, `SchedulePicker.tsx`; execution: `TripView.tsx`; driver: `Onboarding.tsx`, `DriverDashboard.tsx`, `DriverOffer.tsx`; account/history: `AccountScreen.tsx`, `TripHistory.tsx`; admin: `AdminConsole.tsx` and `admin/`; issue reports: `RoadReports.tsx`; catalogue and measurement definitions: `src/config/`.
