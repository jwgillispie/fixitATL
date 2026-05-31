# FIX-ATL — Complete MVP Build Plan

> Single-source-of-truth document for building the Fix-ATL web app MVP.
> Goal: anyone (human or LLM) can read this and ship the whole MVP without further clarification.

---

## 1. Product Overview

**Fix-ATL** is a Community Organization in Atlanta ([@fix_atl on Instagram](https://instagram.com/fix_atl)) that goes around physically repairing broken public infrastructure — drain covers, water meter lids, sidewalks, signage. They paint repaired pieces with the Fix-ATL flower/hexagon logo so the community can see the work.

The website lets:

1. **Anyone in Atlanta** report something broken with a photo + location.
2. **The Fix-ATL owner(s)** approve those reports, then later upload an "after" photo when fixed.
3. **The public** browse a feed and map of what's broken vs. fixed, and view individual before/after stories.

### Personas

| Persona | Capabilities |
|---|---|
| **Visitor** (not signed in) | Browse approved + fixed reports on feed and map. View individual reports. View public profiles. Cannot submit. |
| **Member** (signed in, `isOwner: false`) | Everything above + submit broken-thing reports (go into pending queue). Edit own profile. View own pending/rejected reports. |
| **Owner** (signed in, `isOwner: true`) | Everything above + access approval queue, approve/reject reports, mark approved reports as fixed with an after photo, post before+after directly (skipping queue), delete reports. |

### Non-goals for MVP
No comments, likes, notifications, search, hashtags, in-app messaging, donations, or volunteer scheduling. Future scope only.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React 19 + TypeScript** | Matches `hipop-website` so patterns transfer cleanly. |
| Styling | **Tailwind CSS v4** | Matches `hipop-website`. |
| Backend | **Firebase (Firestore + Auth + Storage + Hosting)** | User already on Blaze plan. |
| Auth | **Firebase Auth — Email/Password** | Per requirements. |
| Maps | **`@react-google-maps/api`** | Same as `hipop-website`. |
| Places autocomplete | **Reuse hipop's Cloud Run proxy** at `https://hipop-places-server-977869241732.us-central1.run.app/api/places` | No new infra. |
| Icons | **`lucide-react`** + **`@heroicons/react`** | Match `hipop-website`. |
| Animation | **`framer-motion`** | For before/after slider. |
| Date formatting | **`date-fns`** | Lightweight. |
| Deployment | **Firebase Hosting** (Next.js static export) | Matches `hipop-website`. |

### Out-of-scope dependencies (do NOT install for MVP)
Stripe, html2canvas, ogl, qrcode, Cloud Functions, FCM.

---

## 3. Firebase Project Config

Already provisioned (Blaze plan, Hosting + Firestore + Storage enabled).

```js
{
  apiKey: "AIzaSyBGkrfy944mSq0JCP62yxXKAH2UCA10vWI",
  authDomain: "fix-atl.firebaseapp.com",
  projectId: "fix-atl",
  storageBucket: "fix-atl.firebasestorage.app",
  messagingSenderId: "93027080043",
  appId: "1:93027080043:web:a803e240b820fb4d361e2e",
  measurementId: "G-JVCRSKSXGH"
}
```

### Firebase services to enable in console (verify)
- [x] Authentication → Email/Password provider
- [x] Firestore Database (Native mode, `nam5` or your nearest region)
- [x] Cloud Storage (default bucket)
- [x] Hosting

### .env.local (project root)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBGkrfy944mSq0JCP62yxXKAH2UCA10vWI
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fix-atl.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fix-atl
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fix-atl.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=93027080043
NEXT_PUBLIC_FIREBASE_APP_ID=1:93027080043:web:a803e240b820fb4d361e2e
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-JVCRSKSXGH

# Get this from Google Cloud Console → fix-atl project → APIs & Services → Credentials.
# Restrict it to: HTTP referrers = fix-atl.web.app/*, localhost:3000/*
# Enable: Maps JavaScript API, Geocoding API (Places is handled by the hipop proxy)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_FIXATL_MAPS_KEY_HERE
```

**ACTION REQUIRED:** Create a Google Maps API key in the `fix-atl` GCP project. Enable Maps JavaScript API. Add it above.

---

## 4. Project Bootstrap Commands

The directory `/Users/jordangillispie/development/fixitatl/` is empty (just a `.claude/` folder).

```bash
cd /Users/jordangillispie/development/fixitatl

# Scaffold Next.js 15 with TS + Tailwind v4 + App Router
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack \
  --no-git

# Install runtime deps
npm install \
  firebase \
  @react-google-maps/api \
  lucide-react \
  @headlessui/react \
  @heroicons/react \
  date-fns \
  framer-motion

# Firebase CLI (skip if already global)
npm install -g firebase-tools
firebase login                # if not already
firebase use fix-atl          # pin this directory to the right project
```

---

## 5. File Tree (target)

```
fixitatl/
├── .env.local                          # NEVER commit (already in .gitignore via create-next-app)
├── .firebaserc                         # { "projects": { "default": "fix-atl" } }
├── firebase.json                       # See §10
├── firestore.rules                     # See §8
├── firestore.indexes.json              # See §8.4
├── storage.rules                       # See §9
├── next.config.ts                      # See §11
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── public/
│   ├── logo.svg                        # Fix-ATL hexagon flower logo (grab from IG)
│   ├── og-image.png
│   └── favicon.ico
└── src/
    ├── app/
    │   ├── layout.tsx                  # Root layout, mounts AuthProvider + Navigation
    │   ├── page.tsx                    # Landing
    │   ├── globals.css
    │   ├── feed/
    │   │   └── page.tsx
    │   ├── map/
    │   │   └── page.tsx
    │   ├── submit/
    │   │   └── page.tsx                # AuthGuard wrapped
    │   ├── report/
    │   │   └── [id]/
    │   │       └── page.tsx            # client component using useParams
    │   ├── account/
    │   │   ├── page.tsx
    │   │   ├── queue/page.tsx          # OwnerGuard wrapped
    │   │   └── post/page.tsx           # OwnerGuard wrapped
    │   ├── profile/
    │   │   └── [uid]/page.tsx
    │   └── auth/
    │       ├── login/page.tsx
    │       └── signup/page.tsx
    ├── components/
    │   ├── Navigation.tsx
    │   ├── Footer.tsx
    │   ├── auth/
    │   │   ├── AuthGuard.tsx
    │   │   ├── OwnerGuard.tsx
    │   │   ├── LoginForm.tsx
    │   │   └── SignupForm.tsx
    │   ├── reports/
    │   │   ├── ReportCard.tsx
    │   │   ├── ReportGrid.tsx
    │   │   ├── StatusBadge.tsx
    │   │   ├── CategoryBadge.tsx
    │   │   └── BeforeAfterView.tsx     # toggle / slider
    │   ├── feed/
    │   │   └── FeedFilters.tsx
    │   ├── map/
    │   │   ├── MapView.tsx
    │   │   └── MapDetailPanel.tsx
    │   ├── submit/
    │   │   ├── SubmitForm.tsx
    │   │   └── ImageInput.tsx
    │   ├── owner/
    │   │   ├── QueueList.tsx
    │   │   ├── OwnerPostForm.tsx
    │   │   └── MarkFixedDialog.tsx
    │   └── shared/
    │       ├── LocationPicker.tsx      # copy/adapt from hipop-website
    │       └── LoadingSpinner.tsx
    ├── contexts/
    │   └── AuthContext.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useReports.ts
    │   └── useIsOwner.ts
    ├── lib/
    │   ├── firebase.ts
    │   ├── constants.ts
    │   └── services/
    │       ├── reports.ts              # all Firestore reads/writes for reports
    │       ├── users.ts                # all Firestore reads/writes for users
    │       └── storage.ts              # all Storage uploads
    ├── types/
    │   ├── user.ts
    │   └── report.ts
    └── utils/
        ├── geo.ts                      # distance, bounds helpers
        └── image.ts                    # client-side compression
```

---

## 6. Data Model (Firestore + TypeScript)

> **CRITICAL:** field names are **camelCase**, exactly as written. Do not rename.
> All timestamps are Firestore `Timestamp` (not `Date` or millis).
> `null` is used explicitly for optional fields — do not omit keys.

### 6.1 `users/{uid}` — `UserDoc`

```typescript
// src/types/user.ts
import { Timestamp } from 'firebase/firestore';

export interface UserDoc {
  uid: string;                  // === doc id, denormalized for convenience
  email: string;                // from Firebase Auth
  displayName: string;          // chosen at signup, editable
  photoUrl: string | null;      // Storage URL or null
  isOwner: boolean;             // DEFAULT FALSE. Only flipped manually in Firebase Console.
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Owner provisioning:** After the user signs up, go to Firebase Console → Firestore → `users` collection → find the doc → edit `isOwner` to `true`. The security rules prevent users from setting this themselves.

### 6.2 `reports/{reportId}` — `ReportDoc`

```typescript
// src/types/report.ts
import { Timestamp } from 'firebase/firestore';

export type ReportStatus = 'pending' | 'approved' | 'fixed' | 'rejected';

export type ReportCategory =
  | 'pothole'
  | 'drain_cover'
  | 'water_meter_lid'
  | 'sidewalk'
  | 'sign'
  | 'graffiti'
  | 'other';

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  pothole: 'Pothole',
  drain_cover: 'Drain Cover',
  water_meter_lid: 'Water Meter Lid',
  sidewalk: 'Sidewalk',
  sign: 'Sign',
  graffiti: 'Graffiti',
  other: 'Other',
};

export interface ReportDoc {
  id: string;                        // === doc id, denormalized
  status: ReportStatus;
  category: ReportCategory;

  // Photos
  beforePhotoUrl: string;            // required, public download URL
  beforePhotoStoragePath: string;    // e.g. "reports/abc123/before.jpg" — used for deletion
  afterPhotoUrl: string | null;      // set when status becomes 'fixed'
  afterPhotoStoragePath: string | null;

  // Description
  title: string;                     // required, 1-80 chars
  description: string;               // optional; default empty string '', never null

  // Location (from Places API)
  address: string;                   // formatted_address
  neighborhood: string | null;       // e.g. "Old Fourth Ward" — best-effort from sublocality
  city: string;                      // expected "Atlanta"
  state: string;                     // expected "GA"
  zipCode: string | null;
  latitude: number;                  // required, used for map
  longitude: number;                 // required, used for map
  placeId: string | null;            // Google Place ID for re-lookup

  // People (denormalized from users/{uid} at write time to avoid joins)
  createdBy: string;                 // submitter uid
  createdByDisplayName: string;      // snapshot of displayName at submit time
  createdByPhotoUrl: string | null;
  fixedBy: string | null;            // owner uid who marked fixed
  fixedByDisplayName: string | null;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedAt: Timestamp | null;
  fixedAt: Timestamp | null;
  rejectedAt: Timestamp | null;

  // Moderation
  rejectionReason: string | null;
}
```

### 6.3 Storage paths

```
gs://fix-atl.firebasestorage.app/
├── reports/
│   └── {reportId}/
│       ├── before.jpg              # uploaded by submitter (any auth user)
│       └── after.jpg               # uploaded by owners only
└── users/
    └── {uid}/
        └── avatar.jpg              # uploaded by self only
```

Filenames are fixed (`before.jpg`, `after.jpg`, `avatar.jpg`) so the storage rules can match cleanly. Client-side we compress all uploads to JPEG ≤ 1600px long edge, ≤ 1.5MB.

### 6.4 Status state machine

```
        ┌─ rejected   (terminal; owner rejected)
        │
pending ┼─ approved ─── fixed         (terminal; owner uploaded after photo)
        │
        └─ approved   (visible publicly, awaiting fix)

Owner direct post: → fixed       (skip pending & approved)
Owner direct post: → approved    (post a broken thing seen on the street)
```

A report's `status` only ever moves forward (no un-fixing). If the owner makes a mistake they can `delete` the report and re-create.

---

## 7. Firestore Indexes

Most queries are single-field with a single sort, but two compound indexes are needed:

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdBy", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Deploy with: `firebase deploy --only firestore:indexes`

---

## 8. Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isUser(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    function isOwner() {
      return isSignedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isOwner == true;
    }

    // ----- users -----
    match /users/{uid} {
      // Profiles are public (for /profile/[uid] page)
      allow read: if true;

      // Create: only the user themselves, isOwner MUST be false
      allow create: if isUser(uid)
        && request.resource.data.uid == uid
        && request.resource.data.isOwner == false
        && request.resource.data.keys().hasAll([
             'uid','email','displayName','photoUrl','isOwner','createdAt','updatedAt'
           ]);

      // Update: only self, and isOwner CANNOT be changed by the user
      allow update: if isUser(uid)
        && request.resource.data.isOwner == resource.data.isOwner
        && request.resource.data.uid == resource.data.uid
        && request.resource.data.email == resource.data.email;

      // No client-side deletes
      allow delete: if false;
    }

    // ----- reports -----
    match /reports/{reportId} {
      // Read: publicly readable if approved/fixed; submitter can read own pending/rejected; owners can read everything
      allow read: if resource.data.status in ['approved', 'fixed']
        || (isSignedIn() && request.auth.uid == resource.data.createdBy)
        || isOwner();

      // Create:
      //   - regular user: status MUST be 'pending', afterPhotoUrl MUST be null
      //   - owner: can create with any of pending/approved/fixed
      allow create: if isSignedIn()
        && request.resource.data.id == reportId
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.beforePhotoUrl is string
        && request.resource.data.title is string
        && request.resource.data.title.size() > 0
        && request.resource.data.title.size() <= 80
        && request.resource.data.latitude is number
        && request.resource.data.longitude is number
        && request.resource.data.fixedBy == null
        && request.resource.data.fixedAt == null
        && request.resource.data.rejectedAt == null
        && (
          (request.resource.data.status == 'pending'
            && request.resource.data.afterPhotoUrl == null
            && request.resource.data.approvedAt == null)
          ||
          (isOwner()
            && request.resource.data.status in ['approved','fixed']
            && (request.resource.data.status == 'approved'
                ? request.resource.data.afterPhotoUrl == null
                : request.resource.data.afterPhotoUrl is string))
        );

      // Update + delete: owners only
      allow update: if isOwner()
        && request.resource.data.id == resource.data.id
        && request.resource.data.createdBy == resource.data.createdBy
        && request.resource.data.beforePhotoUrl == resource.data.beforePhotoUrl
        && request.resource.data.beforePhotoStoragePath == resource.data.beforePhotoStoragePath;
      allow delete: if isOwner();
    }
  }
}
```

Deploy with: `firebase deploy --only firestore:rules`

---

## 9. Storage Security Rules

```javascript
// storage.rules
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner() {
      return isSignedIn()
        && firestore.exists(/databases/(default)/documents/users/$(request.auth.uid))
        && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.isOwner == true;
    }

    function isValidImage() {
      return request.resource.size < 5 * 1024 * 1024            // 5 MB hard cap
        && request.resource.contentType.matches('image/.*');
    }

    // Before photos: any signed-in user can create; only owners can overwrite/delete
    match /reports/{reportId}/before.jpg {
      allow read: if true;
      allow create: if isSignedIn() && isValidImage();
      allow update, delete: if isOwner();
    }

    // After photos: owners only
    match /reports/{reportId}/after.jpg {
      allow read: if true;
      allow write: if isOwner() && isValidImage();
    }

    // Avatars: self only
    match /users/{uid}/avatar.jpg {
      allow read: if true;
      allow write: if isSignedIn() && request.auth.uid == uid && isValidImage();
    }

    // Deny everything else
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy with: `firebase deploy --only storage`

