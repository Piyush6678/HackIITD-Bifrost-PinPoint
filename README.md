# PinPoint

**One public map for every civic problem, filed into the portals that already exist.**

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

We are building in phases. This README documents what exists today.

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Project setup, tooling | Done |
| 1 | Backend core: auth, issues, duplicate detection, upvotes, wards | Done |
| **2** | **Design tokens, fonts, logo, app shell** | **Done** |
| 3 | UI primitives: buttons, fields, status pills, category icons | Next |
| 4 | Client API layer, login and register pages | Planned |
| 5 | Base map with ward outlines | Planned |
| 6 | Issue pins on the map | Planned |
| 7 | Side panel, filters and sorting | Planned |
| 8 | Issue detail page and upvoting | Planned |
| 9 | Report flow: photo and location | Planned |
| 10 | Report flow: details, duplicate check, submit | Planned |
| 11 | Gemini tagging API | Planned |
| 12 | Gemini suggestions in the report flow | Planned |
| 13 | Official roles and the ward work queue API | Planned |
| 14 | Official dashboard | Planned |
| 15 | Status workflow with proof-of-fix photo | Planned |
| 16 | Community verification API (3 votes within 300 m) | Planned |
| 17 | Verification screen | Planned |
| 18 | Live updates over Server-Sent Events | Planned |
| 19 | Public ward scorecard | Planned |
| 20 | TinyFish agents (file, sync, escalate), demo data, launch | Planned |

---

## Tech stack

- **Next.js 16** (App Router, Route Handlers) for both the frontend and the API
- **MongoDB** with Mongoose 9, using `2dsphere` indexes for all geo queries
- **TypeScript**, **Zod 4** for request validation
- **jose** (HS256 JWT) in an httpOnly cookie, **bcryptjs** for password hashing
- **Vitest** with `mongodb-memory-server` for tests against a real `mongod`
- **Tailwind CSS 4** with theme tokens in CSS, and fonts self-hosted through `next/font`
- Coming up: Leaflet with OpenStreetMap, Google Gemini, TinyFish

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
| `GEMINI_API_KEY` | Phase 3 | Google AI Studio key |
| `GEMINI_MODEL` | Phase 3 | Gemini model id used for image tagging |
| `TINYFISH_API_KEY` | Phase 8 | TinyFish Agent API key |
| `CRON_SECRET` | Phase 8 | Shared secret for the scheduled portal-sync endpoint |

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

The first `npm test` downloads a MongoDB binary, so it is slower than later runs.

---

## Project structure

```
src/
  app/
    layout.tsx             fonts, metadata, app shell
    page.tsx               home: info panel + map area
    not-found.tsx          404 page
    globals.css            Tailwind theme tokens (colours, radii, shadows)
    icon.svg               favicon
  components/
    AppShell.tsx           top bar (desktop), skip link, main region
    NavLinks.tsx           top nav and mobile bottom tab bar
    Logo.tsx               ring mark and wordmark
  app/api/                 Route handlers (one folder per endpoint)
    auth/                  register · login · logout · me
    issues/                list · create · nearby · [id] · [id]/upvote
    photos/[id]/           serves stored images
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
  models/                  User · Issue · Photo · Ward
  data/pilotWards.ts       pilot ward boundaries (Karol Bagh zone)
scripts/seed-wards.ts
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
| GET | `/api/issues/nearby` | public | Query: `lat`, `lng`, `radius` (10–2000 m, default 250), `category`, `includeResolved`. Sorted by distance, and each item has `distance` in metres. |
| GET | `/api/issues/:id` | public | Full detail, including `statusHistory`, verification counts and `aiSuggestion` |
| POST | `/api/issues/:id/upvote` | user | Idempotent. Returns `{ upvoteCount, hasUpvoted }`. 409 if the issue is resolved. |
| DELETE | `/api/issues/:id/upvote` | user | Withdraws your upvote. Also idempotent. |

Fields for creating an issue (`multipart/form-data`):

| Field | Required | Rules |
| --- | --- | --- |
| `photo` | yes | JPEG, PNG or WebP, at most 5 MB. The client will compress photos to about 120 KB in Phase 2. |
| `title` | yes | 3–120 characters |
| `category` | yes | `pothole` `garbage` `streetlight` `waterlogging` `sewage` `encroachment` `other` |
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

### Other

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/photos/:id` | Raw image, served with `Cache-Control: immutable` |
| GET | `/api/wards` | Pilot wards. Add `?boundary=true` to include the GeoJSON polygons. |

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
  "portal": null,Before an issue is created,
  "createdAt": "2026-10-24T07:37:24.454Z"
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

32 tests across four suites run against a real MongoDB replica set in memory:

- **geo:** distance accuracy, GeoJSON round trip
- **duplicates:** 49 m matches and 51 m doesn't; other categories and resolved issues are ignored; ward lookup
- **auth:** registration, hashing, duplicate emails, validation errors, login, `/me`, logout
- **issues:** create, duplicate 409, AI suggestion stored next to the user's choice, rate limiting, upvote idempotency and withdrawal, bbox / category / status filters, nearby ordering, detail, photo serving, wards

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

**Layout**

- **Desktop:** the home page is a fixed-height split. A scrolling info panel sits on the left, and the map fills the rest of the screen.
- **Phones:** the map comes first, the panel stacks below it, and navigation moves to a bottom tab bar within thumb reach.
- **Accessibility:** a "Skip to content" link, visible focus rings, and `aria-current` on the active nav item.

---

## Roadmap (next phase)

Phase 3 adds the shared UI pieces every later screen is built from:

- buttons, text fields, selects, chips, skeletons and empty states
- status pills, a severity meter and a custom icon set for each category
- small formatting helpers for relative time, distance and labels
