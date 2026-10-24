# PinPoint: features built so far

What works today (Phases 0–16), who it's for, and how to use it. The README has the API details and setup.

**The loop we're building:** a resident reports a problem → it lands in the ward officer's queue → the officer fixes it and posts a live, GPS-checked after-photo → residents nearby confirm or reject → public scorecards.
Everything up to and including the public scorecards is built. Alerts and escalation come next (see [`plan.md`](plan.md)).

---

## Who uses PinPoint

| Role | How they get it | What they can do |
| --- | --- | --- |
| **Visitor** (not logged in) | — | See the map, every issue, its photos and history |
| **Resident** (`citizen`) | Register at `/register` | Report issues, add their voice (upvote), confirm or reject officers' fixes nearby, ask for officer access |
| **Ward officer** (`official`) | An admin approves their request | Work their ward's queue, start work, mark fixes with an on-site after-photo |
| **Admin** (`admin`) | `npm run set-role -- --email … --role admin` | Approve or reject officer requests, remove officers, look at any ward's queue |

---

## User stories

**Residents**
- As a resident, I can see every reported problem in my area on a map without signing up, so I know what's already known.
- As a resident, I can report a problem with one photo and a pin in under a minute, even on a weak connection.
- As a resident, I'm told when the same problem was already reported nearby, so I add my voice instead of filing a duplicate.
- As a resident, I can see who is responsible, when a fix is due, and whether it's overdue.
- As a resident, if a problem comes back soon after it was "fixed", my report reopens the old issue, so the failed fix stays on record.
- As a resident, I can see the officer's after-photo and how far from the spot it was taken.
- As a resident, my report's details are suggested from my photo, so I only have to check them.
- As a resident, I can see how my ward and its officers compare with others, based on what residents confirmed.
- As a resident near an issue, I can say **Fixed** or **Not fixed**. If 3 people say it's fixed it's verified; if 3 say it isn't, it goes back to the officer and the failure stays on record.

**Ward officers**
- As a ward officer, I can ask for access from my own account, and I'm told if it's pending, approved or rejected (and why).
- As a ward officer, I see my ward's issues ranked by how many people are affected, how severe they are and how long they've waited.
- As a ward officer, I can mark work as started, with a note residents can read.
- As a ward officer, I can mark an issue fixed by taking a live photo at the spot, and the app tells me if I'm too far away.

**Admins**
- As an admin, I can review officer requests with the details I need to verify someone, and assign them to the right ward.
- As an admin, I can remove an officer's access instantly, even if their login cookie is still valid.
- As an admin, I can look at any ward's queue without being able to change it.

---

## Features

### Accounts and sessions
- **Register and log in.**
  - Email and password, with the password hashed with bcrypt.
  - The session is a 7-day httpOnly cookie that page JavaScript can't read.
  - Rate limits apply: registration 5 per 10 minutes, login 10 per 10 minutes.
- **Clear form errors.** Messages such as "Enter a valid email address" come straight from the server's validation.
- **Safe redirects.** After login you return to the page you wanted. Only same-site paths are accepted, so a link can't bounce you to another site.
- **Roles checked in the database.** Every staff-only API re-reads the role, so a removed officer loses access immediately. The cookie refreshes itself after a role change, with no re-login.
- **Page guards** (`src/proxy.ts`):
  - `/report` and `/officer-access` need a login
  - `/dashboard` is for officers and admins
  - `/admin` is for admins only
  
  Anyone else gets a 403 explanation page, which reloads itself if access was just granted.

### The map (`/`)
- **Map:** OpenStreetMap tiles (no API key), limited to Delhi, with the six pilot wards around Karol Bagh outlined and labelled.
- **Pins:**
  - **Live loading:** pins for the visible area load as you pan, debounced, and stale requests are cancelled.
  - **Pin look:** the fill colour is the category, the ring is the status, and size grows with people affected. Resolved issues fade but stay on the map as a record.
- **Popup:** category, status, title, ward, age, people affected, and a link to the issue.
- **Layout:** a split view on desktop; on phones the map comes first, with a bottom tab bar.

