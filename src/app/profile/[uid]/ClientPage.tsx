'use client';

/**
 * /profile/[uid] — public profile page.
 *
 * One ClientPage handles BOTH member and owner variants. We derive whether
 * the profile *belongs to* an owner by checking the profile's email against
 * ADMIN_EMAILS — NOT the user doc's isOwner field. The field is a stale
 * cache; the email list is the single source of truth (also enforced in
 * firestore.rules + storage.rules).
 *
 * `useAuthContext()` is intentionally NOT used here. The viewer's identity
 * doesn't affect what they see — the profile owner's role does.
 */

import Link from 'next/link';
import Image from 'next/image';
import DynamicLink from '@/components/DynamicLink';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { getUserDoc } from '@/lib/services/users';
import {
  getReportsForUser,
  getReportsFixedBy,
} from '@/lib/services/reports';
import { isAdminEmail } from '@/lib/constants';
import type { UserDoc } from '@/types/user';
import type { ReportDoc } from '@/types/report';
import { REPORT_CATEGORY_LABELS } from '@/types/report';

type OwnerTab = 'fixed' | 'reports';

export default function ClientPage() {
  const params = useParams<{ uid: string }>();
  const uid = params?.uid;

  const [profileUser, setProfileUser] = useState<UserDoc | null>(null);
  const [reportsByUser, setReportsByUser] = useState<ReportDoc[]>([]);
  const [reportsFixedByUser, setReportsFixedByUser] = useState<ReportDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<OwnerTab>('fixed');

  const validUid = !!uid && uid !== '_';

  useEffect(() => {
    if (!validUid) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const u = await getUserDoc(uid);
      if (cancelled) return;
      setProfileUser(u);

      if (!u) {
        setLoading(false);
        return;
      }

      // Always pull what they submitted (public will see only approved/fixed).
      const submitted = await getReportsForUser(uid);
      if (cancelled) return;
      setReportsByUser(submitted);

      // Owners get an additional list: reports they marked as fixed.
      // (isOwner derived from email — see file header comment.)
      if (isAdminEmail(u.email)) {
        const fixed = await getReportsFixedBy(uid);
        if (cancelled) return;
        setReportsFixedByUser(fixed);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, validUid]);

  // Public can only see approved + fixed submitted reports — pending/rejected
  // belong to the submitter's own /account, not the public profile.
  const publicSubmitted = useMemo(
    () =>
      reportsByUser.filter(
        (r) => r.status === 'approved' || r.status === 'fixed',
      ),
    [reportsByUser],
  );

  const fixedCount = useMemo(
    () => publicSubmitted.filter((r) => r.status === 'fixed').length,
    [publicSubmitted],
  );

  if (loading || !uid || uid === '_') {
    return (
      <>
        <Navigation />
        <main className="flex-1 container py-24 text-center">
          <div className="text-sm ink-3">Loading profile…</div>
        </main>
        <Footer />
      </>
    );
  }

  if (!profileUser) {
    return (
      <>
        <Navigation />
        <main className="flex-1 container py-24 text-center">
          <div className="section-label mb-5 justify-center">404 · Not found</div>
          <h1 className="font-display-hero text-5xl sm:text-6xl mb-6 leading-[0.95]">
            We can&apos;t find that<br />profile.
          </h1>
          <p className="ink-2 max-w-md mx-auto mb-8">
            The link might be wrong, or the account was removed.
          </p>
          <Link href="/feed" className="btn btn-primary btn-lg">
            Go to the feed
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return isAdminEmail(profileUser.email) ? (
    <OwnerProfile
      profileUser={profileUser}
      reportsFixed={reportsFixedByUser}
      reportsSubmitted={publicSubmitted}
      tab={tab}
      setTab={setTab}
    />
  ) : (
    <MemberProfile
      profileUser={profileUser}
      reports={publicSubmitted}
      reportsCount={publicSubmitted.length}
      fixedCount={fixedCount}
    />
  );
}

// ============================================================================
// Member variant — mockups/profile.html
// ============================================================================

interface MemberProfileProps {
  profileUser: UserDoc;
  reports: ReportDoc[];
  reportsCount: number;
  fixedCount: number;
}

function MemberProfile({
  profileUser,
  reports,
  reportsCount,
  fixedCount,
}: MemberProfileProps) {
  const handle = handleFromUser(profileUser);

  return (
    <>
      <Navigation />

      {/* Editorial profile header */}
      <section className="container py-16 sm:py-20">
        <div className="grid lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="avatar w-32 h-32 sm:w-40 sm:h-40 shadow-md"
                style={{ background: 'linear-gradient(135deg, #C084FC, #818CF8)' }}
              />
              <div className="ml-4">
                <div className="section-label mb-3">Member</div>
                <h1 className="font-display-hero text-5xl sm:text-7xl leading-[0.95]">
                  {profileUser.displayName}
                </h1>
              </div>
            </div>
            <div className="text-base ink-2 max-w-xl ml-0 sm:ml-44">
              <p className="leading-relaxed">
                Atlantan, on the lookout. Reports below are public — only approved &amp; fixed entries are shown here.
              </p>
              <div className="text-sm ink-3 mt-3 font-mono">
                {handle} · Member since {formatMonthYear(profileUser.createdAt)} · Atlanta, GA
              </div>
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="grid grid-cols-2 gap-8 lg:text-right">
              <div>
                <div className="font-display-hero text-5xl leading-none">{reportsCount}</div>
                <div className="eyebrow mt-2">Reports</div>
              </div>
              <div>
                <div className="font-display-hero text-5xl leading-none" style={{ color: '#166534' }}>
                  {fixedCount}
                </div>
                <div className="eyebrow mt-2">Fixed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs (single, no switcher — public profile is one list) */}
      <section className="border-y border-[#EAE6DA] sticky top-[72px] z-30 bg-[#FAFAF7]/80 backdrop-blur-sm">
        <div className="container flex items-center gap-8">
          <button className={tabClass(true)}>
            Public reports{' '}
            <span className="text-xs ink-3 font-mono ml-1">({reportsCount})</span>
          </button>
        </div>
      </section>

      <main className="container py-12">
        {reports.length === 0 ? (
          <EmptyGrid message={`${profileUser.displayName} hasn't published anything yet.`} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

// ============================================================================
// Owner variant — mockups/profile-owner.html
// ============================================================================

interface OwnerProfileProps {
  profileUser: UserDoc;
  reportsFixed: ReportDoc[];
  reportsSubmitted: ReportDoc[];
  tab: OwnerTab;
  setTab: (t: OwnerTab) => void;
}

function OwnerProfile({
  profileUser,
  reportsFixed,
  reportsSubmitted,
  tab,
  setTab,
}: OwnerProfileProps) {
  const fixedCount = reportsFixed.length;
  const reportsCount = reportsSubmitted.length;
  const hoodCount = useMemo(() => {
    const set = new Set<string>();
    for (const r of reportsFixed) {
      if (r.neighborhood) set.add(r.neighborhood);
    }
    return set.size;
  }, [reportsFixed]);

  const activeList = tab === 'fixed' ? reportsFixed : reportsSubmitted;

  return (
    <>
      <Navigation />

      {/* Editorial profile header (owner) */}
      <section className="container py-16 sm:py-20">
        <div className="grid lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="avatar w-32 h-32 sm:w-40 sm:h-40 shadow-md bg-[#0A0A0A] flex items-center justify-center">
                <Image src="/logo.svg" alt="" width={112} height={112} className="w-24 h-24 sm:w-28 sm:h-28" />
              </div>
              <div className="ml-4">
                <div className="section-label mb-3" style={{ color: '#E94E1B' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E94E1B]" />
                  Owner
                </div>
                <h1 className="font-display-hero text-5xl sm:text-7xl leading-[0.95]">
                  {profileUser.displayName}
                </h1>
              </div>
            </div>
            <div className="text-base ink-2 max-w-xl ml-0 sm:ml-44">
              <p className="leading-relaxed">
                The crew. We fix what&apos;s broken and paint it with the flower. 🌼
                <br />
                Powered by reports from the Fix-ATL community.
              </p>
              <div className="text-sm ink-3 mt-3 font-mono">
                {profileUser.email} · Atlanta, GA · Est. 2026
              </div>
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="grid grid-cols-3 gap-6 lg:text-right">
              <div>
                <div className="font-display-hero text-5xl leading-none">{reportsCount}</div>
                <div className="eyebrow mt-2">Reports</div>
              </div>
              <div>
                <div className="font-display-hero text-5xl leading-none" style={{ color: '#166534' }}>
                  {fixedCount}
                </div>
                <div className="eyebrow mt-2">Fixes</div>
              </div>
              <div>
                <div className="font-display-hero text-5xl leading-none">{hoodCount}</div>
                <div className="eyebrow mt-2">Hoods</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="border-y border-[#EAE6DA] sticky top-[72px] z-30 bg-[#FAFAF7]/80 backdrop-blur-sm">
        <div className="container flex items-center gap-8">
          <button onClick={() => setTab('fixed')} className={tabClass(tab === 'fixed')}>
            <span className="inline-flex items-center gap-1.5">🌼 Fixed by them</span>
            <span className="text-xs ink-3 font-mono ml-1">({fixedCount})</span>
          </button>
          <button onClick={() => setTab('reports')} className={tabClass(tab === 'reports')}>
            Reports submitted{' '}
            <span className="text-xs ink-3 font-mono ml-1">({reportsCount})</span>
          </button>
        </div>
      </section>

      <main className="container py-12">
        {/* Eyebrow context */}
        <div className="mb-6 flex items-center gap-2 text-sm ink-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          {tab === 'fixed'
            ? `Showing ${fixedCount} report${fixedCount === 1 ? '' : 's'} where ${profileUser.displayName} uploaded the after photo.`
            : `Showing ${reportsCount} public report${reportsCount === 1 ? '' : 's'} posted by ${profileUser.displayName}.`}
        </div>

        {activeList.length === 0 ? (
          <EmptyGrid
            message={
              tab === 'fixed'
                ? `No fixes yet from ${profileUser.displayName}.`
                : `No public reports yet from ${profileUser.displayName}.`
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeList.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                showReporter={tab === 'fixed'}
                ownerName={profileUser.displayName}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

// ============================================================================
// Shared bits
// ============================================================================

function tabClass(active: boolean): string {
  const base =
    'py-4 font-medium text-[0.9375rem] border-b-2 transition-colors duration-150';
  return active
    ? `${base} text-black border-black font-semibold`
    : `${base} ink-3 border-transparent hover:text-black`;
}

interface ReportCardProps {
  report: ReportDoc;
  /** Owner "Fixed by them" tab — show "Reported by @username" line. */
  showReporter?: boolean;
  /** Owner display name, used to detect direct-posts (fixedBy === createdBy). */
  ownerName?: string;
}

function ReportCard({ report, showReporter = false, ownerName }: ReportCardProps) {
  const categoryLabel = REPORT_CATEGORY_LABELS[report.category];
  const locationLabel = report.neighborhood ?? report.city ?? 'Atlanta';
  const ago = timeAgo(
    report.status === 'fixed' && report.fixedAt ? report.fixedAt : report.createdAt,
  );
  const isFixed = report.status === 'fixed';
  const directPost =
    showReporter &&
    !!ownerName &&
    report.createdBy === report.fixedBy;

  return (
    <DynamicLink href={`/report/${report.id}/`} className="card card-hover">
      {isFixed && report.afterPhotoUrl ? (
        <div className="grid grid-cols-2 gap-px bg-[#EAE6DA]">
          <div className="ba-frame aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.beforePhotoUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="after-frame aspect-square">
            <div
              className="photo"
              style={{ backgroundImage: `url('${report.beforePhotoUrl}')` }}
            />
            <div className="wash" />
            <div className="vignette" />
            <div className="stamp">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative aspect-[5/4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={report.beforePhotoUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          {report.status === 'pending' && (
            <span className="absolute top-3 right-3 status-bg status-pending">
              Pending
            </span>
          )}
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          {isFixed && <span className="status status-fixed">Fixed</span>}
          <span className="tag">{categoryLabel}</span>
        </div>
        <h3 className="font-display text-xl leading-tight">{report.title}</h3>
        <p className="text-sm ink-3 mt-1.5">
          {locationLabel} · {ago}
        </p>
        {showReporter && (
          <div className="text-xs ink-3 mt-2 pt-2 hairline">
            {directPost ? (
              <>Direct post by {ownerName}</>
            ) : (
              <>
                Reported by{' '}
                <DynamicLink
                  href={`/profile/${report.createdBy}/`}
                  className="text-black font-semibold hover:underline"
                >
                  @{handleFromName(report.createdByDisplayName)}
                </DynamicLink>
              </>
            )}
          </div>
        )}
      </div>
    </DynamicLink>
  );
}

function EmptyGrid({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#D6D2C4] bg-white p-12 text-center max-w-lg mx-auto">
      <div className="text-4xl mb-4">📭</div>
      <h3 className="font-display text-2xl mb-2">Nothing here yet.</h3>
      <p className="ink-2 leading-relaxed">{message}</p>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function handleFromUser(u: UserDoc): string {
  if (u.email) {
    const local = u.email.split('@')[0];
    if (local) return `@${local}`;
  }
  return `@${handleFromName(u.displayName)}`;
}

function handleFromName(name: string): string {
  return (name || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function formatMonthYear(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '—';
  const d = ts.toDate();
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function timeAgo(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return 'recently';
  const then = ts.toDate().getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} week${wk === 1 ? '' : 's'} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const yr = Math.floor(day / 365);
  return `${yr} year${yr === 1 ? '' : 's'} ago`;
}