---

## 10. firebase.json (Hosting)

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "hosting": {
    "site": "fix-atl",
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "trailingSlash": true,
    "cleanUrls": true,
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "**/*.html",
        "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }]
      }
    ],
    "rewrites": [
      { "source": "/report/*", "destination": "/report/_/index.html" },
      { "source": "/profile/*", "destination": "/profile/_/index.html" }
    ]
  }
}
```

> Dynamic routes `/report/[id]` and `/profile/[uid]` use Next.js static export's underscore placeholder trick. The page components read the param client-side via `useParams()`. This matches `hipop-website`'s pattern (`/popups/*`, `/markets/*`).

`.firebaserc`:

```json
{ "projects": { "default": "fix-atl" } }
```

---

## 11. next.config.ts

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',                  // produces /out dir for Firebase Hosting
  trailingSlash: true,
  images: {
    unoptimized: true,               // required for static export
  },
  // Required for static export of dynamic routes with the underscore-rewrite pattern
  generateBuildId: async () => 'fixatl-build',
};

export default nextConfig;
```

**Note:** Dynamic route pages (`/report/[id]/page.tsx`, `/profile/[uid]/page.tsx`) must export:

```tsx
export const dynamic = 'force-static';
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ id: '_' }];   // single placeholder, hydrated client-side
}
```

(For `[uid]`: `return [{ uid: '_' }];`)

---

## 12. Core Library Files

### 12.1 `src/lib/firebase.ts`

Mirrors `hipop-website`:

```ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { initializeAnalytics, getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

function initAnalytics() {
  if (typeof window === 'undefined') return null;
  try { return initializeAnalytics(app, { config: { send_page_view: false } }); }
  catch { return getAnalytics(app); }
}
export const analytics = initAnalytics();
export default app;
```

### 12.2 `src/lib/constants.ts`

```ts
export const ATLANTA_CENTER = { lat: 33.749, lng: -84.388 };
export const DEFAULT_MAP_ZOOM = 12;
export const PLACES_PROXY_URL =
  'https://hipop-places-server-977869241732.us-central1.run.app/api/places';
export const MAX_IMAGE_BYTES = 1_500_000;
export const MAX_IMAGE_DIMENSION = 1600;
export const BRAND = {
  name: 'Fix-ATL',
  tagline: 'We track, report, and fix what\'s broken in Atlanta.',
  primary: '#1F1F1F',        // near-black, matches IG logo
  accent: '#FF6B1A',         // orange from their painted lids
  accentDark: '#D4540F',
  fixed: '#22C55E',          // green for "fixed" status pins
  broken: '#EF4444',         // red for "broken/approved" status pins
  pending: '#F59E0B',        // amber for "pending"
};
```

### 12.3 `src/utils/image.ts` — Client-side compression

```ts
import { MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION } from '@/lib/constants';

export async function compressImage(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const { width, height } = scaleDown(img.width, img.height, MAX_IMAGE_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  // Try decreasing quality until under MAX_IMAGE_BYTES
  for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
    const blob = await new Promise<Blob | null>(res =>
      canvas.toBlob(res, 'image/jpeg', q)
    );
    if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
    if (q === 0.45 && blob) return blob;
  }
  throw new Error('Failed to compress image');
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function scaleDown(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w > h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
```

### 12.4 `src/lib/services/storage.ts`

```ts
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function uploadReportPhoto(
  reportId: string,
  which: 'before' | 'after',
  blob: Blob
): Promise<{ url: string; path: string }> {
  const path = `reports/${reportId}/${which}.jpg`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: 'image/jpeg' });
  const url = await getDownloadURL(r);
  return { url, path };
}

export async function uploadAvatar(uid: string, blob: Blob): Promise<string> {
  const r = ref(storage, `users/${uid}/avatar.jpg`);
  await uploadBytes(r, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(r);
}

export async function deleteStoragePath(path: string): Promise<void> {
  try { await deleteObject(ref(storage, path)); }
  catch (e) { console.warn('Storage delete failed:', path, e); }
}
```

### 12.5 `src/lib/services/users.ts`

```ts
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserDoc } from '@/types/user';

export async function createUserDoc(
  uid: string,
  email: string,
  displayName: string
): Promise<void> {
  const now = serverTimestamp();
  const data: Omit<UserDoc, 'createdAt' | 'updatedAt'> & { createdAt: any; updatedAt: any } = {
    uid,
    email,
    displayName,
    photoUrl: null,
    isOwner: false,        // MUST be false on create — rules enforce
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'users', uid), data);
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export function subscribeUserDoc(uid: string, cb: (u: UserDoc | null) => void) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    cb(snap.exists() ? (snap.data() as UserDoc) : null);
  });
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<Pick<UserDoc, 'displayName' | 'photoUrl'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() });
}
```

### 12.6 `src/lib/services/reports.ts`

```ts
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ReportDoc, ReportStatus, ReportCategory } from '@/types/report';
import { compressImage } from '@/utils/image';
import { uploadReportPhoto, deleteStoragePath } from './storage';

export interface SubmitReportInput {
  beforeFile: File;
  title: string;
  description: string;
  category: ReportCategory;
  location: {
    address: string;
    neighborhood: string | null;
    city: string;
    state: string;
    zipCode: string | null;
    latitude: number;
    longitude: number;
    placeId: string | null;
  };
  user: { uid: string; displayName: string; photoUrl: string | null };
}

/** Regular user submits a broken-thing report (pending) */
export async function submitReport(input: SubmitReportInput): Promise<string> {
  const newRef = doc(collection(db, 'reports'));
  const reportId = newRef.id;

  const blob = await compressImage(input.beforeFile);
  const { url, path } = await uploadReportPhoto(reportId, 'before', blob);

  const data: Omit<ReportDoc, 'createdAt' | 'updatedAt'> & { createdAt: any; updatedAt: any } = {
    id: reportId,
    status: 'pending',
    category: input.category,
    beforePhotoUrl: url,
    beforePhotoStoragePath: path,
    afterPhotoUrl: null,
    afterPhotoStoragePath: null,
    title: input.title.trim().slice(0, 80),
    description: input.description.trim().slice(0, 500),
    address: input.location.address,
    neighborhood: input.location.neighborhood,
    city: input.location.city,
    state: input.location.state,
    zipCode: input.location.zipCode,
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    placeId: input.location.placeId,
    createdBy: input.user.uid,
    createdByDisplayName: input.user.displayName,
    createdByPhotoUrl: input.user.photoUrl,
    fixedBy: null,
    fixedByDisplayName: null,
    approvedAt: null,
    fixedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newRef, data);
  return reportId;
}