### Reporting a problem (`/report`)
1. **Photo:**
   - The camera opens directly on phones, or you choose from the gallery or drop a file.
   - The photo is compressed in the browser to about 120 KB.
   - Unreadable files such as HEIC get a clear message.
2. **Location:**
   - GPS fills in the pin, shown with an accuracy circle. You can drag the pin, or tap the map if location is blocked.
   - The ward is worked out on the spot.
3. **Details:**
   - Title, category, severity (1–5) and an optional description.
   - Open issues within 250 m are shown before you submit.
   - **Duplicate check:** the same category within 50 m of an open issue offers "Add your voice instead" rather than creating a duplicate.
   - **Reopen check:** the same category within 50 m of an issue fixed recently reopens it ("Reported again 3 days after it was marked fixed").
   - Limit: 10 reports an hour per person.

### Checking a fix (issue page)
- **Before and after:** the two photos sit together once a fix is posted (side by side, or a Before / After toggle on phones), with when each was taken and how far from the spot the officer stood.
- **Distance check:** "Check if I can vote" says how far you are from the issue before you press anything.
- **Check fixes near you:** `/verify` lists fixes within 300 m waiting for votes, with before/after thumbnails and tallies. Map pins for these issues link to "Check this fix".
- **Officer drawer:** shows the live tally for issues awaiting residents.
- **"Is it fixed?" panel:** appears once an officer marks an issue fixed. It shows the category's hint about what to look for, and two buttons, **Fixed** and **Not fixed**.
- **Tallies:** both sides are always visible, for example "Say fixed 1 of 3 · Say not fixed 0 of 3".
- **First side to 3 decides:**
  - **3 "Fixed":** the issue is **verified** (Resolved).
  - **3 "Not fixed":** verification fails. The issue goes back to the officer (In progress), the after-photo is removed, and the issue shows "Verification failed 1 time". It also appears on the officer's queue and drawer.
- **Who can vote:** logged-in residents within 300 m.
  - Location is asked for only when you tap a button.
  - Officials and admins can't vote.
  - The reporter can vote.
  - One vote per person per fix, and it's final.
- **Streetlights** can only be checked after dark (6:30 pm–5:30 am).
- **Voting at once:** however many people tap at the same moment, the issue is settled exactly once.
- **Privacy:** nobody sees who voted; you only see your own vote.

### AI help (Gemini)
- **Suggested details:** while you place the pin, Gemini looks at your photo and fills in a title, category and severity. It only fills what you haven't touched, and you can change all of it. If the photo doesn't look like a civic problem, you're told so.
- **Photo check on fixes:** when an officer posts an after-photo, Gemini compares it with the original: is it the same spot, and does the problem look fixed? Residents see this in the "Is it fixed?" panel as a second opinion; their votes still decide.
- **Never in the way:** without an API key, or if Gemini is slow or unsure, the app works exactly as it does without AI. Officers never wait for it.
- **Measured:** what Gemini suggested is stored next to what the resident chose, and `npm run ai:accuracy` shows how often people kept it.

### Public scorecards (`/scorecard`)
- **Every ward side by side:** share of fixes residents accepted, median time to fix, resolved out of reported, and overdue now, with city totals. Sort by fixes accepted, fastest fixes or most overdue.
- **One ward** (`/scorecard/:ward`): the same numbers plus first response time, fixes rejected and problems that came back; each officer who has posted fixes there, current or former, with their own record; every overdue issue with its department; and the last 10 verified fixes.
- **Fair numbers:** worked out from the same public history as the issue pages. A fix only counts as accepted when residents confirm it. Rates and medians show a dash until there are 3 data points. A fix stays on the record of the officer who posted it.
- **Privacy:** officers are named with their designation, never their email.

### Problem categories
- **Seven categories:** Road damage, Garbage, Streetlight, Waterlogging, Sewage, Encroachment and Other.
- **Rules per category** (all in `src/lib/categories.ts`):
  - **Fix target:** for example, garbage in 2 days and road damage in 7. This gives each issue its "Fix due by" date, and issues past it are flagged "Overdue".
  - **Reopen window:** a repeat report inside it reopens the old issue (garbage 7 days, road damage 30).
  - **Department responsible:** for example, MCD Sanitation or Delhi Jal Board.
  - **Checking a fix:** a hint on what residents should check, and streetlights only after dark.

