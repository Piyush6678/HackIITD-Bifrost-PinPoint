# PinPoint

**One public map for every civic problem, where residents, not the paperwork, decide when it's fixed.**

PinPoint lets a resident report a civic problem (a pothole, an overflowing bin, a dead streetlight) with one photo and a GPS pin. Reports within 50 m of an open issue of the same kind are merged into it as upvotes, so urgency stacks instead of splitting across forty duplicate tickets. Everything is public and readable without an account.

Built by **Team Bifrost** for HackIIITD 2026 (Esya '26, IIIT Delhi). Open Innovation track · SDG 9 and SDG 11.

| Team | |
| --- | --- |
| Prerit Sharma | Team lead |
| Aryan Garg | |
| Piyush Aggarwal | |
| Krishna Singh | |

---

## Status

What is built so far, and how each part is used, is in [`features.md`](features.md). The detailed plan for the remaining phases (13–20), with API contracts, rules and tests, is in [`plan.md`](plan.md).


We are building in phases. This README documents what exists today.

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Project setup, tooling | Done |
| 1 | Backend core: auth, issues, duplicate detection, upvotes, wards | Done |
| 2 | Design tokens, fonts, logo, app shell | Done |
| 3 | UI primitives: buttons, fields, status pills, category icons | Done |
| 4 | Client API layer, login and register pages | Done |
| 5 | Base map with ward outlines | Done |
| **6** | **Issue pins on the map** | **Done** |
| 7 | Issue page and upvoting | Done |
| **8** | **Report flow: photo and location** | **Done** |
| 9 | Report flow: details, duplicate check, submit | Done |
| **10** | **Officer accounts and ward assignment** | **Done** |
| 11 | Officer work queue for their ward, plus officer access requests | Done |
| **12** | **Officer marks a fix with an on-site, GPS-checked after-photo** | **Done** |
| **13** | **Verification API: 3 nearby residents confirm or reject** | **Done** |
| **14** | **Verification screen: before/after, distance check, "Check fixes near you"** | **Done** |
| **15** | **Gemini: tagging reports and checking before/after photos** | **Done** |
| 16 | Public officer and ward scorecards | Done |
| 17 | Alerts: reporters and upvoters asked to verify fixes | Next |
| 18 | Escalation: evidence pack, councillor petition, RTI draft | Planned |
| 19 | TinyFish: official ward data, road ownership, contacts, notices | Planned |
| 20 | Demo data, polish, demo script | Planned |

---

## Tech stack

- **Next.js 16** (App Router, Route Handlers) for both the frontend and the API
- **MongoDB** with Mongoose 9, using `2dsphere` indexes for all geo queries
- **TypeScript**, **Zod 4** for request validation
- **jose** (HS256 JWT) in an httpOnly cookie, **bcryptjs** for password hashing
- **Vitest** with `mongodb-memory-server` for tests against a real `mongod`
- **Tailwind CSS 4** with theme tokens in CSS, and fonts self-hosted through `next/font`
- **Leaflet** (react-leaflet 5) with **OpenStreetMap** tiles. There's no map API key and no billing.
- Google Gemini (`@google/genai`) for photo tagging and before/after checks
- Coming up: TinyFish

---

## Getting started

### Prerequisites

- Node.js 20.9 or newer (developed on Node 24)
- A MongoDB database. Either:
  - a free MongoDB Atlas M0 cluster, or
  - a local `mongod`. Phase 6 needs change streams, which require a replica set (Atlas always has one).

### Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run seed:wards           # loads the pilot wards and builds geo indexes
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Needed from | Description |
| --- | --- | --- |
| `MONGODB_URI` | Phase 1 | Connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/pinpoint` |
| `JWT_SECRET` | Phase 1 | Signs session tokens. At least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GEMINI_API_KEY` | Phase 15 | Google AI Studio key. Leave empty to run without AI; every AI feature just stays hidden. |
| `GEMINI_MODEL` | Phase 15 | Gemini model id (default `gemini-3.5-flash`) |
| `TINYFISH_API_KEY` | Phase 19 | TinyFish key, used to import ward boundaries, road lists and contacts, and to monitor official notices |
| `CRON_SECRET` | Phase 19 | Shared secret for scheduled routes (refreshing official notices) |
| `DEMO_PASSWORD` | Phase 10 | Password for the demo officer and admin accounts made by `npm run seed:officials` |

`.env.local` is git-ignored. Never commit real keys.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Run the test suite. No database setup needed, because it starts its own `mongod`. |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run seed:wards` | Upsert the pilot wards and sync indexes. Safe to re-run. |
| `npm run seed:officials` | Create one demo officer per pilot ward plus an admin (`*@pinpoint.test`). Uses `DEMO_PASSWORD`, and re-running resets their password to it. |
| `npm run set-role -- --email … --role official --ward 78` | Make an account an official (or `--role admin` / `--role citizen`). Officials need a government email unless you add `--any-domain`. |

The first `npm test` downloads a MongoDB binary, so it is slower than later runs.

---

## Project structure

```
src/
  app/
    layout.tsx             fonts, metadata, app shell
    page.tsx               home: info panel + live map
    not-found.tsx          404 page
    login/, register/      auth pages
    globals.css            Tailwind theme tokens (colours, radii, shadows)
    icon.svg               favicon
  components/
    AppShell.tsx           top bar (desktop), skip link, main region
    NavLinks.tsx           top nav and mobile bottom tab bar
    Logo.tsx               ring mark and wordmark
    UserMenu.tsx           "Log in" link or avatar menu with logout
    auth/                  AuthLayout · LoginForm · RegisterForm
    dashboard/             Dashboard · QueueTable · IssueDrawer · FixCapture (live camera + GPS check)
    admin/                 AdminPanel · RequestCard · OfficialsTable
    officer/               OfficerAccess (request officer access, see its status)
    RecheckAccess.tsx      reloads a 403 page once the refreshed session allows it
    report/                ReportFlow · Stepper · PhotoStep · LocationStep · LocationPickerMap
    scorecard/             CityScorecard · WardScorecard · Stat
    map/                   HomeMap (client-only loader) · MapView · WardLayer · IssueLayer · IssuePopup · issuePin · MapPlaceholder
    ui/                    Button · TextField / TextArea / Select · Chip · Skeleton · EmptyState · Alert
    issue/                 StatusPill · CategoryIcon · SeverityMeter
  app/api/                 Route handlers (one folder per endpoint)
    auth/                  register · login · logout · me
    issues/                list · create · nearby · [id] · [id]/upvote · [id]/status
    dashboard/queue/       the officer's ranked work queue
    officer-requests/      ask for officer access, see or withdraw your request
    admin/                 officials · officer-requests (review)
    photos/[id]/           serves stored images
    ai/tag/                Gemini suggestions for a report photo
    scorecard/             public ward ranking · [ward] for one ward
    wards/                 pilot ward list
  lib/
    auth.ts                session cookie, getSession / requireUser / requireRole
    constants.ts           categories, statuses, roles, radii, limits
    db.ts                  cached Mongoose connection
    geo.ts                 haversine distance, GeoJSON <-> {lat, lng}
    http.ts                route() wrapper, HttpError, JSON error shape
    photos.ts              photo upload validation
    rateLimit.ts           in-memory sliding-window limiter
    serialize.ts           public JSON shape of an issue
    validators.ts          Zod schemas for every request
    format.ts              labels, relative time, distance, coordinates
    api.ts                 client fetch wrapper, throws ApiError with field errors
    safeNext.ts            validates ?next= redirect targets
    officials.ts           requireStaff (role from the database), makeOfficial, removeOfficial
    officerRequests.ts     request shape, reviewRequest (approve or reject, safe against double clicks)
    compressPhoto.ts       in-browser photo compression (about 120 KB JPEG, 1600 px max)
    gemini.ts              tagPhoto and compareFix, both null on any failure
    fixCheck.ts            runs compareFix after an officer posts a fix, saves it on the issue
    location.ts            one browser GPS reading (used by the verify screens)
    scorecard.ts           scorecard maths: fix attempts, medians, acceptance rate
    scorecardData.ts       loads issues and public officer profiles for the scorecard
  hooks/useSession.ts      who is logged in, shared across the tab
  hooks/useIssues.ts       issues for the visible map area (debounced, cancels stale requests)
  hooks/useQueue.ts        the ward queue for one status tab, with counts per status
  hooks/useWards.ts        ward boundaries, fetched once and shared; wardAt() finds the ward for a point
  proxy.ts                 page-level redirects for logged-in / logged-out users
  models/                  User · Issue · Photo · Ward · OfficerRequest
  data/pilotWards.ts       pilot ward boundaries (Karol Bagh zone)
scripts/                  seed-wards · seed-officials · set-role · ai-accuracy
tests/                     Vitest suites + in-memory MongoDB setup
```

---

## API reference

All endpoints return JSON. Errors always look like this:

```json
{ "error": "Human readable message", "issues": [{ "path": "email", "message": "Invalid email address" }] }
```

`issues` appears only on validation errors (400). Auth is a session cookie named `pp_session`, set by register and login. Read endpoints are public.

### Auth

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | none | `{ name, email, password }`. Password must be at least 8 characters. Creates a `citizen`. 409 if the email exists. Limit: 5 per 10 min per IP. |
| POST | `/api/auth/login` | none | `{ email, password }`. Returns 401 on a bad pair without saying which part was wrong. Limit: 10 per 10 min per IP. |
| POST | `/api/auth/logout` | none | Clears the cookie |
| GET | `/api/auth/me` | user | Current user, including their ward for officials |

### Issues

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/issues` | public | Query: `bbox=minLng,minLat,maxLng,maxLat`, `category=a,b`, `status=a,b`, `ward=<id>`, `sort=recent\|upvotes\|severity`, `limit` (1–500, default 200) |
| POST | `/api/issues` | user | Multipart form, described below. 201 with the issue, or 409 with `duplicateOf`. Limit: 10 per hour per user. |
| GET | `/api/issues/nearby` | public | Query: `lat`, `lng`, `radius` (10–2000 m, default 250), `category`, `status` (comma-separated, like the list endpoint; wins over `includeResolved`), `includeResolved`. Sorted by distance, and each item has `distance` in metres and `verification` vote counts. |
| GET | `/api/issues/:id` | public | Full detail, including `statusHistory`, verification counts and `aiSuggestion` |
| POST | `/api/issues/:id/upvote` | user | Idempotent. Returns `{ upvoteCount, hasUpvoted }`. 409 if the issue is resolved. |
| DELETE | `/api/issues/:id/upvote` | user | Withdraws your upvote. Also idempotent. |

Fields for creating an issue (`multipart/form-data`):

| Field | Required | Rules |
| --- | --- | --- |
| `photo` | yes | JPEG, PNG or WebP, at most 5 MB. The client will compress photos to about 120 KB in Phase 2. |
| `title` | yes | 3–120 characters |
| `category` | yes | `pothole` (shown as "Road damage") `garbage` `streetlight` `waterlogging` `sewage` `encroachment` `other` |
| `severity` | yes | Integer 1–5 |
| `lat`, `lng` | yes | WGS84 decimal degrees |
| `description` | no | Up to 1000 characters |
| `address` | no | Up to 200 characters |
| `aiSuggestion` | no | JSON string `{ category, severity, title? }`, sent by the Phase 3 client |

Example:

```bash
curl -b cookies.txt http://localhost:3000/api/issues \
  -F title="Deep pothole outside metro gate" -F category=pothole -F severity=4 \
  -F lat=28.6519 -F lng=77.1909 -F photo=@pothole.jpg
```

| POST | `/api/issues/:id/confirm` | resident | `{ vote: "confirm" \| "reject", lat, lng, accuracy }`. Returns `{ issue, outcome }`, where `outcome` is `"verified"`, `"failed"` or `null`. Described under "Residents verifying a fix". |
| PATCH | `/api/issues/:id/status` | official of the issue's ward | Multipart form, described below. Returns the updated issue detail. |

Fields for changing status (`multipart/form-data`). Officers can never set `resolved`; only residents confirming the fix can (Phase 13).

| `status` | Allowed from | Other fields |
| --- | --- | --- |
| `in_progress` | `open` | `note` (optional, up to 500 characters) |
| `pending_verification` | `open`, `in_progress` | `photo` (required), `lat`, `lng`, `accuracy` (metres), `takenAt` (ms since epoch, when the camera took it), `note` |

Errors: 403 if the issue isn't in your ward, 409 if the issue has already moved on (with its current `status`), 422 if you're more than 50 m from the issue (with `distance`), the GPS accuracy is worse than ±100 m, or the photo wasn't taken in the last 15 minutes.

### Ward dashboard (officials and admins)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/dashboard/queue` | Query: `status` (default `open`); admins may add `ward=<number>`, and see every ward without it. Returns `{ ward, counts, issues }`. Issues are ranked by people affected, then severity, then oldest first, and each carries `hoursOpen`. 409 for an official without a ward. |

### Officer access requests

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/officer-requests` | user | Your latest request, or `null` |
| POST | `/api/officer-requests` | resident | `{ wardNumber, designation, department, employeeId?, phone?, note? }`. 201 with the request. 409 if one is already pending or you already have staff access. Limit: 5 a day. |
| DELETE | `/api/officer-requests` | user | Withdraws your pending request |

### Admin (admin role only)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/officer-requests` | Query: `status=pending\|approved\|rejected` (default `pending`). Pending ones oldest first. Each says whether the account uses a government email. |
| PATCH | `/api/admin/officer-requests/:id` | `{ decision: "approve", wardNumber?, anyDomain? }` or `{ decision: "reject", note }`. Approving makes the account an official for that ward (the admin can change the ward). A non-government email needs `anyDomain: true`, meaning the admin has checked who they are. A rejection needs a reason, which the applicant sees. 409 if already reviewed. |
| GET | `/api/admin/officials` | Officials with their wards |
| POST | `/api/admin/officials` | `{ email, wardNumber }`. Promotes an **existing** account to official for that ward. The email must be `@mcd.nic.in` or `@delhi.gov.in`. Errors: 404 for no such account or ward, 409 for an admin, 422 for a non-government email. |
| DELETE | `/api/admin/officials/:id` | Turns an official back into a resident. Their past actions stay in issue histories. |

### Other

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/photos/:id` | Raw image, served with `Cache-Control: immutable` |
| GET | `/api/wards` | Pilot wards. Add `?boundary=true` to include the GeoJSON polygons. |
| POST | `/api/ai/tag` | Logged in, 20 an hour. Multipart `photo`. Returns `{ suggestion: { looksLikeCivicIssue, category, severity, title } \| null }`. `null` when AI is off or the call fails. |
| GET | `/api/scorecard` | Public. Query: `sort=acceptance\|speed\|overdue`. Every pilot ward's metrics plus city totals. |
| GET | `/api/scorecard/:ward` | Public. One ward by number: its metrics, its officers (name and designation only), the last 10 verified fixes and every overdue issue. 404 outside the pilot. |

### Issue shape

```json
{
  "id": "6adc6034fa3d2be399cb7ab8",
  "title": "Deep pothole outside metro gate",
  "category": "pothole",
  "severity": 4,
  "status": "open",
  "location": { "lat": 28.6519, "lng": 77.1909 },
  "ward": { "id": "...", "name": "Karol Bagh", "number": 78 },
  "upvoteCount": 1,
  "hasUpvoted": true,
  "photoUrl": "/api/photos/6adc6034fa3d2be399cb7ab7",
  "resolutionPhotoUrl": null,
  "portal": null,
  "createdAt": "2026-10-24T07:37:24.454Z",
  "dueAt": "2026-10-31T07:37:24.454Z",
  "overdue": false,
  "reopenCount": 0,
  "failedVerifications": 0
}
```

---

## How the core works

**Duplicate detection.**  `Issue.findNearbyDuplicate()` runs a `$near` query with `$maxDistance: 50`. It only considers issues of the same category that are not yet resolved. If it finds one, the API returns `409` with that issue so the client can offer an upvote instead. The query uses the `2dsphere` index, so it stays fast as the collection grows.

**Upvotes.** Each direction is a single conditional `findOneAndUpdate` (`upvotes: { $ne: user }` with `$push` and `$inc`). Double taps and races therefore can't push `upvoteCount` out of step with the voter list. The reporter counts as the first upvote.

**Ward assignment.** Each issue is placed in a ward with `$geoIntersects` against the ward polygons. The pilot covers six wards around Karol Bagh. Their boundaries in `src/data/pilotWards.ts` are simplified rectangles for the demo and should be replaced with official MCD ward GeoJSON.

**Coordinates.** MongoDB stores GeoJSON `[lng, lat]`. Everything outside the models uses `{ lat, lng }`. The conversion lives in `src/lib/geo.ts`, so the order is never handled by hand anywhere else.

**Privacy.** Following DPDP 2023, the public API shows the problem and never the person. Reporter ids and voter lists are not included in any response.

**Photos.** Photos are stored in their own collection, so listing and map queries never load image bytes. Compressed photos are about 120 KB, well within MongoDB's document limit.

**Indexes on `issues`.** `2dsphere(location)`, `{ category, status, createdAt }`, `{ ward, status }` and `{ upvoteCount }`.

---

## Testing

```bash
npm test
```

126 tests across thirteen suites. The API suites run against a real MongoDB replica set in memory:

- **geo:** distance accuracy, GeoJSON round trip, point-in-polygon (including holes)
- **duplicates:** 49 m matches and 51 m doesn't; other categories and resolved issues are ignored; ward lookup
- **auth:** registration, hashing, duplicate emails, validation errors, login, `/me`, logout
- **issues:** create, duplicate 409, AI suggestion stored next to the user's choice, rate limiting, upvote idempotency and withdrawal, bbox / category / status filters, nearby ordering, detail, photo serving, wards, reopening a recently fixed issue (within the category's window, not after it), fix targets and departments in the API
- **format:** relative times, distances, coordinates, severity labels
- **categories:** a rule for every category, fix targets, overdue, the after-dark rule for streetlights, per-category reopen windows
- **proxy:** login redirects with `next`, forged cookies, logged-in users kept off auth pages, residents shown a 403 on `/dashboard`, `/admin` for admins only, `/officer-access` behind login, open-redirect protection
- **dashboard:** queue ranking, own ward only (officials can't peek with `?ward=`), admins choosing a ward, status counts; starting work, never setting resolved, other wards and admins refused, an after-photo 80 m away refused (and not stored), rough GPS and old photos refused, a double press only moving the issue once
- **verification:** 3 confirms verify a fix and 3 rejects send it back to the officer (whichever comes first); failed attempts are counted and kept after a later success; one vote per person; staff and the posting officer refused; 300 m and GPS-accuracy checks; votes only while waiting; five people voting at once settle it exactly once; each viewer sees only their own vote; a verified issue still reopens if the problem comes back; streetlights only after dark (IST)
- **officerRequests:** asking doesn't grant anything, one pending request at a time, withdrawing, approving (and correcting the ward), vouching for a non-government email, rejecting with a reason the applicant sees, no second decision
- **gemini:** structured replies parsed, bad or slow replies and a missing key give `null`, `/api/ai/tag` needs a login and is rate limited, the before/after check is stored and shown with the fix, never blocks or breaks it, and isn't attached to a newer after-photo (SDK mocked)
- **scorecard:** medians refuse fewer than 3 points, fix attempts read from a history, ward and officer metrics, dashes until there's enough data, the public ranking, a ward's officers without emails, 404 outside the pilot
- **officials:** government email check, promoting and demoting, admin-only API, roles read from the database rather than a stale cookie, `/me` re-issuing the cookie after a role change

---

## The map

- **`LeafletMap`, not `MapContainer`:** all three maps use our own `components/map/LeafletMap.tsx`. react-leaflet's `MapContainer` removes the map when its effect cleans up, but doesn't create a new one when the effect runs again on the same element. React does that in dev (Strict Mode) and when Next shows a cached page again on Back. The result was "Map container is being reused by another instance" and a blank map.
- **Client-only:** Leaflet needs `window`, so `HomeMap` loads `MapView` with `next/dynamic` and `ssr: false`. While it loads, the same street-block pattern the page used before is shown, so nothing jumps.
- **Tiles:** standard OpenStreetMap tiles, desaturated with a CSS filter on the tile pane. The basemap stays quiet, and our pins and status colours carry the meaning.
- **Ward outlines:**
  - They come from `GET /api/wards?boundary=true` and are drawn as dashed pine polygons.
  - Hovering a ward makes its outline solid.
  - The map fits itself to the six pilot wards on load, whatever the screen size.
  - If the request fails, the map still works without outlines.
- **Ward labels:** they're permanent, because phones have no hover. Below zoom 14 they collapse to just the ward number, so they don't overlap on small screens.
- **Bounds:** panning is softly limited to Delhi, and zoom is limited to levels 12–19.
- **Stacking:** the map section uses `isolation: isolate`. Leaflet's panes use z-indexes of 400–1000, and without this they would draw over the sticky header and the account menu.
- **Seed data:** run `npm run seed:wards` once per database, or the map shows no outlines.
- **Issues for the visible area:** `useIssues` asks `/api/issues?bbox=…` for whatever is on screen whenever the map stops moving.
  - Requests are debounced by 250 ms, and a request still in flight is aborted when a newer one starts, so fast panning never shows stale pins.
  - A small chip in the corner shows "Loading issues", the count in view, or "Couldn't load issues · Retry".
- **Pins:**
  - The fill is the category colour and the ring is the status colour, with a white gap so both read.
  - Size grows with the log of upvotes (18–32 px), so one viral issue doesn't hide its neighbours.
  - Busier issues draw on top, a count badge appears from 2 upvotes, and resolved issues fade back but stay on the map as a record.
  - Pin icons are cached by their visual inputs, so re-renders don't rebuild the DOM.
- **Popup:** shows the category, status, title, ward and age, how many people are affected, and a link to the issue page. The opened pin gets a halo.

---

## Problem categories

PinPoint covers all kinds of civic problems, not just potholes. Everything that differs between categories lives in one table, `src/lib/categories.ts`, so the issue page, the officer queue, verification and the scorecard all use the same rules.

| Category (stored as) | Shown as | Fix target | Comes back within → reopens | Usually handled by | Verifying a fix |
| --- | --- | --- | --- | --- | --- |
| `pothole` | Road damage | 7 days | 30 days | MCD Engineering (PWD for roads over 60 ft) | Surface filled and level |
| `garbage` | Garbage | 2 days | 7 days | MCD Sanitation | Spot clear, bin back |
| `streetlight` | Streetlight | 3 days | 14 days | MCD Electrical | **Only after dark**: was it on at night? |
| `waterlogging` | Waterlogging | 2 days | 30 days | Delhi Jal Board / PWD drainage | Drain cleared; the next rain is the real test |
| `sewage` | Sewage | 2 days | 14 days | Delhi Jal Board | Manhole covered, overflow stopped |
| `encroachment` | Encroachment | 14 days | 30 days | MCD Enforcement | Footpath or road usable again |
| `other` | Other | 7 days | 14 days | MCD ward office | Problem gone |

- **Fix target:** each issue gets `dueAt` (`createdAt` plus the category's days) and `overdue` (past `dueAt` and not resolved). The issue page shows "Fix due by" or "Overdue since". The officer queue and scorecard will use the same numbers.
- **Problems that come back:**
  - A new report of the same category within 50 m of an issue resolved inside the "comes back" window **reopens that issue** instead of starting a new one.
  - It goes back to open, its `reopenCount` goes up, the resolution votes are cleared, the reporter is added as affected, and its history records "Reported again N days after it was marked fixed".
  - The API answers `200 { issue, reopened: true, daysSinceFix }` instead of `201`, and the report flow shows "Reported again".
  - A failed fix therefore stays on the ward's record instead of disappearing behind a fresh ticket.
- **Departments** are shown to residents on the issue page. For the pilot, each ward has a single officer. Routing by department is the natural next step.
- **Verification rules:** `verifyHint` and `verifyAfterDark` are already in the issue detail API. The voting screen (Phases 13–14) will show the hint and only accept streetlight confirmations after sunset.

---

## Reporting an issue

`/report` is a three-step flow. It's behind login, because `src/proxy.ts` sends logged-out visitors to `/login?next=/report`.

1. **Photo.**
   - "Take a photo" opens the rear camera directly on phones (`capture="environment"`). "Choose from gallery" uses the normal picker, and on desktop a photo can be dropped onto the page.
   - The photo is compressed **in the browser** with `browser-image-compression`, to a JPEG of about 120 KB, at most 1600 px. A typical 1 MB phone photo uploads as about 100 KB, which matters on mobile data.
   - Files that aren't images, or that can't be decoded (for example HEIC in Chrome), get a clear message instead of a broken upload.
2. **Location.**
   - The step asks for GPS as soon as it opens. The pin starts at the fix, with an accuracy circle. If the fix is worse than ±100 m, a note asks for the pin to be dragged to the exact spot.
   - If location is denied or unavailable, the user taps the map to drop the pin. There's also a "Put the pin at the centre of the map" link for people who find dragging fiddly.
   - The card below the map shows the coordinates, whether they came from GPS or were placed by hand, and the **ward**, worked out in the browser with a point-in-polygon check against the ward boundaries. Pins outside the six pilot wards are labelled as such, but they're still allowed.
   - The ward outlines are drawn on the picker map, but it doesn't zoom out to fit them, so it stays on the pin.
3. **Details.** Phase 9 adds the form, the nearby-issues check and submission. Today this step shows the photo and location that will be sent.

Going Back and forward keeps the photo and the pin. The photo preview is a local blob URL, released as soon as it's replaced or the flow is left.

---

## Officer accounts

Officers are normal accounts with `role: "official"` and a `ward`. Nobody becomes one on their own say-so.

- **Asking for access:** a resident opens **"I'm a ward officer"** in the account menu (or the link on the 403 page at `/dashboard`). That's `/officer-access`, a form for ward, designation, department, and optionally employee id, office phone and a note. They can see the request's status there, withdraw it while it's pending, or read why it was turned down.
- **Reviewing:** admins open **"Officer access requests"** in their menu (`/admin`).
  - Requests are listed oldest first, with a badge for a government or personal email.
  - **Approve** lets the admin change the ward. For a personal email, the admin must tick that they've confirmed the person another way.
  - **Reject** needs a reason.
  - The **Officers** tab lists every officer, with a two-step **Remove**.
- **No re-login needed:** the 403 pages reload themselves once the refreshed session shows the new role, so an approved officer just opens the dashboard.
- **Other ways in:** `POST /api/admin/officials` (government emails only) and `npm run set-role -- --email … --role official --ward 78` (add `--any-domain` for demo accounts).
- **Demo accounts:** `npm run seed:officials` creates one officer per pilot ward (for example `ward78.officer@pinpoint.test`, Anil Sharma) and `admin@pinpoint.test`, all using `DEMO_PASSWORD`.
- **Roles are checked in the database.** The session cookie records the role at login and lasts 7 days, so trusting it would let a demoted officer keep access for up to a week. Every staff-only API calls `requireStaff()`, which reads the role fresh.
- **Stale cookies refresh themselves.** When `/api/auth/me` sees that the stored role differs from the cookie, it re-issues the cookie.
- **Pages in the proxy:**
  - `/dashboard` is for officials and admins
  - `/admin` is for admins only
  - `/officer-access` needs a login

  Anyone without the role gets a 403 with an explanation page at the same URL.

---

## Ward dashboard and marking a fix

`/dashboard` is the officer's work queue for their own ward.

- **Tabs:** Open, In progress, Awaiting residents and Resolved, each with a live count.
- **Ranking:** most people affected first, then severity, then whatever has waited longest. Overdue issues are flagged in brick.
- **Admins:** they see every ward, or pick one, read-only.
- **Drawer:** clicking a row opens the photo, severity, people affected, age, due date and coordinates. For an officer, it also offers:
  - **Start work** (open → in progress), with an optional note for residents. The note appears in the issue's public history.
  - **Mark as fixed** (open or in progress → awaiting residents).
- **Marking a fix** is where the anti-gaming rules live:
  - **Live photo only.** The camera opens inside the page (`getUserMedia`), and there is no gallery button. Phones that can't do that fall back to the camera app (`capture="environment"`). The server also refuses a photo whose capture time is more than 15 minutes old.
  - **At the spot.** The phone's position is watched while the panel is open, and the panel shows "You're at the issue (6 m away)" or how far off you are. The server checks the distance again against the stored issue location: within **50 m**, with GPS accuracy of **±100 m** or better.
  - **On the record.** The server stores the photo, the officer's position, accuracy, distance and the **server's** timestamp in `issue.fix`, clears any old votes, and adds a status history entry.
  - **Residents decide.** The issue moves to **Pending verification**. Officers can't set **Resolved**; only residents' votes can (see below).
- **Public view:** the issue page shows the after-photo with "Posted by the ward officer 5 minutes ago, taken 6 m from the reported spot" and the officer's note. The officer's identity isn't part of the public API.
- **Races:** both status changes are conditional updates on the current status. A double tap, or two officers at once, can only move the issue once, and the loser's photo is deleted.

**Honest limits.** A determined officer could fake GPS with a spoofing app, or photograph a photo. The 50 m check, the live camera and the server timestamp make cheating deliberate rather than casual. Residents' votes (Phase 13) and Gemini's before/after comparison (Phase 15) are the real checks.

**Testing on a laptop.** Chrome DevTools → More tools → Sensors can set a location near the issue, and the in-page camera uses the webcam.

---

## Residents verifying a fix

When an officer marks an issue fixed, the issue page shows an **"Is it fixed?"** panel. It has two buttons, **Fixed** and **Not fixed**, and a tally for each side ("1 of 3").

- **First to 3 wins.** `VERIFY_VOTES_NEEDED` (3) "Fixed" votes **verify** the issue: it becomes Resolved, with `resolvedAt` set. If 3 "Not fixed" votes come first, **verification fails**:
  - the issue goes back to the officer as **In progress**
  - the after-photo is deleted
  - the votes reset
  - `failedVerifications` goes up by one

  The officer then posts a new after-photo, and voting starts again.
- **Who can vote:** logged-in residents within **300 m** of the issue, with GPS accuracy of ±100 m or better.
  - The browser asks for location only when someone taps a button, and the server checks the distance.
  - Officials and admins can't vote. That includes the officer who posted the fix, and the role is read from the database, not the cookie.
  - The reporter can vote.
- **One vote per person per fix,** and votes are final.
- **Streetlights** can only be checked between 6:30 pm and 5:30 am India time (`isAfterDark()` in `lib/categories.ts`), whatever the server's time zone. During the day the panel says to come back tonight.
- **Race safety:**
  - A vote is a conditional `$push`, which only succeeds while the issue is waiting and this person hasn't voted.
  - Settling is a second conditional update that matches only if the third vote exists (`verification.confirms.2`).
  - However many people tap at once, the issue is decided exactly once.
- **On record:**
  - `failedVerifications` shows on the issue page ("Verification failed 1 time"), in the officer's queue and in the drawer. The scorecard counts it as a rejected fix.
  - It's kept separate from `reopenCount`, which counts problems that came back after being resolved.
- **Before and after:** once a fix is posted, the issue page shows the two photos together (side by side on wide screens, a Before / After toggle on phones), with when each was taken and how far from the reported spot the officer stood. Resolved issues keep it as a record.
- **Distance check:** "Check if I can vote" reads your position once and says how far you are, and turns the buttons off if you're beyond 300 m. The server still does the real check.
- **Check fixes near you:** `/verify` lists fixes waiting for votes within 300 m of you (before/after thumbnails, distance, tallies), from `GET /api/issues/nearby?status=pending_verification`. It asks for your location only when you press the button. Pins for these issues also link to "Check this fix".
- **Officer drawer:** issues awaiting residents show the live tally. The queue and nearby APIs carry counts only (`verification: { confirms, rejects, needed }`).
- **Privacy:** the API gives vote counts and the viewer's own vote (`myVote`), never who voted.

---

## Sessions in the browser

- **Cookie:** logging in or registering sets the httpOnly `pp_session` cookie. Page JavaScript never sees the token.
- **`useSession()`:** reads `/api/auth/me` once per tab and shares the result through a small external store. The header, forms and later pages all agree on who is logged in without refetching.
- **`src/proxy.ts`:** Next 16's replacement for middleware. It verifies the JWT, then:
  - redirects logged-out visitors from `/report` and `/dashboard` to `/login?next=…`
  - sends logged-in users away from `/login` and `/register`
  
  It only exists to make navigation pleasant. Every API route still checks the session itself, so the proxy isn't the security boundary.
- **`?next=`:** only same-site paths are accepted (`safeNext`), so a crafted link can't bounce someone to another site after they log in.
- **Full navigation after login and logout:** this is deliberate. Next's client router caches prefetched pages, and a page prefetched while logged out is the proxy's redirect to login. A full navigation drops those stale entries.
- **Form errors:** they come straight from the API's Zod schemas, so messages like "Enter a valid email address" are written once, on the server.

---

## Design system

The look comes straight from our pitch deck: a civic, editorial style, closer to a newspaper data desk than a startup landing page. Screen drafts are made in Google Stitch first, in the project "PinPoint — Civic Issue Map", which uses these same tokens. They are then built by hand in Tailwind. All tokens live in `src/app/globals.css` as Tailwind v4 `@theme` variables, so they're available as normal utilities (`bg-pine`, `text-ink-soft`, `bg-status-open`, and so on).

**Colour**

| Token | Hex | Used for |
| --- | --- | --- |
| `pine` | `#0B4F4A` | Header, primary buttons, dark panels |
| `brand` / `mint` | `#0F7B6C` / `#13A58A` | Accents, the logo ring, the main call to action |
| `amber` | `#C97A1C` | Anything an agent does (filing, syncing) |
| `ink`, `ink-soft`, `ink-faint` | `#12211F` … `#7A8A87` | Text, in three strengths |
| `mist`, `paper`, `line` | `#EEF4F2`, `#F8FBFA`, `#D8E2DF` | Surfaces and borders |

Each issue status has its own colour: `status-open` (red), `status-progress` (amber), `status-pending` (blue) and `status-resolved` (green). Each category also has its own colour (`cat-pothole`, `cat-garbage`, and so on). Map pins will show the category in the fill and the status in the ring, so the two palettes are kept apart on purpose.

**Type**

- **Source Serif 4** for headings, giving them the deck's editorial voice
- **Lato** for interface text
- **IBM Plex Mono** for machine facts such as coordinates, ticket numbers and timestamps

`next/font` self-hosts all three, so there are no requests to Google at runtime.

**Components**

Shared pieces live in `src/components/ui` (generic) and `src/components/issue` (anything that knows what an issue is). The component sheet in the Stitch project is the visual reference.

| Component | Notes |
| --- | --- |
| `Button` | `primary`, `accent`, `secondary`, `ghost`, `danger`; sizes `md` / `sm`; `loading` shows a spinner and blocks double submits. Use `buttonClasses()` to style a `Link` as a button. |
| `TextField`, `TextArea`, `Select` | Label above the control, then a hint or an error below it. The error turns the border brick and is wired to the control with `aria-describedby` / `aria-invalid`. |
| `Chip` | Toggle for filters. Uses `aria-pressed`, with an optional colour dot and count. |
| `StatusPill`, `StatusDot` | One tone per lifecycle status. `STATUS_TONE` is exported so maps and charts reuse the same colours. |
| `CategoryIcon` | Custom 24 px line icons, one per category, drawn as `plain` or as a tinted `badge`. `CATEGORY_TONE` gives the matching dot, text and tint classes. |
| `SeverityMeter` | Five segments, which turn brick from severity 4 up. Exposed as `role="meter"`. |
| `Skeleton`, `IssueCardSkeleton`, `Spinner`, `EmptyState` | Loading and empty states, so no screen is ever blank. |

`globals.css` imports Tailwind with `source("../")`, so it scans `src/` only. With the default project-root source, the Turbopack loader misses classes in files created after the dev server started.

**If every page keeps reloading in `npm run dev`** (the terminal prints `✓ Compiled in 1ms` after every request), stop the dev server, delete the `.next` folder and start it again. We've seen this a few times with Next 16 and Turbopack. We haven't found a reliable cause, and it never happens in production builds.

Tailwind only generates classes it can find in the source, so colour classes are always written out in full in lookup tables (`bg-cat-pothole`, never `` `bg-cat-${category}` ``).

**Layout**

- **Desktop:** the home page is a fixed-height split. An info panel sits on the left, and the map fills the rest of the screen. The panel is sized to fit a 1536×730 viewport, which is a typical laptop at 125% Windows scaling, without scrolling.
- **Short screens:** on desktop-width screens 820 px tall or less, the root font size drops to 15 px. Everything is in `rem`, so the whole interface scales down evenly instead of feeling zoomed in.
- **Phones:** the map comes first, the panel stacks below it, and navigation moves to a bottom tab bar within thumb reach.
- **Accessibility:** a "Skip to content" link, visible focus rings, and `aria-current` on the active nav item.

---

## Gemini (advisory only)

- **Off by default.** With no `GEMINI_API_KEY`, `tagPhoto` and `compareFix` return `null` and the app works exactly as before. Any failure (timeout after 12 s, a reply that doesn't match the Zod schema) is also `null`.
- **Report tagging:** while the resident places the pin, the photo goes to `POST /api/ai/tag`. The details step is pre-filled with the suggested title, category and severity, but only fields the resident hasn't touched. A photo that doesn't look like a civic problem gets a note instead. What the AI suggested is saved next to what the resident chose (`aiSuggestion`, `userChoice`); `npm run ai:accuracy` reports how often people kept it.
- **Before/after check:** when an officer posts a fix, `checkFix` runs after the response is sent (`after()` from `next/server`), so the officer never waits. It asks whether both photos show the same spot and whether the problem looks fixed, and saves the answer as `fix.ai` only if that after-photo is still the current one. The "Is it fixed?" panel shows it as "AI photo check", worded as a second opinion. Residents' votes still decide.

---

## Scorecards

- **`/scorecard`:** every pilot ward side by side, with city totals, sortable by fixes accepted, fastest fixes or most overdue.
- **`/scorecard/:ward`:** the ward's numbers, each officer who has posted a fix there (current and former), every overdue issue and the last 10 verified fixes.
- **Where the numbers come from:** nothing is stored. `lib/scorecard.ts` reads each issue's `statusHistory` as fix attempts: an officer moving it to Pending verification opens one, and residents close it as verified (Resolved) or failed (back to In progress with no `by`).
  - **Fixes accepted:** verified ÷ (verified + failed).
  - **Median time to fix:** report to residents' confirmation.
  - **First response:** report to the first Start work or posted fix.
  - **Overdue:** the same `isOverdue` the issue page uses.
- **Small samples:** rates and medians show a dash until there are 3 data points (`MIN_SAMPLES`).
- **Officers follow their own record.** A fix counts for whoever posted it, even after they move ward. Only name and designation are public, never email.

---

## Roadmap (next phase)

The full plan for Phases 17–20 is in [`plan.md`](plan.md). Next up is Phase 17, alerts:

- `GET /api/stream` (server-sent events from a MongoDB change stream)
- an in-app prompt for reporters and upvoters when a fix is waiting for their vote
- live map updates, with polling as a fallback
