# FIX-ATL — One Week Build Plan

> Goal: ship the MVP at `fix-atl.web.app` in 7 days without rushing.
> Companion doc: [FIXATL_MVP_PLAN.md](FIXATL_MVP_PLAN.md) (the spec). This file is the *schedule*.

---

## Daily rhythm (suggested)

- **Start of day:** open this file, find today's section, read the "Watch-outs" first.
- **Work block:** 2–5 hours, focused. Each day's scope fits in one sitting.
- **End of day:** `git add -A && git commit -m "Day X: …"` and run the day's "Definition of done" checklist. Stop if it passes — don't pull tomorrow's work in.
- **Anything left over** → push to the "Slack" day (Day 7) which intentionally has buffer.

---

## Pre-flight (do this BEFORE Day 1 starts — these have lead time)

These two items can block you mid-week if you don't kick them off now:

- [ ] **Google Maps API key for the `fix-atl` GCP project.**
  Console → APIs & Services → Credentials → Create credentials → API key. Enable *Maps JavaScript API* + *Geocoding API*. Restrict to HTTP referrers: `fix-atl.web.app/*` and `http://localhost:3000/*`. Save it — you'll paste into `.env.local` on Day 2.

- [ ] **Save the Fix-ATL logo.**
  Grab the hexagon-flower from the IG profile photo (right-click → save), ideally as a transparent PNG ≥ 512px. If you can't get a clean version, we'll trace one on Day 1 from the [existing mockup SVG](mockups/logo.svg).

Both are 5-minute tasks. Get them done.

---

## Day 1 — Finish the mockups + asset prep

**Goal:** Every screen and state of the MVP exists in `mockups/`. No more unknowns about UI.
**Time:** 2–3 hours.

### Tasks

- [ ] **Mark-as-fixed flow** — build `mockups/mark-fixed.html`. Modal-style page. Shows the existing before photo, single after-photo uploader, "Confirm fix" button. (This is the **broken flow** — currently the button on `report-broken.html` links to `post.html` which is wrong.)
- [ ] **Update `report-broken.html`** — change the "Mark as fixed" link to point at `mark-fixed.html`.
- [ ] **Pending report variants:**
  - `report-pending-member.html` — what a member sees clicking their own pending report ("Awaiting review by Fix-ATL Team").
  - `report-pending-owner.html` — what an owner sees clicking a pending report (with Approve/Reject buttons inline, same UI as a queue item but standalone).