/** Owner posts a before+after (or before only as approved) directly */
export async function ownerCreateReport(input: SubmitReportInput & {
  afterFile: File | null;
}): Promise<string> {
  const newRef = doc(collection(db, 'reports'));
  const reportId = newRef.id;

  const beforeBlob = await compressImage(input.beforeFile);
  const before = await uploadReportPhoto(reportId, 'before', beforeBlob);

  let after: { url: string; path: string } | null = null;
  if (input.afterFile) {
    const afterBlob = await compressImage(input.afterFile);
    after = await uploadReportPhoto(reportId, 'after', afterBlob);
  }

  const isFixed = !!input.afterFile;
  await setDoc(newRef, {
    id: reportId,
    status: isFixed ? 'fixed' : 'approved',
    category: input.category,
    beforePhotoUrl: before.url,
    beforePhotoStoragePath: before.path,
    afterPhotoUrl: after?.url ?? null,
    afterPhotoStoragePath: after?.path ?? null,
    title: input.title.trim().slice(0, 80),
    description: input.description.trim().slice(0, 500),
    address: input.location.address,
    neighborhood: input.location.neighborhood,
    city: input.location.city,
    state: input.location.state,
    zipCode: input.location.zipCode,
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    placeId: input.location.placeId,
    createdBy: input.user.uid,
    createdByDisplayName: input.user.displayName,
    createdByPhotoUrl: input.user.photoUrl,
    fixedBy: isFixed ? input.user.uid : null,
    fixedByDisplayName: isFixed ? input.user.displayName : null,
    approvedAt: serverTimestamp(),
    fixedAt: isFixed ? serverTimestamp() : null,
    rejectedAt: null,
    rejectionReason: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reportId;
}

/** Owner approves a pending report */
export async function approveReport(reportId: string): Promise<void> {
  await updateDoc(doc(db, 'reports', reportId), {
    status: 'approved',
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Owner rejects a pending report */
export async function rejectReport(reportId: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'reports', reportId), {
    status: 'rejected',
    rejectedAt: serverTimestamp(),
    rejectionReason: reason || null,
    updatedAt: serverTimestamp(),
  });
}

/** Owner marks an approved report as fixed by uploading the after photo */
export async function markReportFixed(
  reportId: string,
  afterFile: File,
  owner: { uid: string; displayName: string }
): Promise<void> {
  const blob = await compressImage(afterFile);
  const { url, path } = await uploadReportPhoto(reportId, 'after', blob);
  await updateDoc(doc(db, 'reports', reportId), {
    status: 'fixed',
    afterPhotoUrl: url,
    afterPhotoStoragePath: path,
    fixedBy: owner.uid,
    fixedByDisplayName: owner.displayName,
    fixedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Owner deletes a report (and its storage) */
export async function deleteReport(report: ReportDoc): Promise<void> {
  await deleteStoragePath(report.beforePhotoStoragePath);
  if (report.afterPhotoStoragePath) await deleteStoragePath(report.afterPhotoStoragePath);
  await deleteDoc(doc(db, 'reports', report.id));
}

// ----- Reads -----

export async function getReport(reportId: string): Promise<ReportDoc | null> {
  const snap = await getDoc(doc(db, 'reports', reportId));
  return snap.exists() ? (snap.data() as ReportDoc) : null;
}

export interface FeedFilter {
  statuses: ReportStatus[];     // e.g. ['approved'] or ['approved','fixed']
  category?: ReportCategory;
  pageSize?: number;
}

export function subscribeFeed(filter: FeedFilter, cb: (rs: ReportDoc[]) => void) {
  const constraints: any[] = [where('status', 'in', filter.statuses)];
  if (filter.category) constraints.push(where('category', '==', filter.category));
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(filter.pageSize ?? 100));
  const q = query(collection(db, 'reports'), ...constraints);
  return onSnapshot(q, snap => cb(snap.docs.map(d => d.data() as ReportDoc)));
}

export async function getReportsForUser(uid: string): Promise<ReportDoc[]> {
  const q = query(
    collection(db, 'reports'),
    where('createdBy', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as ReportDoc);
}

export function subscribePendingQueue(cb: (rs: ReportDoc[]) => void) {
  const q = query(
    collection(db, 'reports'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => d.data() as ReportDoc)));
}
```

### 12.7 `src/contexts/AuthContext.tsx`

```tsx
'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserDoc } from '@/types/user';
import { subscribeUserDoc } from '@/lib/services/users';

interface AuthState {
  fbUser: User | null;
  user: UserDoc | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ fbUser: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      if (!u) { setUser(null); setLoading(false); return; }
    });
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    const unsub = subscribeUserDoc(fbUser.uid, (u) => { setUser(u); setLoading(false); });
    return unsub;
  }, [fbUser]);

  return <AuthContext.Provider value={{ fbUser, user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
```

### 12.8 `src/components/auth/AuthGuard.tsx` and `OwnerGuard.tsx`

```tsx
// AuthGuard.tsx
'use client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { fbUser, loading } = useAuthContext();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !fbUser) router.replace('/auth/login');
  }, [fbUser, loading, router]);
  if (loading || !fbUser) return <div className="p-8 text-center">Loading…</div>;
  return <>{children}</>;
}
```

```tsx
// OwnerGuard.tsx
'use client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

export default function OwnerGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user?.isOwner) router.replace('/');
  }, [user, loading, router]);
  if (loading || !user?.isOwner) return <div className="p-8 text-center">Checking access…</div>;
  return <>{children}</>;
}
```

---

## 13. Pages — Spec by Route

### `/` (Landing) — `src/app/page.tsx`
- Hero: big logo, headline "We track, report, and fix what's broken in Atlanta", CTAs ("Report Something Broken" → `/submit`, "Browse the Feed" → `/feed`).
- Stats row (live): `# reports submitted`, `# fixed`, `# active in queue`. Fetched once via `getDocs` with count aggregation (or just `getDocs` and `.size`).
- "Recently Fixed" strip: 6 most recent `status==fixed` reports, before/after thumbs, links to detail.
- "What we look for" — small grid of category icons.

