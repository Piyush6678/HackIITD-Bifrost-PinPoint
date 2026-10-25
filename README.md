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
| **17** | **Alerts: bell, notifications, live stream with polling fallback** | **Done** |
| **18** | **Escalation: evidence pack, councillor petition, RTI draft** | **Done** |
| **19** | **TinyFish: official ward data, road ownership, contacts, notices** | **Done** |
| **20** | **Demo data, home-screen install, demo script** | **Done** |

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
npm run seed:demo            # optional: demo accounts and 20 reports; logins in login.md
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Needed from | Description |
| --- | --- | --- |
| `MONGODB_URI` | Phase 1 | Connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/pinpoint` |
| `JWT_SECRET` | Phase 1 | Signs session tokens. At least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GEMINI_API_KEY` | Phase 15 | Google AI Studio key. Leave empty to run without AI; every AI feature just stays hidden. |
| `GEMINI_MODEL` | Phase 15 | Gemini model id (default `gemini-3.5-flash`) |
| `TINYFISH_API_KEY` | Phase 19 | TinyFish key, used to import ward boundaries, road lists and contacts, and to monitor official notices. Leave it empty and every TinyFish feature is simply off. |
| `TINYFISH_WEBHOOK_SECRET` | Phase 19 | Secret in the webhook address the monitors report to. TinyFish doesn't sign webhooks, so this is the only check. |
| `CRON_SECRET` | Phase 19 | Sent as `Authorization: Bearer ...` to `/api/cron/notices`, which polls the monitors when webhooks can't reach us |
| `APP_URL` | Phase 19 | Public `https://` address of the site, used by `npm run setup:monitors` to build the webhook address |
| `DEMO_PASSWORD` | Phase 10 | Password for every demo account made by `npm run seed:officials` and `npm run seed:demo` |

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
| `npm run import:wards` | Finds, checks and (with `--write`) saves official ward boundaries. See "TinyFish". |
| `npm run import:roads` | Reads MCD's notified-roads list. |
| `npm run import:contacts` | Asks a TinyFish agent for each ward's councillor and RTI officers. |
| `npm run setup:monitors` | Creates the TinyFish monitors for official notices. Run once. |
| `npm run seed:officials` | Create one demo officer per pilot ward plus an admin (`*@pinpoint.test`). Uses `DEMO_PASSWORD`, and re-running resets their password to it. |
| `npm run seed:demo` | The full demo: officers, admin, 12 residents, 20 reports across Wards 76, 78, 79 and 80 in every state (overdue, failed fixes, reopened, awaiting votes, verified), alerts and officer requests. Re-running replaces only what it made. Writes the logins and a demo walkthrough to `login.md` (gitignored). |
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
    photoScreen.ts         turns Gemini verdicts into refusals: unsafe photos, under 60% fix match
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
| POST | `/api/admin/officer-requests/:id/check` | Admin. Searches MCD and Delhi government sites for the applicant and reads the top pages. Returns `{ hits, nameFoundOn }`; a hint only. 503 if TinyFish isn't configured. |
| GET | `/api/admin/ward-contacts` | Admin. Every ward's contacts (with source and fetch date) and its latest import run, including any proposal waiting for review. |
| POST | `/api/admin/ward-contacts/refresh` | Admin. `{ ward }`. Starts a TinyFish agent on MCD's pages. 202 with the run; 409 if one is already running for that ward. |
| GET | `/api/admin/import-runs` | Admin. The TinyFish log, newest first. Optional `kind`. |
| POST | `/api/admin/import-runs/:id/accept` | Admin. Saves a contacts proposal into the ward. The only way it reaches the ward. 409 if not waiting for review. |
| POST | `/api/admin/import-runs/:id/reject` | Admin. Discards a contacts proposal. |
| GET | `/api/admin/notices` | Admin. Query: `status=pending\|approved`. |
| PATCH | `/api/admin/notices/:id` | Admin. `{ approved, categories? }`. Approving is what makes a notice public. |
| DELETE | `/api/admin/notices/:id` | Admin. Discards a notice. |
| GET | `/api/admin/officials` | Officials with their wards |
| POST | `/api/admin/officials` | `{ email, wardNumber }`. Promotes an **existing** account to official for that ward. The email must be `@mcd.nic.in` or `@delhi.gov.in`. Errors: 404 for no such account or ward, 409 for an admin, 422 for a non-government email. |
| DELETE | `/api/admin/officials/:id` | Turns an official back into a resident. Their past actions stay in issue histories. |

