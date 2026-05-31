'use client';

/**
 * Owner dashboard — light-mode version.
 *
 * Stats:
 *   - Pending count from subscribePendingQueue
 *   - Awaiting fix count from subscribeFeed({ statuses: ['approved'] })
 *   - Fixed count from subscribeFeed({ statuses: ['fixed'] })
 *   - This week is hardcoded for now
 *
 * Recent activity is the 5 most recent fixed reports.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DynamicLink from '@/components/DynamicLink';
import { signOut } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import OwnerGuard from '@/components/auth/OwnerGuard';
import { useAuthContext } from '@/contexts/AuthContext';
import { subscribeFeed, subscribePendingQueue } from '@/lib/services/reports';
import type { ReportDoc } from '@/types/report';

export default function OwnerDashboardPage() {
  return (
    <OwnerGuard>
      <OwnerDashboardInner />
    </OwnerGuard>
  );
}

function OwnerDashboardInner() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [pending, setPending] = useState<ReportDoc[]>([]);
  const [awaiting, setAwaiting] = useState<ReportDoc[]>([]);
  const [fixed, setFixed] = useState<ReportDoc[]>([]);

  useEffect(() => {
    const unsubPending = subscribePendingQueue(setPending);
    const unsubAwaiting = subscribeFeed({ statuses: ['approved'], pageSize: 200 }, setAwaiting);
    const unsubFixed = subscribeFeed({ statuses: ['fixed'], pageSize: 200 }, setFixed);
    return () => {
      unsubPending();
      unsubAwaiting();
      unsubFixed();
    };
  }, []);

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/auth/login');
  }

  // Build a unified activity feed across pending submissions, approvals,
  // and fixes. Each report contributes ONE entry — its most recent state
  // change — sorted by recency.
  const activity = useMemo<ActivityEntry[]>(() => {
    const entries: ActivityEntry[] = [];
    for (const r of pending) {
      if (r.createdAt) entries.push({ kind: 'submitted', ts: r.createdAt, report: r });
    }
    for (const r of awaiting) {
      const ts = r.approvedAt ?? r.createdAt;
      if (ts) entries.push({ kind: 'approved', ts, report: r });
    }
    for (const r of fixed) {
      const ts = r.fixedAt ?? r.createdAt;
      if (ts) entries.push({ kind: 'fixed', ts, report: r });
    }
    entries.sort((a, b) => b.ts.toMillis() - a.ts.toMillis());
    return entries.slice(0, 8);
  }, [pending, awaiting, fixed]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation active="account" />

      <main className="container py-10 sm:py-14 flex-1">

        {/* Editorial header */}
        <div className="mb-12">
          <div className="section-label mb-3">Owner dashboard</div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h1 className="font-display-hero text-[44px] sm:text-6xl lg:text-7xl leading-[0.95] max-w-[18ch]">
              Welcome back,{' '}
              <span style={{ color: '#E94E1B' }}>team. 🌼</span>
            </h1>
            <div className="text-right shrink-0">
              <div className="eyebrow mb-1">Signed in as</div>
              <div className="font-display text-xl">{user?.displayName ?? 'Owner'}</div>
              <div className="text-sm ink-3 mt-0.5">
                {user?.email}
              </div>
            </div>
          </div>
          <p className="text-base ink-2 max-w-xl mt-4">
            {pending.length === 0
              ? "You're all caught up. Here's what's happening across the city."
              : `${pending.length} new report${pending.length === 1 ? '' : 's'} waiting on you.`}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#EAE6DA] rounded-2xl overflow-hidden border border-[#EAE6DA]">
          <Link href="/account/queue" className="bg-white p-7 hover:bg-[#FAFAF7] transition-colors group">
            <div className="flex items-center justify-between mb-4">
              <div className="eyebrow" style={{ color: '#92400E' }}>Pending</div>
              {pending.length > 0 && (
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#92400E' }}></span>
              )}
            </div>
            <div className="font-display-hero text-6xl">{pending.length}</div>
            <div className="text-sm mt-2 ink-3 group-hover:underline underline-offset-4">Review now →</div>
          </Link>
          <Link href="/feed" className="bg-white p-7 hover:bg-[#FAFAF7] transition-colors">
            <div className="eyebrow mb-4" style={{ color: '#991B1B' }}>Awaiting fix</div>
            <div className="font-display-hero text-6xl">{awaiting.length}</div>
            <div className="text-sm mt-2 ink-3">Out in the city</div>
          </Link>
          <div className="bg-white p-7">
            <div className="eyebrow mb-4" style={{ color: '#166534' }}>Fixed all-time</div>
            <div className="font-display-hero text-6xl" style={{ color: '#166534' }}>{fixed.length}</div>
            <div className="text-sm mt-2 ink-3">Painted with 🌼</div>
          </div>
          <div className="bg-white p-7">
            <div className="eyebrow mb-4">This week</div>
            <div className="font-display-hero text-6xl">7</div>
            <div className="text-sm mt-2 ink-3">New fixes posted</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <Link href="/account/queue" className="card hover:border-[#E94E1B] p-7 flex items-center gap-5 transition-colors group">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#FEF3C7' }}>📋</div>
            <div className="flex-1">
              <h3 className="font-display text-2xl mb-1 leading-tight">Review the queue</h3>
              <p className="text-sm ink-3">
                {pending.length === 0
                  ? 'No reports waiting'
                  : `${pending.length} report${pending.length === 1 ? '' : 's'} waiting for approval`}
              </p>
            </div>
            <span className="text-[#E94E1B] text-xl group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          <Link href="/account/post" className="card hover:border-[#E94E1B] p-7 flex items-center gap-5 transition-colors group">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#FFEFE5' }}>🌼</div>
            <div className="flex-1">
              <h3 className="font-display text-2xl mb-1 leading-tight">Post a fix</h3>
              <p className="text-sm ink-3">Upload a before+after directly</p>
            </div>
            <span className="text-[#E94E1B] text-xl group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {/* Recent activity */}
        <section className="mt-16">
          <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="section-label mb-2">Recent activity</div>
              <h2 className="font-display text-3xl sm:text-4xl">What&apos;s been happening.</h2>
            </div>
            <Link href="/feed" className="btn btn-quiet btn-sm">View all</Link>
          </div>

          {activity.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm ink-3">No activity yet. New submissions, approvals, and fixes will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((entry) => (
                <ActivityRow
                  key={`${entry.kind}-${entry.report.id}`}
                  entry={entry}
                  currentUserDisplayName={user?.displayName ?? null}
                />
              ))}
            </div>
          )}
        </section>

        {/* Sign out */}
        <div className="mt-16 pt-8 hairline flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm ink-3">
            Signed in as <b className="text-black">{user?.displayName}</b> · {user?.email}
          </p>
          <button
            onClick={handleSignOut}
            className="text-sm font-semibold hover:underline"
            style={{ color: '#991B1B' }}
          >
            Sign out
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ----- Activity feed types + row -----