### `/feed` — `src/app/feed/page.tsx`
- `FeedFilters` at top: 3 chip buttons — `All`, `Needs Fixing` (status=approved), `Fixed` (status=fixed). Default = `All` (statuses=['approved','fixed']).
- Category dropdown next to status chips.
- Calls `subscribeFeed(filter, setReports)`.
- Renders `ReportGrid` (responsive: 1 col mobile, 2 tablet, 3 desktop).
- Each card → links to `/report/{id}`.

### `/map` — `src/app/map/page.tsx`
- Same filter UI overlaid as a floating control card top-left.
- Full-height `MapView` with markers colored by status.
- Click marker → `MapDetailPanel` slides in from right with photo, title, address, "View details" → `/report/{id}`.

### `/submit` — `src/app/submit/page.tsx` (AuthGuard)
- `SubmitForm`:
  - `ImageInput` (mobile camera capture supported via `<input type="file" accept="image/*" capture="environment" />`).
  - Title (required, 80 chars).
  - Description (optional, 500 chars).
  - Category select.
  - `LocationPicker` (places autocomplete; defaults user to Atlanta).
  - Submit button → calls `submitReport()` → on success, redirect to `/account` with a "Thanks! Your report is awaiting approval" banner.

### `/report/[id]` — `src/app/report/[id]/page.tsx` (client component)
- Fetches via `getReport(id)`. 404 state if not found.
- `BeforeAfterView` — toggle/slider between before & after photos (if fixed). For non-fixed, just the before photo.
- Title, status badge, category badge, address (with mini-map), submitter info (link to `/profile/{uid}`).
- If status=fixed: "Fixed by {fixedByDisplayName} on {fixedAt}".
- If viewer isOwner:
  - Status=pending: Approve / Reject buttons.
  - Status=approved: "Mark as Fixed" button → opens `MarkFixedDialog` with after-photo upload.
  - Always: Delete button (confirms).

