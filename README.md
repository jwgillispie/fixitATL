# Fix-ATL

Community-driven civic repair for Atlanta. Anyone snaps a photo of a broken thing on the street; the Fix-ATL team reviews, fixes it in the field, and posts a before/after stamped with the flower 🌼.

Live at **[fix-atl.web.app](https://fix-atl.web.app)** · Instagram **[@fix_atl](https://instagram.com/fix_atl)**

---

## Stack

- **Next.js 16** (App Router, static export) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Firebase** — Auth, Firestore, Storage, Hosting
- **Google Maps JS API** with Places library
- **Inter Tight** + **Inter** + **JetBrains Mono** via `next/font/google`

## Repo layout

```
src/
├── app/                      # Next.js App Router routes
│   ├── (page.tsx, etc.)      # Landing, feed, map, submit, account, etc.
│   ├── account/owner/        # Owner dashboard
│   ├── account/queue/        # Owner approval queue
│   ├── account/post/         # Owner direct post
│   ├── account/mark-fixed/   # Mark-as-fixed modal
│   ├── report/[id]/          # Public report detail (4 status variants)
│   ├── profile/[uid]/        # Public profile (member + owner variants)
│   └── auth/                 # Login + signup
├── components/               # Navigation, Footer, AuthGuard, OwnerGuard, LocationPicker, DynamicLink
├── contexts/AuthContext.tsx  # Auth state + email-based isOwner derivation
├── lib/
│   ├── firebase.ts           # Firebase init
│   ├── constants.ts          # ADMIN_EMAILS, brand colors, Atlanta center
│   └── services/             # reports.ts, users.ts, storage.ts
├── types/                    # UserDoc, ReportDoc (locked schema)
└── utils/image.ts            # Client-side photo compression

firestore.rules               # Email-based isOwner check
storage.rules                 # Email-based isOwner check
firestore.indexes.json        # Composite indexes for feed/queue queries
firebase.json                 # Hosting config + dynamic-route rewrites
mockups/                      # Original hi-fi HTML mockups (reference)
FIXATL_MVP_PLAN.md            # Full data model + architecture spec
FIXATL_WEEK_PLAN.md           # 7-day build schedule
```

## Local setup

```bash
git clone <this-repo>
cd fixitatl
npm install
cp .env.example .env.local
# fill .env.local with real values (Firebase config + Google Maps API key)
npm run dev
# → http://localhost:3000
```

## Deploy

```bash
npm run build            # produces out/
firebase deploy          # rules + hosting
# or partial:
firebase deploy --only hosting
firebase deploy --only firestore:rules,storage
```

## Adding a Fix-ATL team member as owner

Edit the admin email list in **3 places** (must match exactly):

1. `src/lib/constants.ts` → `ADMIN_EMAILS`
2. `firestore.rules` → `isOwner()` function (inline list)
3. `storage.rules` → `isOwner()` function (inline list)

Then `firebase deploy --only firestore:rules,storage,hosting`.

The new email becomes an owner the moment they sign up — no scripts, no console clicking. Auth derives `isOwner` from `request.auth.token.email` matching the list.

## Architecture quick-ref

- **Static export.** Every route is a static HTML file at build time. Dynamic routes (`/report/[id]`, `/profile/[uid]`, `/account/mark-fixed/[id]`) use the **underscore placeholder trick**: a single `_/index.html` is generated, then `firebase.json` rewrites every request like `/report/abc123/` to that file. Client-side, `useParams()` reads the real ID.
- **Use `<DynamicLink>` (not `<Link>`)** when linking to dynamic routes. Soft navigation breaks the underscore trick because Next.js's router won't find a known route for the real ID.
- **Email-derived isOwner.** Firestore's `users/{uid}` doc has an `isOwner` field but the app **ignores it**. The real source of truth is the `ADMIN_EMAILS` constant + matching rules. This lets us promote owners without console clicking.
- **Google Maps loader.** Both `<MapPage>` and `<LocationPicker>` use `useJsApiLoader` with the same `id` and `libraries` so the script dedupes. Don't reintroduce `<LoadScript>` — it conflicts.

## Data model

See [FIXATL_MVP_PLAN.md § 6](./FIXATL_MVP_PLAN.md) for the locked schema. Field names are `camelCase`, every optional field is explicit `null` not `undefined`, denormalized strings (`createdByDisplayName`, `fixedByDisplayName`) are snapshotted at write time to avoid joins.

## License

Community-owned. Not for resale.