- [ ] **Rejected state** — add a "Rejected" group to `account.html` with the rejection reason visible to the submitter.
- [ ] **Empty states** — add empty states to: queue ("All caught up 🎉"), account ("Submit your first report"), feed (filtered to nothing).
- [ ] **404 page** — `mockups/404.html`. Minimal, friendly, link back to feed/map.
- [ ] **Owner profile tab** — on `profile.html`, when the profile is an owner, show a second tab "Fixed by them" with their fixes.
- [ ] **Save logo into `mockups/logo.svg`** as the final version (or keep the placeholder — it's fine).
- [ ] **Confirm Maps API key is in hand** (from pre-flight).

### Watch-outs

- Don't redesign anything else. The look is locked. Just fill gaps.
- The mark-fixed page is a **modal in the real app** (`MarkFixedDialog`), but a standalone HTML file is fine for the mockup — just style it as a centered card on a dimmed backdrop so it reads as "modal."

### Definition of done

- `mockups/index.html` shows all new tiles (add them to the directory).
- Clicking "Mark as fixed" on `report-broken.html` goes to `mark-fixed.html` (not `post.html`).
- You can walk through every state of every report (pending, approved, fixed, rejected) as both member and owner.

---

## Day 2 — Project scaffold + Firebase wiring

**Goal:** Empty Next.js project running on `localhost:3000`. Firebase rules deployed. You can `console.log(auth)` and see your Firebase Auth instance.
**Time:** 2–3 hours.

### Tasks

- [ ] `cd /Users/jordangillispie/development/fixitatl`
- [ ] **Scaffold Next.js** (commands in [FIXATL_MVP_PLAN.md §4](FIXATL_MVP_PLAN.md#4-project-bootstrap-commands)).
- [ ] **Install dependencies** (firebase, @react-google-maps/api, lucide-react, etc — same section).
- [ ] **`git init` and first commit** ("Day 2: scaffold").
- [ ] **Create `.env.local`** with all `NEXT_PUBLIC_FIREBASE_*` keys + `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. (Make sure `.env.local` is in `.gitignore` — `create-next-app` adds it by default, verify.)
- [ ] **Drop in `src/lib/firebase.ts`** (full code in plan §12.1).
- [ ] **Drop in `src/lib/constants.ts`** (plan §12.2).
- [ ] **Create `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`** (all code in plan §§7–10).
- [ ] **`next.config.ts`** (plan §11).
- [ ] **`firebase use fix-atl`** to pin the project.
- [ ] **`firebase deploy --only firestore:rules,firestore:indexes,storage`** — deploy rules without deploying hosting yet.
- [ ] **Verify**: `npm run dev` → http://localhost:3000 shows the default Next.js page. In the browser console, add `import { auth } from '@/lib/firebase'` test in a temporary file and confirm no errors.
- [ ] **Move `mockups/` into `public/mockups/`** so they ship alongside the real app (or leave them at project root — your call). Easier to delete later if at root.

### Watch-outs

- **`create-next-app .` on a non-empty directory** — the `.claude/` and `mockups/` folder are already there. Modern `create-next-app` handles this fine but may prompt. Confirm and proceed.
- **Don't use `--src-dir` and not `--import-alias`** — keep them both consistent. The plan assumes `@/*` resolves to `src/*`.
- **Firestore region:** if not already created, pick `nam5` (US multi-region) or your nearest single-region. Cannot be changed later.
- **Maps API key restrictions:** if you restrict by referrer and forget `localhost:3000/*`, you'll get a "REQUEST_DENIED" error in dev that's confusing. Add `http://localhost:3000/*` AND `http://localhost:*/*` to be safe.

### Definition of done

- `npm run dev` runs without errors.
- `firebase deploy --only firestore:rules` reports `✔ Deploy complete!`.
- You've committed Day 2's work to git.

---

## Day 3 — Auth + data layer scaffolding

**Goal:** You can sign up, sign in, sign out. A user doc gets created in Firestore. The account page shows your signed-in info.
**Time:** 3–4 hours.

### Tasks

- [ ] **TypeScript types:** `src/types/user.ts`, `src/types/report.ts` (plan §6).
- [ ] **`src/lib/services/users.ts`** (plan §12.5) — createUserDoc, getUserDoc, subscribeUserDoc, updateUserProfile.
- [ ] **`src/contexts/AuthContext.tsx`** (plan §12.7).
- [ ] **`src/components/auth/AuthGuard.tsx` + `OwnerGuard.tsx`** (plan §12.8).
- [ ] **`src/app/layout.tsx`** — wrap with `AuthProvider`, add Inter + Inter Tight Google Fonts, import the mockup shared.css palette into globals.css.
- [ ] **`src/app/auth/login/page.tsx`** + `LoginForm` — translate `mockups/login.html` to React + Firebase `signInWithEmailAndPassword`.
- [ ] **`src/app/auth/signup/page.tsx`** + `SignupForm` — same but `createUserWithEmailAndPassword` + call `createUserDoc` immediately after.
- [ ] **`src/app/account/page.tsx`** — wrap with `AuthGuard`, show user info from `useAuthContext()`. Skeleton only — no reports yet.
- [ ] **Smoke test:** create an account on localhost, refresh the page, confirm session persists. Check Firestore console — your user doc should be there with `isOwner: false`.

### Watch-outs

- **Order matters in signup:** auth user must exist *before* you write the user doc (the `request.auth.uid` is required by the rule). Do `createUserWithEmailAndPassword` → wait → then `createUserDoc`.
- **`isOwner: false` is enforced by rules** — if you try to write `isOwner: true` from client code (even accidentally), the rule rejects with a confusing "permission denied". Always start with `false`.
- **Firebase Auth persistence default is local** — good. Don't override unless you need it.
- **Don't worry about pretty styling yet** — get the data flow right. Day 4–6 is where you swap in the mockup UI.

### Definition of done

- Sign up → user appears in both Firebase Auth and Firestore `users/{uid}`.
- Sign out → redirect to login.
- Visiting `/account` while logged out redirects to `/auth/login`.
- Refreshing `/account` while logged in stays on the page (no flash to login).

---

## Day 4 — Public read pages (landing, feed, map, report detail)

**Goal:** Anyone (signed in or not) can browse the site. No write flows yet.
**Time:** 4–5 hours.

### Tasks

- [ ] **`src/lib/services/reports.ts`** (plan §12.6) — just the read functions for now: `getReport`, `subscribeFeed`, `getReportsForUser`.
- [ ] **Seed 3–5 sample reports** manually via Firebase Console (paste in the field structure from plan §6.2). Mix of `approved` and `fixed`. Use any image URL.
- [ ] **Translate `mockups/landing.html` → `src/app/page.tsx`** — break into components: `Hero`, `StatsBand`, `FeaturedFix`, `RecentlyFixed`, `HowItWorks`, `Categories`, `CTA`, `Footer`.
- [ ] **`src/app/feed/page.tsx`** — `subscribeFeed` + filter chips + grid of `ReportCard` components.
- [ ] **`src/app/map/page.tsx`** — `MapView` component with `LoadScript` + `Marker`. Use color-coded pins by status. Skip the fancy custom illustration — that was a mockup-only flourish. Real Google Maps is fine.
- [ ] **`src/app/report/[id]/page.tsx`** — use `'use client'` + `useParams()` + `getReport(id)` + loading + 404 states. Render before-only or before/after based on status. Owner action panel hidden when `!isOwner`.
- [ ] **`generateStaticParams` for the dynamic route** (plan §11) so static export builds.
- [ ] **Run `npm run build` to confirm static export works** — easy to break this. Catch it now, not on Day 7.

### Watch-outs

- **The "After" composite from the mockup is a CSS trick** (orange wash + multiply blend). Lift those styles into a `<BeforeAfterView>` component. Don't try to reproduce in JS image manipulation.
- **`generateStaticParams`** for `/report/[id]` needs to return `[{ id: '_' }]` (the placeholder per plan §11). The actual ID is read client-side from `useParams()`. If you return real IDs, every new report requires a rebuild — bad.
- **Map loading flash** — `LoadScript` shows a blank space while loading. Add a skeleton or spinner.
- **Real Google Maps in dev** — if the Maps key isn't working, check (a) referrer restrictions include `localhost:3000`, (b) Maps JavaScript API is *enabled* in the GCP project (not just created).

### Definition of done

- Visit `/`, `/feed`, `/map`, `/report/<sample-id>` while signed out — everything renders, no errors.
- Filter chips on `/feed` actually filter (status: all / approved / fixed).
- Pins on `/map` are colored correctly (red for `approved`, green for `fixed`).
- Clicking a report card or pin opens the detail page.

---

## Day 5 — Submit flow (member can post a broken thing)

**Goal:** A signed-in member can fill the submit form and create a `pending` report. Their account page shows it.
**Time:** 4–5 hours.

### Tasks

- [ ] **Copy `LocationPicker.tsx`** from `hipop/hipop/hipop-website/src/components/shared/LocationPicker.tsx` into `src/components/shared/LocationPicker.tsx`. It already uses the right Cloud Run proxy URL.
- [ ] **`src/utils/image.ts`** — client-side compression (plan §12.3).
- [ ] **`src/lib/services/storage.ts`** (plan §12.4) — uploadReportPhoto, deleteStoragePath.
- [ ] **Add the write functions to `src/lib/services/reports.ts`** — `submitReport`. (Save `ownerCreateReport`, `approveReport`, etc. for Day 6.)
- [ ] **`src/app/submit/page.tsx`** with `AuthGuard`. Translate `mockups/submit.html`. Form state with React. On submit: compress → upload → write Firestore → redirect to `/account` with `?success=1` query param.
- [ ] **Update `src/app/account/page.tsx`** to render the user's reports using `getReportsForUser(uid)`. Group by status (pending, approved, fixed, rejected — even if no rejected yet).
- [ ] **End-to-end test:** sign up, submit a report with a photo, see it on `/account` with "Pending" badge. Verify the doc in Firestore + the image in Storage.

### Watch-outs

- **Pre-generate the report ID before upload** (plan §6.3 and §12.6) — `doc(collection(db, 'reports'))` gives you a deterministic ID. Use it for both the storage path and the Firestore doc. This is how the storage rules know it's the same user.
- **Image compression on iOS Safari** — sometimes `canvas.toBlob` returns null on the first try due to image not being fully decoded. The `loadImage` helper in `utils/image.ts` awaits `img.onload` to avoid this. Don't shortcut it.
- **Camera capture on mobile** — `<input capture="environment">` only works on HTTPS or localhost. Test on the deployed site, not just IP-over-LAN.
- **Storage rules require the file to be < 5MB** — your compression targets 1.5MB so you have headroom, but huge originals (some iPhones produce 40MB HEIC) need to be compressed *first* or the upload itself fails. Test with a heavy photo.

### Definition of done

- You can submit a report end-to-end as a normal user.
- The new report appears in `/account` with a Pending badge.
- It does NOT appear in `/feed` or `/map` yet (because status=pending, and rules block public read of pending).
- The before photo is visible at the storage URL.

---

## Day 6 — Owner flows

**Goal:** You can approve, reject, mark fixed, post a direct fix, and delete. The whole moderation loop works.
**Time:** 4–5 hours.

### Tasks

- [ ] **Flip yourself to owner.** Firebase Console → Firestore → `users/{yourUid}` → edit `isOwner` from `false` → `true`. (Yes, you have to do this manually in the console. That's the design — see plan §17.)
- [ ] **Confirm `useAuthContext().user.isOwner` returns `true` on next page load.**
- [ ] **Add the write functions to `reports.ts`:** `ownerCreateReport`, `approveReport`, `rejectReport`, `markReportFixed`, `deleteReport`.
- [ ] **`src/app/account/page.tsx`** — when `isOwner`, show the owner dashboard variant. Translate `mockups/account-owner.html`. (Same route, different render based on `isOwner`.)
- [ ] **`src/app/account/queue/page.tsx`** with `OwnerGuard` + `subscribePendingQueue`. Translate `mockups/queue.html`. Approve / Reject (with reason) actions.
- [ ] **`src/app/account/post/page.tsx`** with `OwnerGuard`. Translate `mockups/post.html`. Two-photo upload form (before + optional after).
- [ ] **Mark-as-fixed flow** — translate `mockups/mark-fixed.html` (built on Day 1) into a `MarkFixedDialog` modal. Triggered from the report detail page when viewer is owner and status is approved.
- [ ] **Delete confirmation** — simple `confirm()` dialog is fine for MVP, or a styled modal.
- [ ] **Full loop test:**
  1. Sign in as your normal account (the one that *isn't* the owner now, so use a different email or sign out + create a second).
  2. Submit a report.
  3. Sign back in as owner.
  4. Go to `/account/queue`, see the report, approve it.
  5. Confirm it appears on `/feed` and `/map` as red.
  6. Open the detail page, click Mark as Fixed, upload an after photo.
  7. Confirm pin turns green, before/after toggle works.

### Watch-outs

- **`isOwner` toggle in Firestore Console caches client-side** — you may need to sign out + sign in to re-fetch the user doc, or just refresh the page (since `subscribeUserDoc` will pick it up live).
- **Two accounts to test the full flow** — owner and member. Either use two browsers (Chrome + Firefox) or one normal + one incognito so you can be both at once.
- **`markReportFixed` updates an existing doc** — don't accidentally use `ownerCreateReport`. They have different rules behavior.
- **The `MarkFixedDialog` is a modal** — Headless UI is installed, use `Dialog` from `@headlessui/react`. Don't reinvent.

### Definition of done

- Owner can approve → status changes, report appears publicly.
- Owner can reject with reason → status=rejected, only submitter and owner can see it.
- Owner can mark fixed → after photo uploads, status=fixed, before/after toggle works on detail page.
- Owner can post a fix directly via `/account/post` → goes straight to status=fixed (or =approved if no after photo).
- Owner can delete a report → storage files deleted, doc deleted, no orphaned data.

---

## Day 7 — Deploy + verify + ship

**Goal:** Site is live at the production URL. Verification checklist passes. You can show it to people.
**Time:** 2–4 hours (this day has buffer — if Day 6 ran long, finish here).

### Tasks

- [ ] **`npm run build`** — fix any TypeScript or static-export errors. Common: missing `'use client'` directive, missing `generateStaticParams` on dynamic routes.
- [ ] **`firebase hosting:sites:list`** — confirm `fix-atl` exists. If not: `firebase hosting:sites:create fix-atl`.
- [ ] **`firebase deploy`** — full deploy of hosting + rules. Should output the URL `https://fix-atl.web.app`.
- [ ] **Run the [20-item verification checklist](FIXATL_MVP_PLAN.md#18-verification-checklist-do-this-before-shipping)** against the live site. Do not skip steps.
- [ ] **Add the Maps API key to the production referrer restrictions** if you only had `localhost:3000` so far. Production needs `fix-atl.web.app/*`.
- [ ] **Mobile test** — open the live site on your phone. Submit a report using the camera. This is the most likely failure mode (image rotation, file size, network on cellular).
- [ ] **Bootstrap real owner accounts** — sign up the real Fix-ATL team email, flip `isOwner=true` in console.
- [ ] **Final commit.** Push to GitHub if you've set up a repo.

### Watch-outs

- **First deploy of dynamic routes** — if `/report/<id>` returns 404 on the live site even though it works in dev, your `firebase.json` rewrites are wrong. Check that `/report/*` → `/report/_/index.html` is there and the file actually exists in `out/report/_/index.html` after build.
- **Caching gotcha** — after deploy, the browser may serve cached HTML. Hard-refresh (Cmd+Shift+R) or use incognito to verify.
- **HEIC photos from iPhones** — Safari hands them over as JPEG to the browser file API in most cases, but not always. If you see broken uploads from iOS, add a `accept="image/*,image/heic"` and handle conversion. Most users won't hit this.
- **Don't promise the team a launch date until Day 7 is green** — pad another half-day for surprises.

### Definition of done

- `https://fix-atl.web.app` loads and looks like the mockups.
- A normal user can submit a report.
- An owner can approve and fix.
- All 20 verification checklist items pass.

---

## What to do if you fall behind

The schedule has slack at Day 7. If you slip:

- **Behind by half a day:** push small polish work (empty states, 404 styling) to "post-launch v1.1".
- **Behind by a full day:** cut `/account/post` (owner direct post). Owners can still approve-and-then-mark-fixed via the normal flow. Add direct-post in v1.1.
- **Behind by two days:** cut the map page entirely for launch. Ship feed-only. Map is the most likely to have last-minute bugs (Maps API, marker rendering) and the feed is the more critical surface anyway. Re-add the map in v1.1.

What you should **never** cut:
- Sign up / sign in
- Submit a report
- Owner approval queue
- Mark a report fixed (with after photo)

Those four flows are the product. Everything else is supporting infrastructure.

---

## Definition of "done done"

The MVP is done when:

1. A stranger can land on `fix-atl.web.app` on their phone, sign up, take a photo of a broken thing on their street, drop a pin, and submit. The whole thing takes them under a minute.
2. The Fix-ATL team gets a queue they can clear in 5 minutes a day.
3. The before/after pages look good enough to screenshot for Instagram.

Everything else is v2.