### `/account` — `src/app/account/page.tsx` (AuthGuard)
- Profile section: avatar (clickable to change), displayName (editable inline), email (read-only), "Sign out" button.
- "Your Reports" section: list of `getReportsForUser(uid)` grouped by status.
- If isOwner: blue card with links to `/account/queue` and `/account/post`.

### `/account/queue` — `src/app/account/queue/page.tsx` (OwnerGuard)
- `subscribePendingQueue` → live list of pending reports.
- Each row: thumbnail, title, address, submitter, "Approve" + "Reject (with reason)" actions.

### `/account/post` — `src/app/account/post/page.tsx` (OwnerGuard)
- Same as `/submit` but with an **additional** "After photo (optional)" upload.
- If after photo provided → status=fixed; otherwise → status=approved.
- Calls `ownerCreateReport()`.

### `/profile/[uid]` — public
- Header: avatar, displayName, "Owner" badge if applicable, member-since date.
- Their submitted reports (approved/fixed only, unless viewing self).
- If profile uid is an owner: also a "Fixed by them" tab (query `fixedBy == uid`).

### `/auth/login` and `/auth/signup`
- Email + password forms. On signup: create Firebase user → call `createUserDoc(uid, email, displayName)` → redirect to `/account`.

---

## 14. Map Implementation Notes

