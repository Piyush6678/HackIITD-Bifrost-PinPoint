# PinPoint build plan: Phases 13–20

This is the working plan for the rest of the build, for both Aryan and Piyush. For each phase it says what to build, the rules, the API, the data changes, the tests and when it counts as done. What already exists is in [`features.md`](features.md); API details are in the [`README`](README.md).

**The loop everything serves:**
1. A resident reports a problem.
2. It lands in the ward officer's queue.
3. The officer fixes it and posts a live, GPS-checked after-photo.
4. Residents nearby confirm or reject the fix.
5. The result goes on public scorecards.
6. Failures escalate.

| Phase | What | State |
| --- | --- | --- |
| 13 | Verification API (confirm or reject, first to 3) | **Done** |
| 14 | Verification screen | Buttons and tallies done; the rest is next |
| 15 | Gemini: tagging and before/after check | Planned |
| 16 | Public officer and ward scorecards | Planned |
| 17 | Alerts: in-app notifications, live updates | Planned |
| 18 | Escalation: evidence pack, petition, RTI | Planned |
| 19 | TinyFish: official ward data, road ownership, contacts, notices | Planned |
| 20 | Demo data, PWA, polish, deploy, demo script | Planned |

---

## How we work

**Git**
- Aryan works on the `aryan` branch and merges into `main` through a PR. Piyush commits his own work to `main`.
- Pull before starting a phase.
- **Tell the other person when you edit their files.** Aryan owns the report flow, issue page, upvote and dashboard UI. Piyush owns auth, the officer and admin flows, fixes, verification and the maps.
- Never commit `.env.local`.
- The `tests/` folder must be in git. Delete the `tests` line from `.gitignore` if it's still there.

**No database? No problem**
- `npm test` starts its own MongoDB replica set in memory, with the six pilot wards loaded and everything else wiped before each test. All backend work can be built and proven with tests alone.
- To click through the app, use **your own** database, never the shared one:
  - **Database:** Atlas M0, or Docker: `docker run -d -p 27017:27017 mongo:7 --replSet rs0`, then `rs.initiate()`.
  - **Settings:** your own `.env.local`, with `MONGODB_URI`, a 32+ character `JWT_SECRET` and `DEMO_PASSWORD`.
  - **Seed:** `npm run seed:wards`, then `npm run seed:officials`.
- Testing location features from a laptop: in Chrome DevTools → More tools → Sensors, set the latitude, longitude **and accuracy** (laptops report ±150 m or worse by themselves).

**Code conventions** (see `src/lib/*`)
- Route handlers are wrapped in `route()`. Errors are `throw new HttpError(status, message, extra)`, and Zod failures become 400 automatically.
- Request schemas go in `lib/validators.ts`. Response shapes go in `lib/serialize.ts`, which **never** includes reporter ids, voter ids or emails.
- Anything only staff may do calls `requireStaff(req, ...roles)`, which reads the role from the database.
- State changes are **conditional updates** (`findOneAndUpdate` with the expected state in the filter), never read → change in JS → save. See `upvote`, `status` and `confirm`.
- **Next 16:**
  - Route `params` is a Promise.
  - Type `ctx` as `RouteContext<"/api/...">`, and run `npx next typegen` after adding a route.
  - Pages that use `usePathname` or `useParams` need a `<Suspense>` boundary.
  - Read `node_modules/next/dist/docs/` before using caching APIs.
- Maps use `components/map/LeafletMap.tsx`, never react-leaflet's `MapContainer` (it breaks on Back navigation and in Strict Mode).
- **UI rules:**
  - Use the tokens in `globals.css` (pine, mint, amber for anything an agent does, brick, cobalt).
  - Write Tailwind class names out in full; never build them with string templates.
  - No gradients, no emoji, no glassmorphism.
  - Write plain copy from the resident's side.
- Comments are sparse and explain *why*. Names are plain.

