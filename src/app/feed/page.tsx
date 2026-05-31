'use client';

/**
 * Feed page — translated from mockups/feed.html.
 *
 * Live data via subscribeFeed. Two filter axes:
 *   - status: 'all' | 'broken' | 'fixed'
 *   - category: ReportCategory | null
 *
 * Fixed reports render the side-by-side before/after composite.
 * Broken/approved reports render the before photo with a `status-broken` pill overlay.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DynamicLink from '@/components/DynamicLink';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { subscribeFeed, type FeedFilter } from '@/lib/services/reports';
import {
  REPORT_CATEGORIES,
  REPORT_CATEGORY_LABELS,
  type ReportCategory,
  type ReportDoc,
  type ReportStatus,
} from '@/types/report';

type StatusFilter = 'all' | 'broken' | 'fixed';

export default function FeedPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | null>(null);
  // `null` means "still waiting for the first snapshot".
  const [reports, setReports] = useState<ReportDoc[] | null>(null);

  // Build the FeedFilter from current filter state.
  const filter = useMemo<FeedFilter>(() => {
    const statuses: ReportStatus[] =
      statusFilter === 'all'
        ? ['approved', 'fixed']
        : statusFilter === 'broken'
          ? ['approved']
          : ['fixed'];
    const f: FeedFilter = { statuses };
    if (categoryFilter) f.category = categoryFilter;
    return f;
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    // Reset to null synchronously when filter changes by detaching the previous sub;
    // the next snapshot will populate `reports`. We avoid setState-in-effect by letting
    // the subscription callback be the only writer.
    const unsub = subscribeFeed(filter, setReports);
    return () => {
      unsub();
    };
  }, [filter]);

  const loading = reports === null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation active="feed" />

      {/* Editorial page header — tighter, button inline with title */}
      <section className="container pt-10 sm:pt-14 pb-6">
        <div className="section-label mb-3">Live feed</div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display-hero text-[44px] sm:text-6xl lg:text-7xl leading-[0.95] max-w-[16ch]">
            Everything Atlanta has flagged.
          </h1>
          <Link href="/submit" className="btn btn-accent btn-lg shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Report something
          </Link>
        </div>
      </section>

      {/* Filter bar — single row, category as select, sort right-aligned */}
      <section className="border-y border-[#EAE6DA] bg-[#FAFAF7]/80 backdrop-blur-sm sticky top-[72px] z-30 py-3">
        <div className="container flex flex-wrap items-center gap-2">
          {/* Status filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`filter ${statusFilter === 'all' ? 'active' : ''}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('broken')}
              className={`filter ${statusFilter === 'broken' ? 'active' : ''}`}
            >
              <span className="dot bg-[#991B1B]"></span> Needs fixing
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('fixed')}
              className={`filter ${statusFilter === 'fixed' ? 'active' : ''}`}
            >
              <span className="dot bg-[#166534]"></span> Fixed
            </button>
          </div>

          {/* Category select — replaces the chip flood */}
          <div className="relative ml-1">
            <select
              value={categoryFilter ?? ''}
              onChange={(e) => setCategoryFilter((e.target.value || null) as ReportCategory | null)}
              className={`filter pr-8 appearance-none cursor-pointer ${categoryFilter ? 'active' : ''}`}
              style={{ paddingRight: '2rem' }}
            >
              <option value="">All categories</option>
              {REPORT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{REPORT_CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
            <svg
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={categoryFilter ? '#fff' : 'currentColor'}
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Right-aligned sort + count */}
          <div className="ml-auto flex items-center gap-3 text-sm">
            {!loading && reports && (
              <span className="ink-3 font-mono text-xs hidden sm:inline">
                {reports.length} {reports.length === 1 ? 'report' : 'reports'}
              </span>
            )}
            <button type="button" className="filter">Newest ↓</button>
          </div>
        </div>
      </section>

      <main className="container py-8 flex-1">
        {loading ? (
          <div className="text-center py-16 ink-3 text-sm">Loading reports…</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 max-w-md mx-auto">
            <div className="text-3xl mb-3">📭</div>
            <h2 className="font-display text-xl mb-2">Nothing here yet</h2>
            <p className="ink-3 text-sm mb-5">
              No reports match the current filters. Try clearing them — or be the first to report something.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {(statusFilter !== 'all' || categoryFilter !== null) && (
                <button
                  type="button"
                  onClick={() => { setStatusFilter('all'); setCategoryFilter(null); }}
                  className="btn btn-ghost btn-sm"
                >
                  Clear filters
                </button>
              )}
              <Link href="/submit" className="btn btn-accent btn-sm">+ Report something</Link>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ----- card -----

function ReportCard({ report }: { report: ReportDoc }) {
  const isFixed = report.status === 'fixed';
  const subtitle = `${report.neighborhood ?? report.city} · ${relativeTime(
    (isFixed && report.fixedAt) || report.createdAt,
  )}`;

  return (
    <DynamicLink href={`/report/${report.id}/`} className="card card-hover">
      {isFixed ? (
        <div className="grid grid-cols-2 gap-px bg-[#EAE6DA]">
          <div className="ba-frame aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={report.beforePhotoUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="after-frame aspect-square">
            <div
              className="photo"
              style={{ backgroundImage: `url('${report.afterPhotoUrl ?? report.beforePhotoUrl}')` }}
            ></div>
            <div className="wash"></div>
            <div className="vignette"></div>
            <div className="stamp">
              <Image src="/logo.svg" alt="" width={100} height={100} />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative aspect-[5/4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={report.beforePhotoUrl} alt="" className="w-full h-full object-cover" />
          <span className="absolute top-3 right-3 status-bg status-broken">Needs fixing</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          {isFixed && <span className="status status-fixed">Fixed</span>}
          <span className="tag">{REPORT_CATEGORY_LABELS[report.category]}</span>
        </div>
        <h3 className="font-display text-xl leading-tight">{report.title}</h3>
        <p className="text-sm ink-3 mt-1.5">{subtitle}</p>
      </div>
    </DynamicLink>
  );
}

// ----- helpers -----

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