```tsx
// src/components/map/MapView.tsx (skeleton)
'use client';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { ATLANTA_CENTER, DEFAULT_MAP_ZOOM, BRAND } from '@/lib/constants';
import { ReportDoc } from '@/types/report';

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

export default function MapView({ reports, onSelect }: {
  reports: ReportDoc[];
  onSelect: (r: ReportDoc) => void;
}) {
  return (
    <LoadScript googleMapsApiKey={KEY}>
      <GoogleMap
        mapContainerClassName="w-full h-[calc(100vh-12rem)]"
        center={ATLANTA_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {reports.map(r => (
          <Marker
            key={r.id}
            position={{ lat: r.latitude, lng: r.longitude }}
            onClick={() => onSelect(r)}
            icon={typeof google !== 'undefined' ? {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: r.status === 'fixed' ? BRAND.fixed : BRAND.broken,
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
              scale: 10,
            } : undefined}
            title={r.title}
          />
        ))}
      </GoogleMap>
    </LoadScript>
  );
}
```

`LocationPicker` for `/submit` and `/account/post` should be copied with light edits from:
`/Users/jordangillispie/development/hipop/hipop/hipop-website/src/components/shared/LocationPicker.tsx` (uses the same hipop Cloud Run proxy).

---

## 15. Brand & UI