**Definition of done (every phase)**
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` all pass.
- New behaviour has tests (API suites use `tests/helpers.ts`).
- UI is checked in Chrome on desktop (1536×730) and at phone width (390 px).
- README updated: the status table, API reference, testing list and the "Roadmap (next phase)" section. `features.md` and this file's status table are updated.

---

## Phase 13: Verification API (done)

For reference. It's built on `main` (`src/app/api/issues/[id]/confirm/route.ts`, `tests/verification.test.ts`).

- **`POST /api/issues/:id/confirm`:** body `{ vote: "confirm" | "reject", lat, lng, accuracy }`, returning `{ issue, outcome: "verified" | "failed" | null }`.
- **First side to `VERIFY_VOTES_NEEDED` (3) wins:**
  - **Confirm:** the issue becomes `resolved`, with `resolvedAt` set.
  - **Reject:** the issue goes back to `in_progress`, `failedVerifications` goes up by one, the after-photo and `fix` are removed, the votes reset, and the officer posts again.
- **Who can vote:** residents within 300 m with GPS accuracy of ±100 m or better. Staff can't vote, the reporter can, and each person gets one vote per fix.
- **Streetlights** can only be checked 18:30–05:30 IST (`isAfterDark()`).
- **Detail API:** includes `verification: { confirms, rejects, needed }`, `myVote` and `failedVerifications`. `failedVerifications` is also in list and queue items.
- **Issue page:** an "Is it fixed?" panel with **Fixed / Not fixed** buttons and "1 of 3" tallies. Location is requested only when a button is tapped.

---

## Phase 14: Verification screen (rest)

**Goal:** make checking a fix easy and convincing, and help people find fixes to check.

**Build**
1. **Before/after comparison** (`components/issue/BeforeAfter.tsx`).
   - **Desktop:** side by side. **Phone:** a two-tab toggle ("Before" / "After"); a drag slider is optional.
   - **Captions:** when each photo was taken, and "taken 6 m from the reported spot".
   - **Placement:** shown in the "Is it fixed?" panel area while the issue is `pending_verification`, and as a record once it's resolved.
   - **Files:** use `photoUrl`, `resolutionPhotoUrl` and `fix` from the detail API. Replace the separate "After" figure in `IssueView.tsx`.
2. **Distance before voting.**
   - A "Check if I can vote" link in `VerifyPanel` gets the position once.
   - It shows "You're 120 m away, you can vote", or "You're 1.2 km away, only people within 300 m can vote" (and disables the buttons).
   - Reuse `currentPosition()` from `VerifyPanel.tsx`. The server check stays the real one.
3. **"Check fixes near you" page** (`/verify`).
   - **API:** extend `GET /api/issues/nearby` with an optional `status` filter (CSV, like the list endpoint), then call `?lat&lng&radius=300&status=pending_verification`.
   - **Page:**
     - It asks for location with a button, not on load.
     - It lists cards with before/after thumbnails, category, distance and "1 of 3" tallies, each linking to the issue page.
     - **Empty state:** "No fixes waiting near you."
   - Add it to the nav (a bottom-bar icon on phones, a text link on desktop).
4. **Map popup:** for `pending_verification` issues, add a "Check this fix" link next to the existing issue link.
5. **Officer drawer:** show the live tally for issues awaiting residents.
   - The queue currently drops `verification`. Select it in the queue query, but serialise **counts only**, for example `verification: { confirms, rejects, needed }` on queue items.

**Rules**
- Never show who voted. Only show "Fixed / Not fixed" to people who can still vote; everyone else sees the tallies.
- Streetlights in daylight show "Come back tonight" (already done).

**Tests**
- `nearby?status=pending_verification` returns only those issues; a bad status → 400.
- Queue items for `pending_verification` carry vote counts and no voter ids.

**Done when:** a resident on a phone can find a fix nearby, compare before and after, see their distance, and vote, in under 30 seconds.

---

## Phase 15: Gemini (tagging and before/after check)

**Goal:**
- **Faster reports:** AI suggests the category, severity and title from the photo.
- **Harder-to-fake fixes:** AI compares the before and after photos and tells verifiers what it sees.

AI is **advisory only**. It never decides a status.

**Setup**
- `@google/genai` is already a dependency.
- Env vars: `GEMINI_API_KEY`, `GEMINI_MODEL` (a current Gemini Flash model id; check Google AI Studio for the latest).
- **No key means the feature is off.** Every call returns `null` and the app works exactly as today.

**Build**
1. **`lib/gemini.ts`**
   - `tagPhoto(bytes, mimeType)` returns `{ category, severity, title, confidence }` or `null`.
   - `compareFix({ before, after, category })` returns `{ samePlace, looksFixed, confidence, summary }` or `null`.
   - Use structured output (a response schema), then **validate with Zod**. Anything that doesn't parse becomes `null`.
   - Timeout: about 8 s. On any error, log it once and return `null`.
   - Prompt notes:
     - name our 7 categories and the 1–5 severity scale (see `SEVERITY_LABELS`)
     - ask for a short, plain title
     - for comparisons, give the category's `verifyHint`
     - ignore people and number plates
2. **Tagging in the report flow**
   - **API:** `POST /api/ai/tag` (resident, multipart `photo`), returning `{ suggestion }` (or `null`). Limit: 20 an hour per user.
   - **Client:**
     - After `PhotoStep` compresses the photo, call it in the background.
     - `DetailsStep` pre-fills the empty fields, labelled "Suggested from your photo, check it", and the person can change anything.
     - The submit already sends `aiSuggestion` as JSON, and the server stores it next to `userChoice`.
3. **Before/after check**
   - **When it runs:** when an officer posts a fix (`status` route, `pending_verification`). Run the comparison **after the response** (`after()` from `next/server`) so the officer isn't kept waiting.
   - **Storage:** `issue.fix.ai = { samePlace, looksFixed, confidence, summary, model, at }`. Add this to the `fix` schema in `models/Issue.ts`, and to `serializeIssueDetail`.
   - **Display:** in the "Is it fixed?" panel, as a small amber block: "AI check: looks like the same spot; the pothole appears filled. Residents decide." If `samePlace` is false with high confidence, word it as a warning.
   - **Officer drawer:** also show it there, so officers know their photo will be judged.
4. **Measuring the model** (cheap and useful for the pitch): a script or admin-only endpoint reporting how often residents changed the AI's category or severity (`aiSuggestion` vs `userChoice`).

**Privacy:** photos are sent to Google for analysis. Add one line to the report flow ("Photos are checked by an AI to suggest details") and to the README.

**Tests** (mock the SDK with `vi.mock("@google/genai")`)
- A valid model reply is parsed, and an invalid JSON reply or a missing key gives `null`.
- A timeout gives `null`, and reporting still works.
- `/api/ai/tag`: needs login, is rate limited, and returns `null` when the AI is off.
- The comparison is stored on the issue after a fix is posted, and an AI failure doesn't fail the fix.

**Done when:** with a key, a report's details fill themselves in about 3 s and every after-photo carries an AI note. Without a key, nothing breaks.

---

## Phase 16: Public scorecards

**Goal:** make every ward's and officer's record public and easy to compare. `/scorecard` is already in the nav, and today it's a 404.

**Metrics** (all from data we already store)

| Metric | Per ward | Per officer | From |
| --- | --- | --- | --- |
| Reported | yes | — | issues in the ward |
| Resolved (verified by residents) | yes | yes | `status: resolved`; the officer comes from the last `pending_verification` history entry's `by` |
| Median days to verified fix | yes | yes | `resolvedAt − createdAt` |
| Median days to first action | yes | yes | first `in_progress` (or fix) history entry − `createdAt` |
| First-time pass rate | yes | yes | verified fixes ÷ fix attempts (attempts = `pending_verification` history entries) |
| Failed checks | yes | yes | sum of `failedVerifications`, or attempts − verified − still waiting |
| Overdue now | yes | officer's ward | open issues past `dueAt` (`isOverdue`) |
| Came back after fix | yes | — | sum of `reopenCount` |

Use the median, not the mean: one ancient issue shouldn't swamp it. Show "—" when there are fewer than 3 data points.

**Build**
1. **`lib/scorecard.ts`:** MongoDB aggregation pipelines (`$match` on ward, `$unwind` on `statusHistory` where needed). Return plain objects, and unit-test the maths separately (median, pass rate).
2. **API:**
   - `GET /api/scorecard` returns all pilot wards with their metrics, ranked by pass rate, then median days.
   - `GET /api/scorecard/:wardNumber` returns the ward's metrics, its officers (name and designation only, **never email**), the last 10 verified fixes (before/after thumbnails) and the current overdue list.
3. **Pages:**
   - `/scorecard`: a ranked table of the 6 wards with simple CSS bars. No chart library is needed.
   - `/scorecard/[ward]`: headline numbers, an officer table and recent fixes.
   - Both are public, with no login.
4. **Caching:** a scorecard can be a minute old. Use Next 16's `"use cache"` with `cacheLife` (read the docs in `node_modules/next/dist/docs/` first), or a simple 60 s in-memory cache in `lib/scorecard.ts`.

**Fairness rules**
- Officers are public servants, so their name and ward are public. Their contact details aren't.
- Count an issue against the officer who **posted the fix**, not whoever happens to be the ward's officer today.
- Explain each metric in one line on the page ("First-time pass rate: fixes residents accepted on the first try").

**Tests:** build fixture issues with known histories (a verified fix, one failed then verified, one overdue, one with no action), and check every metric exactly, including the "—" for fewer than 3 points.

**Done when:** anyone can open `/scorecard`, see which ward fixes things properly, and click through to the evidence.

---

## Phase 17: Alerts

**Goal:** the right people hear about a fix waiting for them, so verification actually happens.

**Data:** new model `Notification { user, issue, kind, read: false, createdAt }`.
- `kind` is one of `verify_request`, `verified`, `failed`, `in_progress` or `access_decided`.
- Index `{ user: 1, read: 1, createdAt: -1 }`, plus a TTL index to delete after 60 days.

**When to notify** (create notifications in the same route that makes the change, after it succeeds)

| Event | Who | Message |
| --- | --- | --- |
| Officer posts a fix | Reporter and upvoters (cap 100) | "Is it fixed? Check the officer's photo" |
| Residents verify | Reporter and upvoters | "Fixed and verified by residents" |
| Verification fails | Reporter and the ward's officers | "Residents say it isn't fixed yet" |
| Officer starts work | Reporter | "Work has started" (plus the officer's note) |
| Officer request decided | Applicant | "Approved" or "Not approved: reason" |

**Build**
1. **API:**
   - `GET /api/notifications?unread=true` returns the latest 30.
   - `POST /api/notifications/read` takes `{ ids }` or `{ all: true }`.
2. **Live delivery:** `GET /api/stream` (Server-Sent Events).
   - Watch the notifications collection with a MongoDB change stream filtered to `fullDocument.user`. Atlas and our test setup are both replica sets, so change streams work.
   - Send a heartbeat comment every 25 s, and close the change stream when the request aborts.
   - **Fallback:** the client polls `GET /api/notifications` every 60 s if the stream fails. Serverless hosts cut long requests, so polling must work on its own.
3. **UI:**
   - A bell in the header with the unread count.
   - A dropdown list where each item links to the issue; opening it marks everything read.
   - On the issue page, if you have a `verify_request` for that issue, the "Is it fixed?" panel is highlighted.
4. **Optional:** issue events on the stream (status changed) so the map and dashboard refresh without reloading.

**Privacy:** a notification is only ever visible to its owner, and the stream filters by the session's user id on the server.

**Tests**
- Each event creates the right notifications for the right people, and none for others.
- Upvoters beyond the cap are skipped.
- `read` only touches your own notifications.
- The stream route returns `text/event-stream` and sends a first heartbeat.

**Done when:** after an officer posts a fix, the reporter sees "Is it fixed?" in the bell within seconds, without refreshing.

---

## Phase 18: Escalation

**Goal:** when the ward doesn't deliver, residents get ready-made, evidence-backed ways to push further.

**Open decision, settle before starting.** Phase 13 **deletes** a rejected after-photo. For an evidence pack we'd want to keep it. Option: on failure, move the photo id and `fix` into `fixAttempts: [{ ...fix, photo, failedAt }]` instead of deleting it.
- This changes `confirm/route.ts` (the `settle` function) and its tests.
- The public issue page should then list past failed attempts.

**When an issue can be escalated** (one helper in `lib/escalation.ts`)
- overdue by more than 7 days past `dueAt`, **or**
- `failedVerifications >= 2`, **or**
- `reopenCount >= 2`.

**Build**
1. **Evidence pack** (`/issues/[id]/evidence`), a printable page with print CSS. The browser's "Save as PDF" produces the file, so no PDF library is needed. It contains:
   - the issue, its ward, the department, and a map snapshot or coordinates
   - the full timeline with dates
   - "days since reported" and "days overdue"
   - number of people affected, and every after-photo with its outcome
   - the generated date and a link to the live page
   - no personal data
2. **Councillor petition draft:**
   - Fills in the issue facts and the number of residents affected, addressed to the ward councillor.
   - Ward contacts come from `Ward.contacts`, which is **empty today**. Phase 19 (Priority 3) imports them with TinyFish. If 18 is built first, add the 6 pilot wards' councillors and PIOs to `data/pilotWards.ts` by hand from official MCD pages.
   - Includes a "Copy text" button. Signing with names would need opt-in consent, so it's out of scope; use counts only.
3. **RTI draft** (Right to Information Act 2005, Section 6(1)):
   - Addressed to the PIO of the responsible department or ward office.
   - Asks for:
     - the date the complaint was received
     - the officer responsible
     - the action taken, with dates
     - the reasons for any delay
     - certified copies of the relevant records
   - Includes the standard fee note (₹10 in Delhi; check the current rule) and "Copy text".
   - Link to the official Delhi RTI portal, after checking the current URL.
4. **UI:** an "Escalate" section on the issue page, shown only when eligible, with the three actions. The officer dashboard gets an "At risk of escalation" flag.

**Tests:** the eligibility rules (each trigger, and none); the drafts include the right facts and no reporter or voter data.

**Done when:** an issue that failed twice offers a printable evidence pack and two drafts ready to send.

---

## Phase 19: TinyFish (official data for PinPoint)

**Decision:** PinPoint does **not** file complaints on government portals. Officers already open, work and resolve issues inside PinPoint, and residents verify them here, so filing on MCD-311 or Swachhata would only duplicate it. Instead, TinyFish is how PinPoint **brings in official public information** to make its own loop accurate.

**The rule for every item:** TinyFish imports or refreshes data, and **a person reviews it** before it's used. The app never scrapes a government site while a resident is waiting.

**What TinyFish offers:**
- **Fetch:** read a page or PDF into clean text or JSON. Free.
- **Search:** find the right official page. Free.
- **Agent:** a browser run for sites that need clicking through, such as paged lists or map viewers. Uses credits.
- **Monitor:** watch a page or topic and report changes. Uses credits.

API docs: <https://docs.tinyfish.ai> (Agent: `POST https://agent.tinyfish.ai/v1/automation/run-async` with an `X-API-Key` header, then `GET /v1/runs/{id}`). Env var: `TINYFISH_API_KEY`.

