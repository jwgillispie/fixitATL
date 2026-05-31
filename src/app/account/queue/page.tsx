'use client';

/**
 * Approval queue — light-mode version.
 *
 * Live data via subscribePendingQueue. Each pending report renders a card with
 * Approve / Reject... actions. Reject toggles an inline reason form.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import DynamicLink from '@/components/DynamicLink';
import Footer from '@/components/Footer';
import OwnerGuard from '@/components/auth/OwnerGuard';
import {
  approveReport,
  rejectReport,
  subscribePendingQueue,
} from '@/lib/services/reports';
import {
  REPORT_CATEGORY_LABELS,
  type ReportDoc,
} from '@/types/report';

export default function QueuePage() {
  return (
    <OwnerGuard>
      <QueueInner />
    </OwnerGuard>
  );
}

function QueueInner() {
  const [reports, setReports] = useState<ReportDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    const unsub = subscribePendingQueue((r) => {
      setReports(r);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation active="queue" />

      <main className="container py-10 sm:py-14 flex-1">
        <Link
          href="/account/owner"
          className="text-sm ink-3 hover:text-black inline-flex items-center gap-1.5 mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Owner dashboard
        </Link>

        <div className="mb-8">
          <div className="section-label mb-3">Pending review</div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display-hero text-[44px] sm:text-6xl lg:text-7xl leading-[0.95] max-w-[16ch]">
              {reports.length === 0 ? (
                <>All clear. <span style={{ color: '#166534' }}>Nice.</span></>
              ) : (
                <>
                  {reports.length} report{reports.length === 1 ? '' : 's'}.{' '}
                  <span style={{ color: '#92400E' }}>Your call.</span>
                </>
              )}
            </h1>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveFilter('pending')}
                className={`filter ${activeFilter === 'pending' ? 'active' : ''}`}
              >
                Pending <span className="count">{reports.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('approved')}
                className={`filter ${activeFilter === 'approved' ? 'active' : ''}`}
                title="Coming soon"
              >
                Approved
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('rejected')}
                className={`filter ${activeFilter === 'rejected' ? 'active' : ''}`}
                title="Coming soon"
              >
                Rejected
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 ink-3 text-sm">Loading queue…</div>
        ) : activeFilter !== 'pending' ? (
          <div className="rounded-2xl border border-[#EAE6DA] bg-white p-12 text-center">
            <p className="text-sm ink-3">
              {activeFilter === 'approved' ? 'Approved' : 'Rejected'} view is coming soon. For now, see all approved reports on the{' '}
              <Link href="/feed" className="underline underline-offset-4 font-semibold text-black">feed</Link>.
            </p>
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-[#EAE6DA] bg-white p-16 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <p className="font-display text-2xl mb-2">All caught up.</p>
            <p className="text-sm ink-3">New reports will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <QueueItem key={report.id} report={report} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ----- queue item -----

function QueueItem({ report }: { report: ReportDoc }) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setBusy(true);
    setError(null);
    try {
      await approveReport(report.id);
      // Subscription will remove this item from the list.
    } catch {
      setError('Could not approve. Try again.');
      setBusy(false);
    }
  }

  async function handleConfirmReject() {
    if (!reason.trim()) {
      setError('Please enter a reason — the reporter will see it.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await rejectReport(report.id, reason.trim());
    } catch {
      setError('Could not reject. Try again.');
      setBusy(false);
    }
  }

  const idShort = report.id.slice(0, 6).toUpperCase();
  const borderClass = showReject
    ? 'border-[#E94E1B] ring-2 ring-[#E94E1B]/15'
    : 'border-[#EAE6DA]';

  return (
    <article className={`rounded-2xl border bg-white overflow-hidden ${borderClass}`}>
      <div className="grid md:grid-cols-[300px_1fr]">
        <div className="relative aspect-square md:aspect-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={report.beforePhotoUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          <span className="absolute top-3 left-3 status-bg status-pending">Pending</span>
          <span className="absolute bottom-3 left-3 text-[10px] font-mono px-2 py-1 rounded bg-black/70 text-white">
            {relativeTime(report.createdAt)}
          </span>
        </div>
        <div className="p-6 sm:p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <span className="tag">{REPORT_CATEGORY_LABELS[report.category]}</span>
            <span className="text-xs ink-3 font-mono">#{idShort}</span>
          </div>
          <h3 className="font-display text-2xl leading-tight mb-3">{report.title}</h3>
          {report.description && (
            <p className="text-sm leading-relaxed mb-5 ink-2">{report.description}</p>
          )}

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm ink-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {report.address}
              {report.neighborhood ? ` · ${report.neighborhood}` : ''}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div
                className="avatar w-7 h-7"
                style={{
                  background: 'linear-gradient(135deg, #C084FC, #818CF8)',
                }}
              ></div>
              <span><b>{report.createdByDisplayName}</b></span>
            </div>
          </div>

          {error && (
            <div className="text-sm mb-3" style={{ color: '#991B1B' }}>{error}</div>
          )}

          {!showReject ? (
            <div className="mt-auto pt-5 border-t border-[#EAE6DA] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={busy}
                className="btn btn-accent disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {busy ? 'Approving…' : 'Approve'}
              </button>
              <button
                type="button"
                onClick={() => setShowReject(true)}
                disabled={busy}
                className="btn btn-ghost disabled:opacity-60"
              >
                Reject…
              </button>
              <DynamicLink
                href={`/report/${report.id}/`}
                className="btn-link text-sm ml-auto self-center"
              >
                View details →
              </DynamicLink>
            </div>
          ) : (
            <div className="mt-auto pt-5 border-t border-[#EAE6DA]">
              <div className="rounded-xl border p-5" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
                <label className="field-label" style={{ color: '#991B1B' }}>
                  Rejection reason · visible to reporter
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this report isn't a fit (e.g. wrong agency, not infrastructure)."
                  className="input"
                  maxLength={500}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmReject}
                    disabled={busy}
                    className="btn disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: '#B91C1C', color: 'white' }}
                  >
                    {busy ? 'Rejecting…' : 'Confirm reject'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReject(false);
                      setReason('');
                      setError(null);
                    }}
                    disabled={busy}
                    className="btn btn-quiet"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
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
  if (diffDay === 1) return '1d ago';
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWk = Math.floor(diffDay / 7);
  if (diffWk < 4) return `${diffWk}w ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}