- **Logo:** Download the hexagon flower from the IG profile photo, save as `/public/logo.svg` (vector trace) or `/public/logo.png`. If the user can't supply it, ship a temporary text logo "FIX-ATL" in a hexagon stroke.
- **Colors:** as in `BRAND` constant. Background: white. Primary text: `#1F1F1F`. Accent: `#FF6B1A` (orange from the painted lids).
- **Type:** Default Tailwind sans-serif stack. For headings: `font-bold tracking-tight`. Optional: add Inter via `next/font/google` in `layout.tsx`.
- **Status colors:**
  - `pending` → amber dot
  - `approved` (broken) → red dot
  - `fixed` → green dot
  - `rejected` → gray, only visible to owner & submitter

---

## 16. Deployment

```bash
# 1. Deploy rules + indexes once (and after every change)
firebase deploy --only firestore:rules,firestore:indexes,storage

# 2. Build static site
npm run build       # produces /out

# 3. Deploy hosting
firebase deploy --only hosting

# Or all in one:
firebase deploy
```

**First deploy:** confirm the hosting site name in `firebase.json` matches a real Hosting site in your project (default site is `fix-atl` for the project `fix-atl`). If it doesn't exist, run `firebase hosting:sites:create fix-atl` or change `"site"` in `firebase.json`.