**Shared pieces**
- **`lib/tinyfish.ts`:** thin `fetch` wrappers for `fetchPages(urls)`, `runAgent({ url, goal, outputSchema })` and `getRun(id)`.
  - Each has a timeout and validates the result with Zod.
  - With no key, every call returns `null` or throws a clear "TinyFish isn't configured" error, so the app works without it.
- **`ImportRun` model:** `{ kind, source, status, startedAt, finishedAt, summary, error }`. Every import and refresh is logged, and the admin page lists them, so the agent's work is visible.
- **Look:** anything TinyFish brought in is shown in **amber** (our "agent" colour), with its source and when it was fetched.
- **Scripts:** live in `scripts/`, run with `tsx --env-file=.env.local`, and write **reviewable files** (in `src/data/`) or upsert records only after a dry run prints what would change.

### Priority 1: Real ward boundaries and details

**Why:** `src/data/pilotWards.ts` uses **simplified rectangles**. A report near a ward edge can land in the wrong ward and therefore reach the wrong officer's queue.

**Build**
- **`scripts/import-wards.ts`:**
  - Uses TinyFish Search and Fetch to find and download the official post-2022 MCD ward boundaries (250 wards since the 2022 delimitation; older 272-ward data is wrong). Sources: MCD's site, its web map, or a published open dataset.
  - Pulls each ward's number, name and zone.
  - Converts to GeoJSON `Polygon`s and writes `src/data/wards.generated.ts` with the source URL and fetch date in a header comment.