type ActivityKind = 'submitted' | 'approved' | 'fixed';

interface ActivityEntry {
  kind: ActivityKind;
  ts: Timestamp;
  report: ReportDoc;
}

function ActivityRow({
  entry,
  currentUserDisplayName,
}: {
  entry: ActivityEntry;
  currentUserDisplayName: string | null;
}) {
  const { kind, report } = entry;

  // Visual + copy per event type.
  let icon: string;
  let bg: string;
  let body: React.ReactNode;
  if (kind === 'submitted') {
    icon = '📨';
    bg = '#FEF3C7'; // pending amber
    body = (
      <>
        <b>@{report.createdByDisplayName ?? 'someone'}</b> submitted{' '}
        <b>{report.title}</b>
      </>
    );
  } else if (kind === 'approved') {
    icon = '✅';
    bg = '#FEE2E2'; // broken/red soft
    body = (
      <>
        <b>{report.title}</b> approved · awaiting fix
      </>
    );
  } else {
    icon = '🌼';
    bg = '#DCFCE7'; // fixed green soft
    const fixedBy = report.fixedByDisplayName === currentUserDisplayName
      ? 'You'
      : report.fixedByDisplayName ?? 'Fix-ATL Team';
    body = (
      <>
        <b>{fixedBy}</b> marked <b>{report.title}</b> as fixed
      </>
    );
  }

  return (
    <div className="card hover:border-[#D6D2C4] flex items-center gap-5 p-5 transition-colors">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: bg }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{body}</p>
        <p className="text-xs ink-3 mt-1">
          {relativeTime(entry.ts)}
          {report.neighborhood ? ` · ${report.neighborhood}` : ''}
          {kind !== 'submitted' && report.createdByDisplayName
            ? ` · Reporter: @${report.createdByDisplayName}`
            : ''}
        </p>
      </div>
      <DynamicLink href={`/report/${report.id}/`} className="btn btn-quiet btn-sm">
        View
      </DynamicLink>
    </div>
  );
}

function relativeTime(ts: { toDate?: () => Date } | null | undefined): string {
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