---

## 17. Bootstrapping Yourself as the First Owner

1. Run the app locally (`npm run dev`).
2. Go to `/auth/signup`, create an account with the Fix-ATL team email.
3. Open Firebase Console → Firestore → `users` collection → find your doc.
4. Edit `isOwner` from `false` → `true`. Save.
5. Refresh the site — you now see the owner UI (queue, direct post, approve/reject/fix buttons).

---

## 18. Verification Checklist (do this before shipping)

- [ ] Unauthenticated visitor can browse `/feed`, `/map`, `/report/{id}` for approved/fixed reports, but is redirected from `/submit`.
- [ ] Unauthenticated visitor canNOT see pending or rejected reports anywhere.
- [ ] Signed-in non-owner: can submit a report → it shows in `/account` with "Pending" badge, does NOT appear on public feed/map until approved.
- [ ] Signed-in non-owner: cannot reach `/account/queue` or `/account/post` (redirected).
- [ ] Signed-in non-owner: cannot edit `isOwner` field in Firestore (rules reject).
- [ ] Owner: sees pending report in `/account/queue`. Approve → it appears on `/feed` and `/map` as red marker.
- [ ] Owner: clicks Mark as Fixed on a report → uploads after photo → status becomes 'fixed', marker turns green, before/after slider works on detail page.
- [ ] Owner: can `/account/post` with both before+after → goes straight to fixed.
- [ ] Image upload >5MB is rejected by storage rule.
- [ ] Map shows only the visible filter's reports.
- [ ] Mobile camera capture works on iOS Safari + Android Chrome.
- [ ] All dynamic routes work after `firebase deploy` (hard refresh on `/report/abc123`).

---

## 19. Open Items / Decisions Already Made

| Item | Decision |
|---|---|
| Owner identification | `isOwner: bool` on `users/{uid}`, flipped manually in console. |
| Moderation | Pending → owner approves/rejects. |
| Scope | Web only, Next.js static export. |
| Places API | Reuse hipop Cloud Run proxy. |
| Image compression | Client-side canvas, 1600px max edge, 1.5MB target, JPEG quality 0.85→0.45 step-down. |
| Image storage | `reports/{id}/before.jpg` and `after.jpg`, `users/{uid}/avatar.jpg`. |
| Categories | Fixed enum of 7: pothole, drain_cover, water_meter_lid, sidewalk, sign, graffiti, other. |
| Data denormalization | `createdByDisplayName`, `createdByPhotoUrl`, `fixedByDisplayName` snapshotted into report doc so feed cards don't need user-doc joins. |
| Atlanta-only check | Soft (default map + autocomplete biased to Atlanta), no hard validation. Owner can reject out-of-area reports. |
| Counts on profile | Computed by querying reports collection, not denormalized on user doc. |
| Dynamic routes under static export | Client-rendered with the underscore-rewrite trick from `firebase.json`. |

---

## 20. Out of Scope (v2+ Roadmap — do NOT build now)

- Likes / comments / upvotes
- Email or push notifications (e.g. "your report was fixed!")
- Hashtags / tags / search
- Volunteer scheduling, "I want to help fix this"
- Donations / Stripe
- 311 integration (auto-file a 311 report from a submission)
- Cloud Functions for thumbnail generation
- Instagram cross-post (auto-share fixed reports to IG)
- Mobile native apps (data model is already shaped to support this when needed)
- Multi-city expansion
- Heatmap overlay on the map
- Owner analytics dashboard
- Public API

---

## 21. What I Need From You Before Build

Nothing blocking — every decision above is locked in. Two soft asks:

1. **Logo file.** The hexagon flower from the IG profile, ideally as SVG or transparent PNG ≥ 512px. If not available I'll trace a temporary version.
2. **Google Maps API key for the `fix-atl` GCP project** (see §3). Without this the map won't render.

Everything else can be one-shot from this document.