### Other

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/photos/:id` | Raw image, served with `Cache-Control: immutable` |
| GET | `/api/wards` | Pilot wards. Add `?boundary=true` to include the GeoJSON polygons. |
| POST | `/api/ai/tag` | Logged in, 20 an hour. Multipart `photo`. Returns `{ suggestion: { photoCheck, looksLikeCivicIssue, category, severity, title } \| null, blocked: string \| null }`. `suggestion` is `null` when AI is off, the call fails or the photo is blocked; `blocked` says why it would be refused. |
| GET | `/api/notifications` | Logged in. Query: `unread=true` for unread only. Returns the latest 30 as `{ notifications, unreadCount }`. Always the caller's own. |
| POST | `/api/notifications/read` | Logged in. `{ all: true }` or `{ ids: [...] }`. Only touches the caller's own notifications. Returns `{ updated, unreadCount }`. |
| GET | `/api/stream` | Logged in. Server-Sent Events (`text/event-stream`): a `notification` event for each new notification, a `: ping` comment every 25 s, and `unavailable` if the change stream can't run. |
| GET | `/api/issues/:id/escalation` | Public. Ready-to-send `petition` and `rti` drafts (`{ to, subject, body }`), plus the RTI fee and filing portal. 409 unless the issue can be escalated. |
| GET | `/api/notices` | Public. **Approved** official notices only. Query: `ward` (id), `category`, `limit` (1-20, default 5). A notice with no categories matches every category. |
| POST | `/api/webhooks/tinyfish` | Where TinyFish monitors report. Needs `?secret=` (or an `x-webhook-secret` header) equal to `TINYFISH_WEBHOOK_SECRET`; 401 otherwise, 503 if no secret is set. Stores candidates unapproved. |
| POST | `/api/cron/notices` | `Authorization: Bearer <CRON_SECRET>`. Runs each monitor now and ingests the results. `GET` works too, for Vercel Cron. |
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

136 tests across thirteen suites. The API suites run against a real MongoDB replica set in memory:

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
- **gemini:** structured replies parsed, bad or slow replies and a missing key give `null`, `/api/ai/tag` needs a login, is rate limited and says why a photo would be blocked; sexual, violent, private and unrelated report photos refused with nothing stored, the tag verdict reused on submit, reports let through when the model fails; after-photos under 60% refused (exactly 60% accepted), unsafe after-photos refused, the comparison shown with the fix, and fixes let through when the model fails (SDK mocked)
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
- **Races:** both status changes are conditional updates on the current status. A double tap, or two officers at once, can only move the issue once, and the loser's photo is deleted. (Only a photo that never became a fix is deleted; a fix residents turned down is kept.)

**Honest limits.** A determined officer could fake GPS with a spoofing app, or photograph a photo. The 50 m check, the live camera and the server timestamp make cheating deliberate rather than casual. Residents' votes (Phase 13) and Gemini's before/after comparison (Phase 15) are the real checks.

**Testing on a laptop.** Chrome DevTools → More tools → Sensors can set a location near the issue, and the in-page camera uses the webcam.

---

## Residents verifying a fix

When an officer marks an issue fixed, the issue page shows an **"Is it fixed?"** panel. It has two buttons, **Fixed** and **Not fixed**, and a tally for each side ("1 of 3").

- **First to 3 wins.** `VERIFY_VOTES_NEEDED` (3) "Fixed" votes **verify** the issue: it becomes Resolved, with `resolvedAt` set. If 3 "Not fixed" votes come first, **verification fails**:
  - the issue goes back to the officer as **In progress**
  - the after-photo and the fix details move to `fixAttempts`, so the failed fix stays on record as evidence
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

## Gemini

- **Off by default.** With no `GEMINI_API_KEY`, `tagPhoto` and `compareFix` return `null` and the app works exactly as before. Any failure (timeout after 12 s, a reply that doesn't match the Zod schema) is also `null`, and nothing is blocked: the GPS and time checks and residents' votes still apply.
- **Report tagging:** while the resident places the pin, the photo goes to `POST /api/ai/tag`. The details step is pre-filled with the suggested title, category and severity, but only fields the resident hasn't touched. A photo Gemini flags is refused with the reason and a "Take a different photo" button. What the AI suggested is saved next to what the resident chose (`aiSuggestion`, `userChoice`); `npm run ai:accuracy` reports how often people kept it.
- **Photo screening** (`lib/photoScreen.ts`): every report photo and after-photo gets a `photoCheck` of `ok`, `sexual`, `violent`, `private_info` (mainly an ID, document, screen or close-up face) or `unrelated` (selfies, memes, screenshots, indoor rooms). Anything but `ok` is refused with a 422, and so is a report photo with `looksLikeCivicIssue: false`.
  - The check runs on the server inside `POST /api/issues`, so skipping the tag call doesn't get round it. The verdict from `/api/ai/tag` is cached by the photo's SHA-256 for 30 minutes, so submitting the same photo doesn't ask Gemini again.
- **Before/after check:** when an officer posts a fix, `compareFix` runs before anything is saved. It returns `matchPercent` (0–100, how likely the after-photo shows this problem fixed at the same spot), `samePlace`, `looksFixed`, a summary, and the `photoCheck`. Below `FIX_MIN_MATCH_PERCENT` (60) the fix is refused with the score in the message ("59% match, 60% needed") and nothing is stored. Otherwise the result is saved as `fix.ai`, and the "Is it fixed?" panel shows it as "AI photo check" with the match. Residents' votes still decide.
  - The officer waits for the check (up to 12 s), and the form says so while it runs.
  - `matchPercent` is the model's own estimate, not a calibrated probability. Treat 60 as a setting to tune with real photos.

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

## Alerts (Phase 17)

The right people hear about a fix waiting for them, so verification actually happens.

- **`Notification` model:** `{ user, issue?, kind, message, note?, read, createdAt }`. Indexed on `{ user, read, createdAt }`, with a TTL index that deletes them after 60 days. `kind` is `verify_request`, `verified`, `failed`, `in_progress` or `access_decided`.
- **Who gets what** (created in the same route as the change, after it succeeds, in `lib/notifications.ts`):

  | Event | Who | Message |
  | --- | --- | --- |
  | Officer posts a fix | Reporter and upvoters (first 100) | "Is it fixed? Check the officer's photo" |
  | Residents verify | Reporter and upvoters (first 100) | "Fixed and verified by residents" |
  | Verification fails | Reporter and the ward's officers | "Residents say it isn't fixed yet" |
  | Officer starts work | Reporter | "Work has started", plus the officer's note |
  | Officer request decided | The applicant | "Approved: ..." or "Not approved: reason" |

  Saving a notification never fails the request that caused it: errors are logged and swallowed.
- **Bell in the header** (`NotificationBell`): shows the unread count. Opening it lists the latest 30 and marks everything read, but keeps the new ones highlighted while it's open. Each item links to its issue.
- **Live delivery:** `GET /api/stream` watches the notifications collection with a MongoDB change stream, filtered to the session's user id on the server. It sends a heartbeat comment every 25 s and closes the change stream when the request aborts.
  - **Needs a replica set.** Atlas and the test database both are. On a standalone `mongod` the stream reports `unavailable` and the client falls back to polling.
  - **Polling fallback:** `useNotifications` polls `GET /api/notifications` every 60 s whenever the stream isn't up, and tries to reconnect on each poll. Hosts that cut long requests (serverless) therefore still work, just up to a minute slower.
- **Issue page:** if you were asked to check a fix (a `verify_request` for that issue in your latest 30), the "Is it fixed?" panel is highlighted.
- **Privacy:** a notification is only ever visible to its owner. Every query includes the user id from the session.
- **Not built (optional in the plan):** issue status events on the stream, so the map and dashboard refresh without reloading.

---

## Escalation (Phase 18)

When the ward doesn't deliver, residents get evidence-backed ways to push further.

- **When an issue can be escalated** (`escalationState()` in `lib/escalation.ts`, thresholds in `constants.ts`). Any one of these, on an unresolved issue:
  - more than 7 days past its due date (`ESCALATE_OVERDUE_DAYS`)
  - 2 or more failed checks (`ESCALATE_FAILED_CHECKS`)
  - reopened 2 or more times (`ESCALATE_REOPENS`)
- **Failed fixes are kept.** Phase 13 deleted a rejected after-photo. Now `settle` in the confirm route moves it, with when it was posted, the distance, the officer's note and the vote counts, into `Issue.fixAttempts`. The issue page lists these under "Fixes residents turned down", and the evidence pack includes them. The officer is not named there.
- **Evidence pack** (`/issues/:id/evidence`): a plain page for printing or "Save as PDF" from the browser (no PDF code). It has the summary, why it qualifies, the before photo, every rejected fix and the latest fix with its outcome, the timeline, days since reported and overdue, residents affected, the generation date and the live link. It names no reporter or voter. The site header and bottom bar are hidden when printing.
- **Drafts** (`GET /api/issues/:id/escalation`, built by `buildPetition` and `buildRti`): counts and issue facts only, with the applicant's name and address left as `[...]` for the resident to fill in. Each has a "Copy text" button on the issue page.
  - **Councillor petition,** addressed to the ward's councillor.
  - **RTI application** under Section 6(1) of the Right to Information Act, 2005, addressed to the PIO. It asks for the date the complaint was received, the responsible officer, the action taken with dates, the reasons for delay and certified copies of the records. The fee is Rs. 10, as the Delhi government's RTI portal states.
  - **Where to file:** departments starting with "MCD" point to MCD's own page, <https://mcdonline.nic.in/portal/rti>. Delhi Jal Board and PWD point to <https://rtionline.delhi.gov.in/>. **Check both before launch.** Portals move, and MCD's exact filing steps were not confirmed.
- **Addressees come from `Ward.contacts`:** an entry whose `department` contains "councillor" is used for the petition, and one containing "PIO" or "public information" for the RTI. **Those lists are empty today**, so the drafts fall back to "The Councillor, Ward No. N" and "The Public Information Officer" for the department. Names are not made up; fill them in from official MCD pages (Phase 19 imports them).
- **On the issue page:** an "Escalate" section appears only when the issue is eligible, with the three actions.
- **On the ward dashboard:** a queue row and its drawer show "At risk of escalation" (overdue 4+ days, or one failed check, or one reopen) and, once past the thresholds, "Residents can escalate this".

---

## TinyFish: official public information (Phase 19)

**Decision:** PinPoint does not file complaints on government portals. Officers already work and close issues here, and residents verify them here, so filing on MCD-311 or Swachhata would only duplicate it. TinyFish instead brings in **official public information** that makes the loop accurate.

**Rules for every item:** TinyFish imports or refreshes data, and **a person reviews it** before it's used. The app never scrapes a government site while a resident is waiting. Anything TinyFish brought in is shown in **amber**, with its source and when it was fetched. Every run is logged in the admin page's "TinyFish runs" tab.

**The client** (`lib/tinyfish.ts`) wraps the Fetch, Search, Agent and Monitor APIs (`X-API-Key` header) and checks every answer with Zod. With no `TINYFISH_API_KEY`, each call throws a `TinyFishError` with code `not_configured`, routes answer 503, and the rest of the app is unaffected.

### 1. Real ward boundaries
`src/data/pilotWards.ts` uses simplified rectangles, so a report near a ward edge can land in the wrong ward and reach the wrong officer. `npm run import:wards` replaces them:

- With no arguments it searches MCD and open-data sites and prints candidate sources. Pick the 250-ward map (post-2022; the older 272-ward data is wrong) and run it again with `--url <geojson>` or `--file <path>`.
- `lib/wardImport.ts` reads the GeoJSON, finds the number, name and zone properties under their usual spellings, keeps the largest piece of a MultiPolygon, closes rings and fixes swapped `[lat, lng]` pairs, saying so for each.
- **Checks before anything is written:** every pilot ward is found (by name, then number); outlines are inside Delhi and don't cross themselves; no two wards overlap by more than 5%; and the default map centre still lands in ward 78. It prints what would change per ward.
- With `--write` and every check passing, it writes `src/data/wards.generated.ts` (with the source and date in its header). `pilotWards.ts` then uses those boundaries, and `npm run seed:wards` loads them.
- PinPoint keeps its own ward numbers. If the official file numbers a ward differently, the script says so instead of renumbering.
- `seed:wards` no longer wipes `contacts`, so a reseed can't erase imported contacts.
- Loading all 250 wards is left out: only the pilot wards are imported.

### 2. Who owns the road
Road damage names "MCD Engineering (PWD for roads over 60 ft)", but the app couldn't tell which applied.

- `npm run import:roads` finds MCD's "List of Notified Roads" (or takes `--url` / `--file`), reads the road tables out of the page or PDF by their headings, and with `--write` saves `src/data/notifiedRoads.generated.ts`. It prints a sample first. If it finds no table it shows the start of the text instead of guessing.
- After a road-damage report is saved (using `after()`, so the resident never waits), `lib/roadOwner.ts` matches the report's `address` and the nearest named road from OpenStreetMap's Nominatim (cached, one request a second, identifying User-Agent) against the list.
- A road in the list is `MCD`, or `PWD` if its width is over 60 ft. A match must be unambiguous: a vague name like "Main Road", or two roads with different owners, leaves it unknown.
- The issue stores `roadOwner` and `roadName`. The issue page and the officer's drawer then say "Handled by MCD Engineering · Road: Pusa Road (MCD notified road)". When unknown they say "Likely MCD Engineering (PWD for roads over 60 ft)".
- The RTI draft uses the matched body, so PWD roads point to the Delhi government RTI portal.

### 3. Contacts for escalation
- `npm run import:contacts [--ward N] [--apply]` starts a TinyFish agent per ward on the most relevant MCD page, asking for the councillor, the PIO and First Appellate Authority for RTI, and the zone's Deputy Commissioner. The goal says to include a phone number or email only if it is published, and never to guess.
- The answer is validated and stored as a **proposal** on an `ImportRun`, with a diff against what the ward has now. `Ward.contacts` is not touched until an admin accepts it (`--apply` does the same from the script).
- **Admin page → Ward contacts:** each ward's contacts with source and fetch date, a "Refresh from MCD" button (async; the page checks again every 8 s), and the proposed changes with Accept and Discard.
- The Phase 18 petition and RTI drafts pick up the councillor and PIO from `Ward.contacts`.

### 4. Official notices (monitors)
- `npm run setup:monitors -- --app-url https://...` creates four daily TinyFish **search** monitors (`topicQueries` in `src/data/noticeSources.ts`): the pilot place names, Delhi Jal Board water shutdowns, PWD/MCD road works, and MCD sanitation drives. They report to `POST /api/webhooks/tinyfish`. Skip `--app-url` and use the cron route instead.
  - **No page monitors.** Delhi government sites (delhi.gov.in, Delhi Jal Board, PWD) refuse TinyFish's page fetcher (`proxy_error`), and MCD's home page is built in the browser, so a page monitor only ever sees a blank page. Add a page that does load with `--page "Name=url"`.
  - Search results include social posts as well as news and official pages, so the admin review step matters: approve news and government sources, reject the rest.