- **Checks before it's used:**
  - Every pilot ward is present.
  - Polygons are valid (closed rings, `[lng, lat]` order) and don't overlap badly.
  - Our known test points still land in the expected ward (`PILOT_CENTRE` is in ward 78).
  - The script prints a diff against the current wards.
- **Then:** `seed:wards` reads the generated file. Keep the six pilot wards first; loading all 250 is optional, but it makes "outside the pilot" accurate.

**Tests:** the converter (sample input → valid polygons), and the point-in-ward checks above against the generated file.

### Priority 2: Who owns the road (MCD or PWD)

**Why:** road damage says "MCD Engineering (PWD for roads over 60 ft)", but today the app can't tell which applies, so "Handled by" is a guess.

**Build**
- **`scripts/import-roads.ts`:** TinyFish fetches MCD's **"List of Notified Roads in MCD"** (linked from mcdonline.nic.in; it may be a PDF) and extracts road names, wards and widths where given. It writes `src/data/notifiedRoads.generated.ts`.
- **Matching a report to a road:**
  - The report flow already sends an optional `address`.
  - Also try a reverse lookup of the nearest named road from OpenStreetMap (Nominatim, which allows light use; cache results).
  - Match against the list by normalised name and ward. If nothing matches confidently, keep the current text and say "Likely MCD Engineering".
