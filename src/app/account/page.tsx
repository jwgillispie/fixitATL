'use client';

/**
 * Account page — translated from mockups/account.html.
 *
 * Shows the signed-in member their:
 *   - Profile sidebar (avatar, name, email, member-since, stats, sign out)
 *   - Reports grouped by status: pending → approved → fixed → rejected
 *   - Success banner when redirected from /submit with ?submitted=1
 *
 * Owner extra: dark "You're on the team" card linking to /account/queue.
 *
 * Reports are fetched once on mount via getReportsForUser. We don't subscribe
 * because moderation moves a report between groups infrequently — pull-to-refresh
 * via reload is fine for now.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import DynamicLink from '@/components/DynamicLink';
import { signOut } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';
import AuthGuard from '@/components/auth/AuthGuard';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { auth } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { getReportsForUser } from '@/lib/services/reports';
import type { ReportDoc, ReportStatus } from '@/types/report';

export default function AccountPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center text-sm ink-3">
            Loading your account…
          </div>
        }
      >
        <AccountInner />
      </Suspense>
    </AuthGuard>
  );
}

function AccountInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, fbUser } = useAuthContext();
  const showSuccess = searchParams.get('submitted') === '1';

  const [reports, setReports] = useState<ReportDoc[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    if (!fbUser) return;
    let cancelled = false;
    getReportsForUser(fbUser.uid)
      .then((r) => {
        if (cancelled) return;
        setReports(r);
        setReportsLoading(false);
      })
      .catch((err) => {
        console.error('getReportsForUser failed', err);
        if (!cancelled) setReportsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fbUser]);

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/auth/login');
  }

  const grouped = useMemo(() => groupByStatus(reports), [reports]);

  // The doc takes a beat longer than the Firebase Auth user.
  if (!user || !fbUser) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm ink-3">
        Loading your profile…
      </div>
    );
  }

  const visibleCount = grouped.pending.length + grouped.approved.length + grouped.fixed.length;
  const fixedCount = grouped.fixed.length;
  const headerCopy = makeHeaderCopy(visibleCount, fixedCount);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation active="account" />

      <main className="container py-12 sm:py-16 flex-1">
        {/* Success banner */}
        {showSuccess && (
          <div className="banner banner-success mb-8">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div>
              <div className="font-semibold mb-0.5">Thanks for the report — it&apos;s in the queue.</div>
              <p className="text-sm">The Fix-ATL team will review within 24 hours. You&apos;ll see it on the public feed once approved.</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-12">
          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-10">
            {/* Profile */}
            <div>
              <div className="relative inline-block mb-6">
                <div
                  className="avatar w-28 h-28 shadow-md"
                  style={{ background: 'linear-gradient(135deg, #FDBA74, #F472B6)' }}
                />
              </div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="font-display text-3xl">{user.displayName}</h1>
                {user.isOwner && (
                  <span className="px-2 py-0.5 rounded-full bg-[#0A0A0A] text-white text-[10px] font-bold uppercase tracking-wider">
                    Owner
                  </span>
                )}
              </div>
              <div className="text-sm ink-3 mt-1 break-all">{user.email}</div>
              <div className="text-xs ink-4 mt-2 font-mono">
                Member since {user.createdAt ? formatMemberSince(user.createdAt) : 'just now'}
              </div>
            </div>

            {/* Stats */}
            <div className="pt-8 hairline">
              <div className="eyebrow mb-4">Your impact</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-display-hero text-5xl leading-none">{visibleCount}</div>
                  <div className="text-xs ink-3 mt-2 uppercase tracking-wider font-semibold">Reports</div>
                </div>
                <div>
                  <div className="font-display-hero text-5xl leading-none" style={{ color: '#166534' }}>
                    {fixedCount}
                  </div>
                  <div className="text-xs ink-3 mt-2 uppercase tracking-wider font-semibold">Fixed</div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="pt-8 hairline">
              <div className="eyebrow mb-4">Settings</div>
              <div className="space-y-1">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2.5 -mx-3 rounded-lg hover:bg-[#FEE2E2] text-sm font-medium flex items-center gap-3 text-[#991B1B] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          </aside>

          {/* Reports list */}
          <section className="lg:col-span-8 space-y-12">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className="section-label mb-2">Your reports</div>
                <h2 className="font-display text-4xl">{headerCopy}</h2>
              </div>
              <Link href="/submit" className="btn btn-accent">+ New report</Link>
            </div>

            {reportsLoading ? (
              <div className="text-sm ink-3 py-8">Loading your reports…</div>
            ) : visibleCount === 0 && grouped.rejected.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#D6D2C4] bg-white p-12 text-center">
                <div className="text-4xl mb-4">📸</div>
                <h3 className="font-display text-2xl mb-2">No reports yet.</h3>
                <p className="ink-2 leading-relaxed mb-6">
                  Spot something busted? Snap a pic and we&apos;ll add it to the fix queue.
                </p>
                <Link href="/submit" className="btn btn-accent">
                  Submit your first report
                </Link>
              </div>
            ) : (
              <>
                {grouped.pending.length > 0 && (
                  <ReportGroup
                    label="Pending review"
                    statusClass="status-pending"
                    count={grouped.pending.length}
                  >
                    <div className="space-y-3">
                      {grouped.pending.map((r) => (
                        <PendingCard key={r.id} report={r} />
                      ))}
                    </div>
                  </ReportGroup>
                )}

                {grouped.approved.length > 0 && (
                  <ReportGroup
                    label="Approved · Awaiting fix"
                    statusClass="status-broken"
                    count={grouped.approved.length}
                  >
                    <div className="space-y-3">
                      {grouped.approved.map((r) => (
                        <ApprovedCard key={r.id} report={r} />
                      ))}
                    </div>
                  </ReportGroup>
                )}

                {grouped.fixed.length > 0 && (
                  <ReportGroup
                    label="Fixed"
                    statusClass="status-fixed"
                    count={grouped.fixed.length}
                  >
                    <div className="space-y-3">
                      {grouped.fixed.map((r) => (
                        <FixedCard key={r.id} report={r} />
                      ))}
                    </div>
                  </ReportGroup>
                )}

                {grouped.rejected.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="status" style={{ color: '#6B6B66' }}>
                        Rejected
                      </span>
                      <span className="text-xs ink-3 font-mono">
                        {grouped.rejected.length} {grouped.rejected.length === 1 ? 'report' : 'reports'}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {grouped.rejected.map((r) => (
                        <RejectedCard key={r.id} report={r} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Owner card */}
            {user.isOwner && (
              <div className="pt-8 hairline">
                <div
                  className="rounded-2xl p-7 border"
                  style={{ background: '#FFEFE5', borderColor: '#F5C8AC' }}
                >
                  <div className="eyebrow mb-2" style={{ color: '#E94E1B' }}>Owner</div>
                  <h3 className="font-display text-2xl mb-2 leading-tight">You&apos;re on the team.</h3>
                  <p className="text-sm mb-5 leading-relaxed ink-2">
                    Review pending reports, post fixes directly, and mark broken things as fixed.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/account/owner" className="btn btn-primary btn-sm">
                      Owner dashboard
                    </Link>
                    <Link href="/account/queue" className="btn btn-ghost btn-sm">
                      Open queue →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ============================================================================
// Cards
// ============================================================================

function ReportGroup({
  label,
  statusClass,
  count,
  children,
}: {
  label: string;
  statusClass: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className={`status ${statusClass}`}>{label}</span>
        <span className="text-xs ink-3 font-mono">{count} {count === 1 ? 'report' : 'reports'}</span>
      </div>
      {children}
    </div>
  );
}

function PendingCard({ report }: { report: ReportDoc }) {
  return (
    <DynamicLink href={`/report/${report.id}/`} className="card card-hover flex items-center gap-5 p-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={report.beforePhotoUrl} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-lg leading-tight truncate">{report.title}</h3>
        <p className="text-sm ink-3 mt-1 truncate">
          {locationLabel(report)} · Submitted {relativeTime(report.createdAt)}
        </p>
        <div className="mt-2 text-xs status status-pending">Awaiting Fix-ATL Team review</div>
      </div>
      <ChevronRight />
    </DynamicLink>
  );
}

function ApprovedCard({ report }: { report: ReportDoc }) {
  return (
    <DynamicLink href={`/report/${report.id}/`} className="card card-hover flex items-center gap-5 p-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={report.beforePhotoUrl} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-lg leading-tight truncate">{report.title}</h3>
        <p className="text-sm ink-3 mt-1 truncate">
          {locationLabel(report)} · Approved {relativeTime(report.approvedAt ?? report.createdAt)}
        </p>
        <div className="mt-2 text-xs ink-3">📍 Visible on the public feed &amp; map</div>
      </div>
      <ChevronRight />
    </DynamicLink>
  );
}

function FixedCard({ report }: { report: ReportDoc }) {
  const afterUrl = report.afterPhotoUrl ?? report.beforePhotoUrl;
  return (
    <DynamicLink href={`/report/${report.id}/`} className="card card-hover flex items-center gap-5 p-5">
      <div className="grid grid-cols-2 w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 gap-px bg-[#EAE6DA]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={report.beforePhotoUrl} alt="" className="w-full h-full object-cover" />
        <div className="after-frame w-full h-full">
          <div className="photo" style={{ backgroundImage: `url('${afterUrl}')` }} />
          <div className="wash" />
          <div className="vignette" />
          <div className="stamp">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" />
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-lg leading-tight truncate">{report.title}</h3>
        <p className="text-sm ink-3 mt-1 truncate">
          {locationLabel(report)} · Fixed {relativeTime(report.fixedAt ?? report.createdAt)}
        </p>
        <div className="mt-2 text-xs status status-fixed">Painted with the Fix-ATL flower</div>
      </div>
      <ChevronRight />
    </DynamicLink>
  );
}

function RejectedCard({ report }: { report: ReportDoc }) {
  return (
    <DynamicLink
      href={`/report/${report.id}/`}
      className="block rounded-2xl border border-[#EAE6DA] overflow-hidden bg-white hover:border-[#D6D2C4] transition-colors"
    >
      <div className="flex items-center gap-5 p-5 opacity-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={report.beforePhotoUrl}
          alt=""
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0 grayscale"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg leading-tight truncate ink-2">{report.title}</h3>
          <p className="text-sm ink-3 mt-1 truncate">
            {locationLabel(report)} · Rejected {relativeTime(report.rejectedAt ?? report.createdAt)}
          </p>
          <div className="mt-2 text-xs font-semibold" style={{ color: '#6B6B66' }}>
            Hidden from public · only you can see this
          </div>
        </div>
      </div>
      {report.rejectionReason && (
        <div className="px-5 py-4 border-t border-[#EAE6DA] bg-[#F2EFE7]/50">
          <div className="eyebrow mb-2" style={{ color: '#991B1B' }}>Reason</div>
          <p className="text-sm ink-2 leading-relaxed">&ldquo;{report.rejectionReason}&rdquo;</p>
          <div className="text-xs ink-3 mt-2 font-mono">— Fix-ATL Team</div>
        </div>
      )}
    </DynamicLink>
  );
}

function ChevronRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ink-4 flex-shrink-0"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function groupByStatus(reports: ReportDoc[]): Record<ReportStatus, ReportDoc[]> {
  const groups: Record<ReportStatus, ReportDoc[]> = {
    pending: [],
    approved: [],
    fixed: [],
    rejected: [],
  };
  for (const r of reports) {
    groups[r.status]?.push(r);
  }
  return groups;
}

function makeHeaderCopy(visible: number, fixed: number): string {
  if (visible === 0) return 'Welcome to Fix-ATL.';
  const reportWord = visible === 1 ? 'report' : 'reports';
  const fixedWord = fixed === 1 ? 'fixed' : 'fixed';
  return `${visible} ${reportWord}, ${fixed} ${fixedWord}.`;
}

function locationLabel(report: ReportDoc): string {
  return report.neighborhood ?? report.city ?? 'Atlanta';
}

function formatMemberSince(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return 'just now';
  const d = ts.toDate();
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function relativeTime(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  const d = ts.toDate();
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return '1 day ago';
  if (diffDay < 7) return `${diffDay} days ago`;
  const diffWk = Math.floor(diffDay / 7);
  if (diffWk === 1) return '1 week ago';
  if (diffWk < 4) return `${diffWk} weeks ago`;
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo === 1) return '1 month ago';
  return `${diffMo} months ago`;
}