- TinyFish webhooks aren't signed, so the secret sits in the webhook address (`?secret=`). The payload is treated as untrusted text. A page monitor's text is split into lines and only lines naming a pilot ward become candidates. A topic monitor's new results are used as they are.
- Candidates are stored as `Notice` rows with `approved: false`, deduplicated by a hash of the address and title, with the wards matched by place name (and the categories by keyword).
- **Admin page → Notices:** approve or discard. Only approved notices are ever returned by `GET /api/notices`.
- **Where approved notices appear (amber):** a list on the home page panel, the issue page when a notice matches its ward and category, and the officer dashboard for their ward.
- **Cost:** a handful of monitors, once a day. Check the TinyFish wallet before a demo.

### 5. Helping admins check officer requests
Each pending request has a **"Check public records"** button. It searches only MCD and Delhi government domains for the applicant's name, designation and ward, reads the top three pages, and shows each with a link and whether the name appears (with the words around it). The admin still decides. The log keeps only counts, not the name.

### What was not done, and what to check
- **No live TinyFish call has been made.** The client follows TinyFish's documentation, and the server code was tested against a stand-in for it. Run each script once with a real key and read its output before relying on it.
- Fetch's `format: "json"` for a GeoJSON file, the exact shape of a monitor's page results, and what MCD's pages and notified-roads list look like are not confirmed. The scripts print what they found and fail loudly rather than guess.
- No open map of the 2022 ward boundaries exists: every downloadable Delhi ward file is the 2017 map (272 wards), and the official 2022 maps are per-ward PDFs on sec.delhi.gov.in. The pilot keeps its six simplified wards.

---

## Roadmap (next phase)

The full plan is in [`plan.md`](plan.md). Next up is Phase 20, the demo and launch:

- `scripts/seed-demo.ts` with the Ward 78 story: a pothole 40 neighbours support, a first fix residents reject, a second that is verified, plus an overdue issue ready to escalate and a streetlight waiting for night
- a PWA manifest, a polish pass at 390 px and 1536x730, accessibility and Lighthouse checks
- deploy to Vercel and Atlas, check that polling works where the live stream is cut, and rehearse the demo script
