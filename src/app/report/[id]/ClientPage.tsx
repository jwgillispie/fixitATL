'use client';

/**
 * Report detail page — renders one of 4 status views based on the report's
 * status + the viewer's role.
 *
 *   - fixed              → before/after toggle + timeline
 *   - approved (broken)  → before photo + owner action panel (if viewer is owner)
 *   - pending (submitter)→ "what happens next" sidebar
 *   - pending (owner)    → approve / reject panel
 *   - rejected           → only submitter or any owner can see; shows reason
 *
 * The route param is hydrated client-side because static export uses the
 * underscore-trick (see page.tsx).
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navigation from '@/components/Navigation';
import DynamicLink from '@/components/DynamicLink';
import Footer from '@/components/Footer';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  getReport,
  approveReport,
  rejectReport,
} from '@/lib/services/reports';
import {
  REPORT_CATEGORY_LABELS,
  type ReportDoc,
} from '@/types/report';

type ViewKind =
  | 'fixed'
  | 'broken'
  | 'pending-member'
  | 'pending-owner'
  | 'rejected'
  | 'forbidden';

export default function ClientPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { user, loading: authLoading } = useAuthContext();

  // eslint-disable-next-line no-console
  console.log('[FIXATL][report] render', {
    id,
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'ssr',
    authLoading,
    hasUser: !!user,
  });

  // If the id is missing or the underscore placeholder, we never need to fetch.
  const idIsRealOnMount = !!id && id !== '_';
  const [report, setReport] = useState<ReportDoc | null>(null);
  const [loading, setLoading] = useState(idIsRealOnMount);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[FIXATL][report] mount effect', { id, willFetch: !!id && id !== '_' });
    if (!id || id === '_') return;
    let cancelled = false;
    getReport(id)
      .then((r) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.log('[FIXATL][report] getReport resolved', { id, found: !!r, status: r?.status });
        if (!r) setNotFound(true);
        setReport(r);
        setLoading(false);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[FIXATL][report] getReport REJECTED', { id, err });
        if (cancelled) return;
        setNotFound(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const viewKind: ViewKind | null = useMemo(() => {
    if (!report) return null;
    const isOwner = !!user?.isOwner;
    const isSubmitter = !!user && report.createdBy === user.uid;

    if (report.status === 'fixed') return 'fixed';
    if (report.status === 'approved') return 'broken';
    if (report.status === 'rejected') {
      if (isSubmitter || isOwner) return 'rejected';
      return 'forbidden';
    }
    // pending
    if (isOwner) return 'pending-owner';
    if (isSubmitter) return 'pending-member';
    return 'forbidden';
  }, [report, user]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center text-sm ink-3">
          Loading report…
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container py-20 text-center">
          <div className="section-label justify-center mb-3">404</div>
          <h1 className="font-display-hero text-5xl sm:text-6xl mb-4">
            Report not found.
          </h1>
          <p className="ink-2 mb-8">
            The report may have been removed or the link is wrong.
          </p>
          <Link href="/feed" className="btn btn-primary">
            Back to feed
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  if (viewKind === 'forbidden') {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container py-20 text-center">
          <div className="section-label justify-center mb-3">Hidden</div>
          <h1 className="font-display-hero text-5xl sm:text-6xl mb-4">
            This report isn&apos;t public yet.
          </h1>
          <p className="ink-2 mb-8">
            It&apos;s still pending review. Only the submitter and the Fix-ATL
            team can see it right now.
          </p>
          <Link href="/feed" className="btn btn-primary">
            Back to feed
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      {viewKind === 'fixed' && <FixedView report={report} />}
      {viewKind === 'broken' && (
        <BrokenView report={report} viewerIsOwner={!!user?.isOwner} />
      )}
      {viewKind === 'pending-member' && <PendingMemberView report={report} />}
      {viewKind === 'pending-owner' && <PendingOwnerView report={report} />}
      {viewKind === 'rejected' && <RejectedView report={report} />}
      <Footer />
    </div>
  );
}

// ============================================================================
// Shared bits
// ============================================================================

function Crumb({ href, label, tail }: { href: string; label: string; tail: string }) {
  return (
    <div className="mb-10 flex items-center gap-2 text-sm ink-3">
      <Link href={href} className="hover:text-black inline-flex items-center gap-1.5">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {label}
      </Link>
      <span className="ink-4">/</span>
      <span className="ink-3">{tail}</span>
    </div>
  );
}

function shortRef(id: string): string {
  return id.slice(0, 6).toUpperCase();
}

function formatTimestamp(ts: ReportDoc['createdAt'] | null): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  return ts.toDate().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function relativeTime(ts: ReportDoc['createdAt'] | null): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  const diffMs = Date.now() - ts.toDate().getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 1) return `${day} day${day === 1 ? '' : 's'} ago`;
  if (hr >= 1) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  if (min >= 1) return `${min} min ago`;
  return 'just now';
}

function elapsedBetween(
  a: ReportDoc['createdAt'] | null,
  b: ReportDoc['createdAt'] | Date | null,
): string {
  if (!a || typeof a.toDate !== 'function' || !b) return '';
  const endDate = b instanceof Date ? b : b.toDate();
  const startDate = a.toDate();
  const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
  const hr = Math.floor(diffMs / (1000 * 60 * 60));
  const day = Math.floor(hr / 24);
  const remHr = hr - day * 24;
  if (day >= 1) return `${day}d ${remHr}h`;
  const min = Math.floor(diffMs / (1000 * 60));
  return `${hr}h ${min - hr * 60}m`;
}

function MiniMap() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-[#EAE6DA]"
      style={{ aspectRatio: '16/8' }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="mini-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EAE6DA" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="800" height="400" fill="#F2EFE7" />
        <rect width="800" height="400" fill="url(#mini-grid)" />
        <rect x="0" y="180" width="800" height="40" fill="#fff" />
        <rect x="380" y="0" width="40" height="400" fill="#fff" />
        <rect x="0" y="60" width="800" height="3" fill="#D6D2C4" />
        <rect x="0" y="320" width="800" height="3" fill="#D6D2C4" />
        <rect x="120" y="0" width="3" height="400" fill="#D6D2C4" />
        <rect x="640" y="0" width="3" height="400" fill="#D6D2C4" />
        <rect x="20" y="240" width="80" height="60" fill="#EAE6DA" rx="2" />
        <rect x="460" y="240" width="100" height="60" fill="#EAE6DA" rx="2" />
        <rect x="460" y="80" width="80" height="80" fill="#EAE6DA" rx="2" />
      </svg>
      <div className="pin" style={{ top: '50%', left: '50%' }}>
        <svg viewBox="0 0 30 38">
          <path
            d="M15 0C6.7 0 0 6.7 0 15c0 11.25 15 23 15 23s15-11.75 15-23C30 6.7 23.3 0 15 0z"
            fill="#991B1B"
          />
          <circle cx="15" cy="15" r="6" fill="#fff" />
        </svg>
      </div>
    </div>
  );
}

function LocationCard({ report }: { report: ReportDoc }) {
  const lines: string[] = [];
  if (report.neighborhood) lines.push(report.neighborhood);
  lines.push(`${report.city}, ${report.state}`);
  if (report.zipCode) lines.push(report.zipCode);

  return (
    <div className="grid sm:grid-cols-[1fr_auto] items-end gap-4 pt-4 hairline">
      <div>
        <div className="eyebrow mb-2">Location</div>
        <div className="font-display text-2xl mb-1">{report.address}</div>
        <div className="ink-3 text-sm">
          {lines.join(' · ')} · {report.latitude.toFixed(4)},{' '}
          {report.longitude.toFixed(4)}
        </div>
      </div>
      <Link href="/map" className="btn btn-quiet btn-sm">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        Open on map
      </Link>
    </div>
  );
}

// ============================================================================
// View: fixed
// ============================================================================

function FixedView({ report }: { report: ReportDoc }) {
  const [tab, setTab] = useState<'before' | 'after'>('after');
  const cycle = elapsedBetween(report.createdAt, report.fixedAt);

  return (
    <>
      <main className="container py-12 sm:py-16 flex-1">
        <Crumb href="/feed" label="Feed" tail="Fixed" />

        {/* Editorial header */}
        <div className="grid lg:grid-cols-12 gap-10 mb-12 items-end">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="status status-fixed">Fixed</span>
              <span className="ink-4 text-xs">·</span>
              <span className="tag">
                {REPORT_CATEGORY_LABELS[report.category]}
              </span>
              <span className="ink-4 text-xs">·</span>
              <span className="text-xs ink-3 font-mono">
                #{shortRef(report.id)}
              </span>
            </div>
            <h1 className="font-display-hero text-5xl sm:text-6xl lg:text-7xl mb-6">
              {report.title}
            </h1>
            {report.description && (
              <p className="text-xl ink-2 leading-relaxed max-w-2xl">
                {report.description}
              </p>
            )}
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <div className="eyebrow mb-2">Fix cycle time</div>
            <div className="font-display text-4xl">{cycle || '—'}</div>
            <div className="text-sm ink-3 mt-1">report to repair</div>
          </div>
        </div>

        {/* Before / After editorial */}
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab('before')}
                className={`filter ${tab === 'before' ? 'active' : ''}`}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                Before
              </button>
              <button
                type="button"
                onClick={() => setTab('after')}
                className={`filter ${tab === 'after' ? 'active' : ''}`}
              >
                <span>🌼</span>
                After
              </button>
            </div>
            {report.fixedByDisplayName && (
              <div className="text-xs ink-3 hidden sm:block">
                Tap to toggle · Painted by {report.fixedByDisplayName}
              </div>
            )}
          </div>

          <div className="relative rounded-2xl overflow-hidden">
            {tab === 'before' ? (
              <div className="ba-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={report.beforePhotoUrl}
                  alt=""
                  className="w-full aspect-[3/2] object-cover"
                />
                <span className="ba-tag">Before · Reported</span>
              </div>
            ) : (
              <div className="after-frame" style={{ aspectRatio: '3/2' }}>
                <div
                  className="photo"
                  style={{
                    backgroundImage: `url('${report.beforePhotoUrl}')`,
                  }}
                />
                <div className="wash"></div>
                <div className="vignette"></div>
                <div className="stamp">
                  <Image src="/logo.svg" alt="" width={200} height={200} />
                </div>
                <span className="ba-tag after">After · Painted</span>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setTab('before')}
              className={`relative rounded-lg overflow-hidden border ${
                tab === 'before'
                  ? 'border-2 border-[#0A0A0A]'
                  : 'border-[#EAE6DA] hover:border-[#0A0A0A]'
              } transition aspect-[4/3]`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={report.beforePhotoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/70 px-2 py-0.5 rounded">
                BEFORE
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('after')}
              className={`relative rounded-lg overflow-hidden ${
                tab === 'after'
                  ? 'border-2 border-[#0A0A0A]'
                  : 'border border-[#EAE6DA] hover:border-[#0A0A0A]'
              } aspect-[4/3]`}
            >
              <div className="after-frame w-full h-full">
                <div
                  className="photo"
                  style={{
                    backgroundImage: `url('${report.beforePhotoUrl}')`,
                  }}
                />
                <div className="wash"></div>
                <div className="vignette"></div>
                <div className="stamp">
                  <Image src="/logo.svg" alt="" width={80} height={80} />
                </div>
              </div>
              <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-white/95 px-2 py-0.5 rounded text-[#166534]">
                AFTER
              </span>
            </button>
          </div>
        </div>

        {/* Two column meta */}
        <div className="grid lg:grid-cols-12 gap-12 mt-20 pt-12 hairline">
          <div className="lg:col-span-7 space-y-10">
            <div>
              <div className="eyebrow mb-3">Where</div>
              <div className="font-display text-2xl mb-1">{report.address}</div>
              <div className="ink-3">
                {report.neighborhood ? `${report.neighborhood} · ` : ''}
                {report.city}, {report.state}
                {report.zipCode ? ` ${report.zipCode}` : ''}
              </div>
              <Link href="/map" className="btn-link text-sm mt-2 inline-flex items-center gap-1.5">
                See on map
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <div className="eyebrow mb-3">Reported by</div>
                <div className="flex items-center gap-3">
                  <div
                    className="avatar w-12 h-12"
                    style={{
                      background: 'linear-gradient(135deg, #C084FC, #818CF8)',
                    }}
                  />
                  <div>
                    <div className="font-semibold text-base">
                      {report.createdByDisplayName}
                    </div>
                    <div className="text-sm ink-3">
                      {relativeTime(report.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
              {report.fixedByDisplayName && (
                <div>
                  <div className="eyebrow mb-3">Fixed by</div>
                  <div className="flex items-center gap-3">
                    <div className="avatar w-12 h-12 bg-black flex items-center justify-center">
                      <Image src="/logo.svg" alt="" width={32} height={32} />
                    </div>
                    <div>
                      <div className="font-semibold text-base">
                        {report.fixedByDisplayName}
                      </div>
                      <div className="text-sm ink-3">
                        {relativeTime(report.fixedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="lg:col-span-5 space-y-8">
            <div>
              <div className="eyebrow mb-4">Timeline</div>
              <ol className="timeline">
                <li className="timeline-item done text-pending">
                  <div className="text-sm ink-1">
                    <b>Submitted</b> by {report.createdByDisplayName}
                  </div>
                  <div className="text-xs ink-3 mt-0.5">
                    {formatTimestamp(report.createdAt)}
                  </div>
                </li>
                {report.approvedAt && (
                  <li className="timeline-item done text-broken">
                    <div className="text-sm ink-1">
                      <b>Approved</b> by Fix-ATL Team
                    </div>
                    <div className="text-xs ink-3 mt-0.5">
                      {formatTimestamp(report.approvedAt)}
                    </div>
                  </li>
                )}
                {report.fixedAt && (
                  <li className="timeline-item done text-fixed">
                    <div className="text-sm ink-1">
                      <b>Fixed</b> &amp; painted in the field
                    </div>
                    <div className="text-xs ink-3 mt-0.5">
                      {formatTimestamp(report.fixedAt)}
                      {cycle ? ` · ${cycle} total` : ''}
                    </div>
                  </li>
                )}
              </ol>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

// ============================================================================
// View: broken (approved)
// ============================================================================

function BrokenView({
  report,
  viewerIsOwner,
}: {
  report: ReportDoc;
  viewerIsOwner: boolean;
}) {
  const queueElapsed = elapsedBetween(report.approvedAt, new Date());

  return (
    <main className="container py-12 sm:py-16 flex-1">
      <Crumb href="/feed" label="Feed" tail="Report" />

      <div className="grid lg:grid-cols-12 gap-10 mb-12 items-end">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="status status-broken">Needs fixing</span>
            <span className="ink-4 text-xs">·</span>
            <span className="tag">{REPORT_CATEGORY_LABELS[report.category]}</span>
            <span className="ink-4 text-xs">·</span>
            <span className="text-xs ink-3 font-mono">
              Report #{shortRef(report.id)}
            </span>
          </div>
          <h1 className="font-display-hero text-5xl sm:text-6xl lg:text-7xl mb-6">
            {report.title}
          </h1>
          {report.description && (
            <p className="text-xl ink-2 leading-relaxed max-w-2xl">
              {report.description}
            </p>
          )}
        </div>
        <div className="lg:col-span-4 lg:text-right">
          <div className="eyebrow mb-2">Approved · Awaiting fix</div>
          <div className="font-display text-3xl">{queueElapsed || '—'}</div>
          <div className="text-sm ink-3 mt-1">in the queue</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* LEFT: Hero photo + map */}
        <div className="lg:col-span-8 space-y-6">
          <figure className="ba-frame rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.beforePhotoUrl}
              alt=""
              className="w-full aspect-[16/11] object-cover"
            />
            <span className="ba-tag">Submitted photo</span>
          </figure>

          <LocationCard report={report} />

          <MiniMap />
        </div>

        {/* RIGHT: Owner panel + meta */}
        <aside className="lg:col-span-4 space-y-6">
          {viewerIsOwner && (
            <div
              className="rounded-2xl p-7 border"
              style={{ background: '#FFEFE5', borderColor: '#F5C8AC' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E94E1B]"></span>
                <span
                  className="text-[11px] font-semibold tracking-[0.16em] uppercase"
                  style={{ color: '#E94E1B' }}
                >
                  Owner Actions
                </span>
              </div>
              <h3 className="font-display text-2xl mb-2 leading-tight">
                Ready to fix this?
              </h3>
              <p className="text-sm mb-6 leading-relaxed ink-2">
                Once it&apos;s done in the field, upload an after photo. We&apos;ll
                publish the before/after and mark this report fixed.
              </p>

              <DynamicLink
                href={`/account/mark-fixed/${report.id}/`}
                className="btn btn-accent btn-block btn-lg mb-3"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                Mark as fixed
              </DynamicLink>
            </div>
          )}

          <div className="pt-2">
            <div className="eyebrow mb-3">Reported by</div>
            <div className="flex items-center gap-3">
              <div
                className="avatar w-12 h-12"
                style={{
                  background: 'linear-gradient(135deg, #FDBA74, #F472B6)',
                }}
              />
              <div>
                <div className="font-semibold text-base">
                  {report.createdByDisplayName}
                </div>
                <div className="text-sm ink-3">
                  {relativeTime(report.createdAt)}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 hairline">
            <div className="eyebrow mb-4">Timeline</div>
            <ol className="timeline">
              <li className="timeline-item done text-pending">
                <div className="text-sm ink-1">
                  <b>Submitted</b> by {report.createdByDisplayName}
                </div>
                <div className="text-xs ink-3 mt-0.5">
                  {formatTimestamp(report.createdAt)}
                </div>
              </li>
              {report.approvedAt && (
                <li className="timeline-item done text-broken">
                  <div className="text-sm ink-1">
                    <b>Approved</b> by Fix-ATL Team
                  </div>
                  <div className="text-xs ink-3 mt-0.5">
                    {formatTimestamp(report.approvedAt)}
                  </div>
                </li>
              )}
              <li className="timeline-item pending ink-3">
                <div className="text-sm">
                  <b>Awaiting fix</b>
                </div>
                <div className="text-xs mt-0.5">Pending field work</div>
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}

// ============================================================================
// View: pending (submitter)
// ============================================================================

function PendingMemberView({ report }: { report: ReportDoc }) {
  return (
    <main className="container py-12 sm:py-16 flex-1">
      <Crumb href="/account" label="Your account" tail="Pending report" />

      <div
        className="banner mb-10 rounded-2xl border"
        style={{
          background: 'var(--pending-soft)',
          borderColor: '#FCD34D',
          color: 'var(--pending)',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 mt-0.5"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <div>
          <div className="font-semibold mb-0.5">
            Only you and the Fix-ATL team can see this right now.
          </div>
          <p className="text-sm">
            It&apos;ll go live on the public feed &amp; map once an owner
            approves it. Most reports are reviewed within 24 hours.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-10 mb-12 items-end">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="status status-pending">Pending review</span>
            <span className="ink-4 text-xs">·</span>
            <span className="tag">{REPORT_CATEGORY_LABELS[report.category]}</span>
            <span className="ink-4 text-xs">·</span>
            <span className="text-xs ink-3 font-mono">#{shortRef(report.id)}</span>
          </div>
          <h1 className="font-display-hero text-5xl sm:text-6xl lg:text-7xl mb-6">
            {report.title}
          </h1>
          {report.description && (
            <p className="text-xl ink-2 leading-relaxed max-w-2xl">
              {report.description}
            </p>
          )}
        </div>
        <div className="lg:col-span-4 lg:text-right">
          <div className="eyebrow mb-2">In queue for</div>
          <div className="font-display text-3xl">
            {relativeTime(report.createdAt) || '—'}
          </div>
          <div className="text-sm ink-3 mt-1">avg review: ~18h</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <figure className="ba-frame rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.beforePhotoUrl}
              alt=""
              className="w-full aspect-[16/11] object-cover"
            />
            <span className="ba-tag">Your submission</span>
          </figure>

          <div className="grid sm:grid-cols-[1fr_auto] items-end gap-4 pt-4 hairline">
            <div>
              <div className="eyebrow mb-2">Location</div>
              <div className="font-display text-2xl mb-1">{report.address}</div>
              <div className="ink-3 text-sm">
                {report.neighborhood ? `${report.neighborhood} · ` : ''}
                {report.city}, {report.state}
              </div>
            </div>
            <span className="text-sm ink-3 italic">
              Map will appear once approved
            </span>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="rounded-2xl border border-[#EAE6DA] bg-white p-6">
            <div className="eyebrow mb-4">What happens next</div>
            <ol className="space-y-4">
              <li className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    Fix-ATL team reviews
                  </div>
                  <div className="text-xs ink-3 mt-0.5">
                    Usually within 24 hours. They confirm the report is
                    something they can fix.
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <div className="font-semibold text-sm">Goes live publicly</div>
                  <div className="text-xs ink-3 mt-0.5">
                    Appears on the feed and map as{' '}
                    <span className="status status-broken">Needs fixing</span>
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <div className="font-semibold text-sm">Team goes to fix it</div>
                  <div className="text-xs ink-3 mt-0.5">
                    When it&apos;s done, they post an after photo and the status
                    flips to{' '}
                    <span className="status status-fixed">Fixed</span>
                  </div>
                </div>
              </li>
            </ol>
          </div>

          <div>
            <div className="eyebrow mb-4">Timeline</div>
            <ol className="timeline">
              <li className="timeline-item done text-pending">
                <div className="text-sm ink-1">
                  <b>You submitted this</b>
                </div>
                <div className="text-xs ink-3 mt-0.5">
                  {relativeTime(report.createdAt)} ·{' '}
                  {formatTimestamp(report.createdAt)}
                </div>
              </li>
              <li className="timeline-item pending ink-3">
                <div className="text-sm">
                  <b>Awaiting review</b>
                </div>
                <div className="text-xs mt-0.5">By Fix-ATL Team</div>
              </li>
              <li className="timeline-item pending ink-3">
                <div className="text-sm">Approved</div>
              </li>
              <li className="timeline-item pending ink-3">
                <div className="text-sm">Fixed</div>
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}

// ============================================================================
// View: pending (owner) — approve / reject decision panel
// ============================================================================

function PendingOwnerView({ report }: { report: ReportDoc }) {
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await approveReport(report.id);
      // The page will re-render when getReport returns the approved status on a
      // fresh load — but we don't have a subscription here. Reload to refresh.
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
      setBusy(false);
    }
  }

  async function handleReject() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await rejectReport(report.id, rejectReason.trim());
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject');
      setBusy(false);
    }
  }

  return (
    <main className="container py-12 sm:py-16 flex-1">
      <Crumb href="/account/queue" label="Queue" tail="Pending review" />

      <div className="grid lg:grid-cols-12 gap-10 mb-12 items-end">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="status status-pending">Pending review</span>
            <span className="ink-4 text-xs">·</span>
            <span className="tag">{REPORT_CATEGORY_LABELS[report.category]}</span>
            <span className="ink-4 text-xs">·</span>
            <span className="text-xs ink-3 font-mono">#{shortRef(report.id)}</span>
          </div>
          <h1 className="font-display-hero text-5xl sm:text-6xl lg:text-7xl mb-6">
            {report.title}
          </h1>
          {report.description && (
            <p className="text-xl ink-2 leading-relaxed max-w-2xl">
              {report.description}
            </p>
          )}
        </div>
        <div className="lg:col-span-4 lg:text-right">
          <div className="eyebrow mb-2">In queue for</div>
          <div className="font-display text-3xl">
            {relativeTime(report.createdAt) || '—'}
          </div>
          <div className="text-sm ink-3 mt-1">since submission</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <figure className="ba-frame rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.beforePhotoUrl}
              alt=""
              className="w-full aspect-[16/11] object-cover"
            />
            <span className="ba-tag">Submitted photo</span>
          </figure>

          <LocationCard report={report} />
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div
            className="rounded-2xl p-7 border"
            style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#92400E' }}></span>
              <span
                className="text-[11px] font-semibold tracking-[0.16em] uppercase"
                style={{ color: '#92400E' }}
              >
                Awaiting your call
              </span>
            </div>
            <h3 className="font-display text-2xl mb-2 leading-tight">
              Approve or reject?
            </h3>
            <p className="text-sm mb-6 leading-relaxed ink-2">
              Approving puts this on the public feed and map. Rejecting hides
              it and tells the reporter why.
            </p>

            {error && (
              <div className="mb-4 text-sm" style={{ color: '#991B1B' }}>
                {error}
              </div>
            )}

            {!showReject ? (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={busy}
                  className="btn btn-accent btn-block btn-lg mb-3"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {busy ? 'Approving…' : 'Approve'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReject(true)}
                  disabled={busy}
                  className="btn btn-ghost btn-block"
                  style={{ color: '#991B1B', borderColor: '#FCA5A5' }}
                >
                  Reject with reason…
                </button>
              </>
            ) : (
              <>
                <label
                  htmlFor="reject-reason"
                  className="block text-xs font-semibold tracking-[0.05em] uppercase mb-2"
                  style={{ color: '#991B1B' }}
                >
                  Reason (visible to reporter)
                </label>
                <textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Not in our service area"
                  className="input mb-3"
                />
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={busy || !rejectReason.trim()}
                  className="btn btn-block btn-lg mb-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: '#B91C1C', color: '#fff' }}
                >
                  {busy ? 'Rejecting…' : 'Confirm reject'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReject(false);
                    setRejectReason('');
                  }}
                  disabled={busy}
                  className="btn btn-quiet btn-block"
                >
                  Cancel
                </button>
              </>
            )}

            <div
              className="mt-6 pt-5 border-t flex items-center justify-between text-xs ink-3"
              style={{ borderColor: '#FDE68A' }}
            >
              <span>
                Reviewing as <b className="text-black">Fix-ATL Team</b>
              </span>
              <Link href="/account/queue" className="hover:underline font-semibold text-black">
                Back to queue
              </Link>
            </div>
          </div>

          <div className="pt-2">
            <div className="eyebrow mb-3">Reported by</div>
            <div className="flex items-center gap-3">
              <div
                className="avatar w-12 h-12"
                style={{
                  background: 'linear-gradient(135deg, #C084FC, #818CF8)',
                }}
              />
              <div className="flex-1">
                <div className="font-semibold text-base">
                  {report.createdByDisplayName}
                </div>
                <div className="text-sm ink-3">
                  {relativeTime(report.createdAt)}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 hairline">
            <div className="eyebrow mb-4">Timeline</div>
            <ol className="timeline">
              <li className="timeline-item done text-pending">
                <div className="text-sm ink-1">
                  <b>Submitted</b> by {report.createdByDisplayName}
                </div>
                <div className="text-xs ink-3 mt-0.5">
                  {relativeTime(report.createdAt)} ·{' '}
                  {formatTimestamp(report.createdAt)}
                </div>
              </li>
              <li className="timeline-item pending ink-3">
                <div className="text-sm">
                  <b>Awaiting review</b>
                </div>
                <div className="text-xs mt-0.5">From you</div>
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}

// ============================================================================
// View: rejected (submitter only)
// ============================================================================

function RejectedView({ report }: { report: ReportDoc }) {
  return (
    <main className="container py-12 sm:py-16 flex-1">
      <Crumb href="/account" label="Your account" tail="Rejected report" />

      <div
        className="banner mb-10 rounded-2xl border"
        style={{
          background: 'var(--broken-soft)',
          borderColor: '#FCA5A5',
          color: 'var(--broken)',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 mt-0.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <div>
          <div className="font-semibold mb-0.5">This report was rejected.</div>
          {report.rejectionReason && (
            <p className="text-sm">Reason: {report.rejectionReason}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="status status-broken">Rejected</span>
        <span className="ink-4 text-xs">·</span>
        <span className="tag">{REPORT_CATEGORY_LABELS[report.category]}</span>
        <span className="ink-4 text-xs">·</span>
        <span className="text-xs ink-3 font-mono">#{shortRef(report.id)}</span>
      </div>
      <h1 className="font-display-hero text-5xl sm:text-6xl lg:text-7xl mb-6">
        {report.title}
      </h1>
      {report.description && (
        <p className="text-xl ink-2 leading-relaxed max-w-2xl mb-10">
          {report.description}
        </p>
      )}

      <figure className="ba-frame rounded-2xl max-w-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={report.beforePhotoUrl}
          alt=""
          className="w-full aspect-[16/11] object-cover"
        />
        <span className="ba-tag">Your submission</span>
      </figure>

      <div className="mt-8">
        <Link href="/submit" className="btn btn-primary">
          Submit a new report
        </Link>
      </div>
    </main>
  );
}