- **Storage:** save `roadOwner: "MCD" | "PWD" | null` and `roadName` on the issue when it's created.
  - The issue page and the officer drawer then show "Handled by MCD Engineering · Road: Pusa Road (MCD notified road)".
  - Department routing between MCD and PWD officers can come later; for now this is information.

**Tests:** name normalisation ("Pusa Rd." → "pusa road"), matches and non-matches, `null` when unsure.

### Priority 3: Contacts for escalation

**Why:** the Phase 18 petition and RTI drafts need real addressees, and `Ward.contacts` is empty today.

**Build**
- **`scripts/import-contacts.ts`:** TinyFish fetches official MCD pages for each pilot ward:
  - the **councillor** (name and party, plus office address and phone only if officially published)
  - the **zone's PIO** (Public Information Officer) and First Appellate Authority, for RTI
  - the zonal **Deputy Commissioner's office**

  It writes a dry-run report; after review it upserts into `Ward.contacts` (`{ department, name, phone, email }`, which already exists). Store the source URL and fetch date with each contact.
- **Refreshing:** an admin page section, **"Ward contacts"**, shows each ward's contacts, the source, the last refresh, and a **"Refresh from MCD"** button. That button runs the same import as a TinyFish Agent run (async) and shows the proposed changes for the admin to accept.
- **Phase 18 uses these.** If Phase 18 starts first, fill the six wards' contacts by hand in `pilotWards.ts`, and this import replaces them later.