### Issue page (`/issues/:id`)
- **What's shown:**
  - The photo, category, status, severity, coordinates, ward, address and department.
  - The due date, shown as "Overdue since" once it has passed.
  - A small map.
- **History and fixes:**
  - The status history, with officer notes.
  - A notice when an earlier fix didn't hold.
  - **After-photo:** once an officer marks it fixed, it appears with when it was posted, how far from the spot it was taken, and the officer's note.
- **"You're affected too":** an upvote that counts each person once and can be withdrawn. Upvotes are closed on resolved issues.
- **Copy link** for sharing.
- **Privacy:** reporters, voters and officer ids are never in the public API (DPDP 2023).

### Officer access requests (`/officer-access`, `/admin`)
- **Residents ask from their account menu** ("I'm a ward officer"). They give their ward, designation and department, and optionally an employee id, office phone and a note. A personal email gets a heads-up that verification will take longer.
- **Request status:**
  - The applicant sees it as waiting, rejected (with the admin's reason) or removed later.
  - A pending request can be withdrawn.
  - Only one can be pending at a time.
- **Admin review** (`/admin`, "Officer access requests" in the menu):
  - Waiting requests come first, oldest at the top, with a government or personal email badge.
  - **Approve:** the admin can change the ward. A personal email needs the admin to tick that they've confirmed the person another way.
  - **Reject:** a reason is required, and the applicant sees it.
  - **Lists:** tabs for approved and rejected requests, and an **Officers** tab listing every officer with a two-step **Remove**.
  - **Double clicks:** two admins clicking at once can't both decide. If approving fails, the request goes back to waiting.
- **Command-line routes** for setup and demos: `npm run set-role`, `npm run seed:officials` (one demo officer per ward plus an admin).

### Ward dashboard (`/dashboard`)
- **Officers see only their own ward.** Admins see all wards or pick one, read-only.
- **Status tabs:** Open, In progress, Awaiting residents and Resolved, each with a count.
- **Queue:** ranked by people affected, then severity, then age. Shows severity, people affected, hours or days open, and an overdue flag.
- **Issue drawer:** both photos (before, and after once there is one), the details, and the actions.
- **Start work:** moves the issue to In progress, with an optional note for residents.
- **Mark as fixed:**
  - **Live photo only.** The camera opens inside the page with no gallery option, or the camera app on older phones. The server refuses photos taken more than 15 minutes earlier.
  - **At the spot.** It shows "You're at the issue (6 m away)" and won't send until you're within 50 m with usable GPS. The server checks again.
  - **On the record.** The server keeps the officer's position, accuracy, distance and its own timestamp, and the issue moves to **Pending verification**.
  - **Residents decide.** Officers can never mark an issue resolved; only residents' votes can.
- **Safety:** a double tap, or two officers at once, can only move an issue forward once.

---

## Under the hood
- **Stack:** Next.js 16 for the pages and the API, MongoDB with Mongoose, Zod validation, and Tailwind 4 with the pitch deck's colours and fonts.
- **Geo:** `2dsphere` indexes for nearby, duplicate and ward lookups, and haversine distance for the 50 m and 300 m checks.
- **Photos:** stored in their own collection, so map queries never load image bytes.
- **Tests:** 126 tests in 13 suites against a real in-memory MongoDB, covering auth, issues, duplicates, reopening, categories, the proxy, officials, officer requests, the dashboard, fix rules, resident verification, Gemini (with a mocked SDK) and the scorecard maths.

## Coming next
| Phase | Feature |
| --- | --- |
| 17 | Live alerts asking reporters and upvoters to verify fixes |
| 18 | Escalation: evidence pack, councillor petition, RTI draft |
| 19 | TinyFish: file to MCD-311 / Swachhata and sync status |
| 20 | Demo data, polish, demo script |
