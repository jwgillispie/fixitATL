'use client';

/**
 * Mark-as-fixed modal — translated from mockups/mark-fixed.html.
 *
 * Looks like a modal: a dimmed/blurred photo backdrop with a centered card.
 * Loads the report by id from useParams, shows the existing context (title,
 * address, before photo), accepts a single after photo + optional note, and
 * calls markReportFixed.
 *
 * On success, redirects to /report/{id}.
 */

import { useEffect, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DynamicLink from '@/components/DynamicLink';
import { useParams, useRouter } from 'next/navigation';
import OwnerGuard from '@/components/auth/OwnerGuard';
import { useAuthContext } from '@/contexts/AuthContext';
import { getReport, markReportFixed } from '@/lib/services/reports';
import type { ReportDoc } from '@/types/report';

export default function ClientPage() {
  return (
    <OwnerGuard>
      <MarkFixedInner />
    </OwnerGuard>
  );
}

function MarkFixedInner() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user } = useAuthContext();

  // Placeholder for static export — never hit a real lookup with this.
  const isPlaceholder = id === '_';

  const [report, setReport] = useState<ReportDoc | null>(null);
  // If we're on the placeholder route, there's nothing to load.
  const [loading, setLoading] = useState(!isPlaceholder);

  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPlaceholder) return;
    let cancelled = false;
    getReport(id)
      .then((r) => {
        if (!cancelled) {
          setReport(r);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isPlaceholder]);

  useEffect(() => {
    return () => {
      if (afterPreview) URL.revokeObjectURL(afterPreview);
    };
  }, [afterPreview]);

  function handleAfterChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (afterPreview) URL.revokeObjectURL(afterPreview);
    setAfterFile(file);
    setAfterPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleConfirm() {
    if (!afterFile) {
      setError('Add an after photo to confirm.');
      return;
    }
    if (!user) {
      setError('You need to be signed in.');
      return;
    }
    if (!report) return;
    setSubmitting(true);
    setError(null);
    try {
      await markReportFixed(report.id, afterFile, {
        uid: user.uid,
        displayName: user.displayName,
      });
      router.push(`/report/${report.id}`);
    } catch (err) {
      console.error(err);
      setError('Could not mark as fixed. Try again.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-white/60">
        Loading report…
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{ background: 'var(--bg)', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)' }}
        >
          <div className="text-3xl mb-2">😕</div>
          <h2 className="font-display text-xl mb-2">Report not found.</h2>
          <p className="text-sm ink-3 mb-5">It may have been deleted.</p>
          <Link href="/account/owner" className="btn btn-primary">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const idShort = report.id.slice(0, 6).toUpperCase();

  return (
    <div style={{ background: 'rgba(10,10,10,0.7)', minHeight: '100vh' }}>
      {/* Blurred backdrop of the before photo */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `url('${report.beforePhotoUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(20px) brightness(0.3)',
        }}
      />

      <div className="min-h-screen flex items-center justify-center p-4 sm:p-8">
        <div
          className="w-full max-w-2xl rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg)', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)' }}
        >

          {/* Header */}
          <header className="px-7 py-5 flex items-center justify-between gap-4 border-b border-[#EAE6DA]">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.svg" alt="" width={28} height={28} />
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: '#E94E1B' }}>
                  Owner action
                </div>
                <div className="font-display text-base leading-tight mt-0.5">Mark as fixed</div>
              </div>
            </div>
            <DynamicLink
              href={`/report/${report.id}/`}
              className="w-9 h-9 rounded-full bg-[#F2EFE7] hover:bg-[#EAE6DA] flex items-center justify-center"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </DynamicLink>
          </header>

          {/* Report context */}
          <div className="px-7 py-5 flex items-center gap-4 border-b border-[#EAE6DA] bg-[#F2EFE7]/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.beforePhotoUrl}
              alt=""
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="status status-broken">Approved · Awaiting fix</span>
                <span className="text-xs ink-3 font-mono">#{idShort}</span>
              </div>
              <div className="font-display text-lg leading-tight truncate">{report.title}</div>
              <div className="text-xs ink-3 truncate">
                {report.address}
                {report.createdByDisplayName ? ` · Reported by ${report.createdByDisplayName}` : ''}
                {' · '}
                {relativeTime(report.createdAt)}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-7 py-8">
            <h2 className="font-display text-3xl mb-3 leading-tight">
              Drop the after photo. We&apos;ll do the rest.
            </h2>
            <p className="ink-2 leading-relaxed mb-7">
              Upload one photo of the finished fix — painted with the flower 🌼 — and we&apos;ll mark this report fixed and publish the before/after publicly.
            </p>

            {/* Photo grid */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="eyebrow mb-2">Before · existing</div>
                <div className="ba-frame rounded-xl aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.beforePhotoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <span className="ba-tag">Locked</span>
                </div>
              </div>
              <div>
                <div className="eyebrow mb-2" style={{ color: '#166534' }}>
                  After · upload now
                </div>
                <label
                  htmlFor="after"
                  className="relative block w-full aspect-square rounded-xl border-2 border-dashed border-[#86EFAC] bg-[#DCFCE7]/30 cursor-pointer overflow-hidden group hover:border-[#166534] transition-colors"
                >
                  {afterPreview && (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${afterPreview}')` }}
                    ></div>
                  )}
                  {!afterPreview && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                        <span className="text-xl">🌼</span>
                      </div>
                      <div className="font-display text-base mb-1">Tap to add after photo</div>
                      <div className="text-xs ink-3">camera or library</div>
                    </div>
                  )}
                </label>
                <input
                  id="after"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleAfterChange}
                />
              </div>
            </div>

            {/* Optional notes */}
            <div className="mt-7">
              <label className="field-label" htmlFor="notes">
                Optional note <span className="ink-4 normal-case font-normal">visible publicly with the fix</span>
              </label>
              <textarea
                id="notes"
                rows={2}
                className="input"
                placeholder="e.g. 'Patched, sealed, painted with the flower. Smooth ride.'"
                maxLength={280}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="text-xs ink-4 mt-2">
                Note: for MVP this is stored locally only. Future versions will append to the report.
              </p>
            </div>

            {/* Confirm banner */}
            <div className="banner banner-success mt-7">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <div className="font-semibold mb-1">When you confirm:</div>
                <ul className="text-sm leading-relaxed space-y-0.5 list-disc list-inside marker:text-[#166534]">
                  <li>Status flips from <b>Approved</b> → <b>Fixed</b></li>
                  <li>The before/after goes live on /feed and /map</li>
                  {report.createdByDisplayName && (
                    <li>{report.createdByDisplayName} gets credited as the reporter</li>
                  )}
                </ul>
              </div>
            </div>

            {error && (
              <div
                className="banner mt-5"
                style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}
              >
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <footer className="px-7 py-5 flex items-center justify-between gap-3 border-t border-[#EAE6DA] bg-[#F2EFE7]/40">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn btn-quiet"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || !afterFile}
              className="btn btn-accent btn-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {!submitting && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {submitting ? 'Publishing…' : 'Confirm fix & publish'}
            </button>
          </footer>
        </div>
      </div>
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
  if (diffDay === 1) return '1d ago';
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWk = Math.floor(diffDay / 7);
  if (diffWk < 4) return `${diffWk}w ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}