**Tests:** the parser on saved sample pages, the "proposed changes" diff, admin-only access, and that nothing is written without acceptance.

### Priority 4: Live official notices (TinyFish Monitors)

**Why:**
- Residents and officers see when the city has already announced work: road resurfacing, cleanliness drives, waterlogging advisories, water supply shutdowns.
- It's PinPoint's one continuously running TinyFish feature, which makes it the most visible one in the demo.

**Build**
- **Monitors** (created once by `scripts/setup-monitors.ts`) on the notice and press-release pages of MCD, PWD Delhi and Delhi Jal Board, plus a topic monitor for the pilot ward names and areas (Karol Bagh, Rajinder Nagar, Patel Nagar and so on).
- **Getting updates:** a webhook route, `POST /api/webhooks/tinyfish`, checks a shared secret (`TINYFISH_WEBHOOK_SECRET`). If webhooks aren't available on our plan, use a polling route `POST /api/cron/notices` protected by `CRON_SECRET`.
- **Storage:** new `Notice` model: `{ title, summary, url, source, publishedAt, wards: [ObjectId], categories: [Category], location?: GeoPoint, approved: boolean }`.
  - The ward is matched by place names in the text, or by Gemini (Phase 15) to pull out the place and category.
  - Notices start **unapproved**; an admin approves them on the admin page. Auto-approval of trusted sources can come later.
- **Where notices appear:**
  - **Map:** an amber "Official notices" marker or list for the visible wards.
  - **Issue page:** if an approved notice matches the ward and category, show "Official notice: road resurfacing planned on Pusa Road, 10–20 Nov", with the source link.
  - **Officer dashboard:** the same notices for their ward.
- **Cost control:** a small number of monitors at a sensible frequency (daily is enough). Check the TinyFish wallet before the demo.

**Tests:** the webhook rejects a wrong or missing secret; notice parsing and ward matching on sample payloads; unapproved notices never appear publicly.

### Priority 5 (last): Helping admins verify officer requests

Do this only after 1–4 are done.

- **Admin request card:** a **"Check public records"** button. It runs a TinyFish Search and Fetch over MCD's published staff and officer directories for the applicant's name, designation and ward, and shows what it found (with links) next to the request.
- **Purely a helper:** the admin still decides, and nothing is stored beyond the run log.
- **Search scope:** only official MCD and Delhi government domains (`include_domains`), never social media or personal data.

**Done when:**
- Real ward boundaries are seeded.
- Road damage issues show MCD or PWD ownership when known.
- Every pilot ward has councillor and PIO contacts with sources.
- Approved official notices appear on the map, issue pages and dashboard from a live monitor.
- (Priority 5 if time allows.)

---

## Phase 20: Demo, polish and launch

**Demo data** (`scripts/seed-demo.ts`, `npm run seed:demo`)
- Run it against a **separate demo database**, never real data. It must be safe to re-run: clear demo records first (mark them, for example `demo: true`, or use the separate database).
- **The story (Ward 78, Karol Bagh):**
  1. Ravi reports a deep pothole outside Karol Bagh metro gate 2, and 40 neighbours add their voice.
  2. Officer Anil Sharma starts work and posts a fix. Residents reject it ("Verification failed 1 time").
  3. He fixes it properly, and 3 residents verify it.
  4. The scorecard updates.
- **Also seed:**
  - an overdue garbage issue in another ward that's ready to escalate
  - a streetlight waiting for night-time checks
  - one or two approved official notices (for example a road resurfacing notice on a street with an open road damage issue)
- **Photos:** use the team's own photos only (in `scripts/demo-photos/`), with no copyright issues.

**PWA:** `app/manifest.ts` (name, pine theme colour, icons). Add-to-home-screen on Android works. No offline mode.

**Polish checklist**
- Every page at 390 px and 1536×730, in loading, empty and error states.
- Keyboard and screen reader basics: focus, labels, `aria-live` on the vote result.
- Lighthouse: performance and accessibility of 90 or more on the map and issue pages.
- The 404 and 403 pages, the favicon, and page titles.
- Remove test data and any `console.log`.

**Deploy**
- **Host:** Vercel and MongoDB Atlas. Set the env vars there, and use a fresh `JWT_SECRET`.
- **Seed:** `seed:wards`, `seed:officials` and `seed:demo`.
- SSE may be cut off on serverless, so check that the polling fallback works there.

**Demo script** (3 minutes, with a backup screen recording)
1. The map shows real issues, ranked by people affected.
2. Report something; the AI fills in the details; the duplicate check catches a repeat.
3. Switch to the officer: the queue, then mark it fixed with the GPS check.
4. Switch to residents: before/after, Fixed or Not fixed, then a failed check.
5. Show the scorecard and an escalation draft.
6. TinyFish at work: real ward boundaries putting a report in the right ward, "MCD notified road" on a pothole, and a live official notice on the map.

Use separate browser profiles for the resident, officer and admin.

**Final docs:** README (setup to running in 5 minutes), `features.md`, this plan marked done, and team credits.

---

## Suggested split

| Phase | Lead | Why |
| --- | --- | --- |
| 14 | Aryan | Issue page, map popup and dashboard UI are his areas |
| 15 | Piyush (API) + Aryan (report-flow UI) | Report flow UI is Aryan's |
| 16 | Aryan | Mostly pages and tables over one aggregation file |
| 17 | Piyush | Change streams and SSE touch every event route |
| 18 | Aryan | Pages and text templates; decide the photo question first |
| 19 | Piyush (imports, monitors) + Aryan (notice UI, admin "Ward contacts") | Imports are scripts and data; the notices need map and page UI |
| 20 | Both | Seed script (Piyush), polish pass (Aryan), demo script (together) |

Phases 15 and 16 can run in parallel, as can 17 and 18. Phase 20 starts once 19 is far enough along for the demo story.
