'use client';

/**
 * Owner direct post — light-mode version.
 *
 * Two photo uploaders (before required, after optional). If after is provided,
 * status='fixed'; otherwise status='approved'. The live status preview banner
 * recalculates as the after photo is added/removed.
 */

import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import OwnerGuard from '@/components/auth/OwnerGuard';
import LocationPicker, { type PlaceDetails } from '@/components/shared/LocationPicker';
import { useAuthContext } from '@/contexts/AuthContext';
import { ownerCreateReport } from '@/lib/services/reports';
import {
  REPORT_CATEGORIES,
  REPORT_CATEGORY_EMOJI,
  REPORT_CATEGORY_LABELS,
  type ReportCategory,
} from '@/types/report';

export default function PostFixPage() {
  return (
    <OwnerGuard>
      <PostFixInner />
    </OwnerGuard>
  );
}

function PostFixInner() {
  const router = useRouter();
  const { user } = useAuthContext();

  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ReportCategory>('drain_cover');
  const [location, setLocation] = useState<PlaceDetails | null>(null);
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (beforePreview) URL.revokeObjectURL(beforePreview);
      if (afterPreview) URL.revokeObjectURL(afterPreview);
    };
  }, [beforePreview, afterPreview]);

  function handleBeforeChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (beforePreview) URL.revokeObjectURL(beforePreview);
    setBeforeFile(file);
    setBeforePreview(file ? URL.createObjectURL(file) : null);
  }

  function handleAfterChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (afterPreview) URL.revokeObjectURL(afterPreview);
    setAfterFile(file);
    setAfterPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!beforeFile) { setError('Add a before photo to continue.'); return; }
    if (!title.trim()) { setError('Add a title.'); return; }
    if (!location) { setError('Pick a location from the dropdown.'); return; }
    if (!user) { setError('You need to be signed in.'); return; }

    setSubmitting(true);
    try {
      await ownerCreateReport({
        beforeFile,
        afterFile,
        title: title.trim(),
        description: description.trim(),
        category,
        location: {
          address: location.address,
          neighborhood: location.neighborhood,
          city: location.city,
          state: location.state,
          zipCode: location.zipCode,
          latitude: location.latitude,
          longitude: location.longitude,
          placeId: location.placeId,
        },
        user: {
          uid: user.uid,
          displayName: user.displayName,
          photoUrl: user.photoUrl,
        },
      });
      router.push('/account/owner');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  const willPublishAs = afterFile ? 'fixed' : 'approved';

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation active="post" />

      <main className="container-narrow py-10 sm:py-14 flex-1">
        <Link
          href="/account/owner"
          className="text-sm ink-3 hover:text-black inline-flex items-center gap-1.5 mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Owner dashboard
        </Link>

        <div className="section-label mb-3" style={{ color: '#E94E1B' }}>Owner-only · Direct post</div>
        <h1 className="font-display-hero text-[44px] sm:text-6xl mb-4 leading-[0.95]">
          Post a fix{' '}
          <span style={{ color: '#E94E1B' }}>directly.</span>
        </h1>
        <p className="text-base ink-2 max-w-xl mb-10">
          Skip the approval queue — upload a before+after for something you&apos;ve already fixed in the field.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-10 rounded-2xl border border-[#EAE6DA] bg-white p-8 sm:p-10"
        >

          {/* Two photos */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">
                Before <span style={{ color: '#991B1B' }} className="normal-case">required</span>
              </label>
              <label
                htmlFor="before"
                className="relative block w-full aspect-square rounded-xl border-2 border-dashed border-[#D6D2C4] bg-[#FAFAF7] cursor-pointer overflow-hidden group hover:border-[#0A0A0A] transition-colors"
              >
                {beforePreview && (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${beforePreview}')` }}
                  ></div>
                )}
                {!beforePreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 rounded-full bg-white border border-[#EAE6DA] shadow-sm flex items-center justify-center mb-3">
                      <span className="text-xl">📷</span>
                    </div>
                    <div className="font-display text-base">Add before photo</div>
                  </div>
                )}
              </label>
              <input id="before" type="file" accept="image/*" className="hidden" onChange={handleBeforeChange} />
            </div>
            <div>
              <label className="field-label">
                After <span className="ink-4 normal-case font-normal">leave blank to post as &quot;needs fixing&quot;</span>
              </label>
              <label
                htmlFor="after"
                className="relative block w-full aspect-square rounded-xl border-2 border-dashed cursor-pointer overflow-hidden group transition-colors"
                style={{ borderColor: '#86EFAC', background: '#F0FDF4' }}
              >
                {afterPreview && (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${afterPreview}')` }}
                  ></div>
                )}
                {!afterPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 rounded-full bg-white border border-[#EAE6DA] shadow-sm flex items-center justify-center mb-3">
                      <span className="text-xl">🌼</span>
                    </div>
                    <div className="font-display text-base">Add after photo</div>
                  </div>
                )}
              </label>
              <input id="after" type="file" accept="image/*" className="hidden" onChange={handleAfterChange} />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="field-label" htmlFor="title">
              Title <span style={{ color: '#991B1B' }} className="normal-case">required</span>
            </label>
            <input
              id="title"
              type="text"
              className="input"
              placeholder="e.g. Repainted drain cover on Memorial Dr"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <label className="field-label">
              Category <span style={{ color: '#991B1B' }} className="normal-case">required</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {REPORT_CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-3 rounded-lg text-sm text-center transition-colors border ${
                      active
                        ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] font-semibold'
                        : 'bg-white text-[#0A0A0A] border-[#D6D2C4] hover:border-[#0A0A0A]'
                    }`}
                  >
                    {REPORT_CATEGORY_EMOJI[cat]} {REPORT_CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="field-label">
              Location <span style={{ color: '#991B1B' }} className="normal-case">required</span>
            </label>
            <LocationPicker
              onLocationSelected={setLocation}
              placeholder="Search any address in Atlanta..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="field-label" htmlFor="desc">
              Story <span className="ink-4 normal-case font-normal">optional but encouraged</span>
            </label>
            <textarea
              id="desc"
              rows={3}
              className="input"
              placeholder="The story behind the fix. People love the context."
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Status preview */}
          <div className="banner banner-info">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div className="text-sm">
              <div className="font-semibold mb-1">This will publish immediately as:</div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {willPublishAs === 'fixed' ? (
                  <>
                    <span className="status status-fixed">Fixed</span>
                    <span>— because you uploaded both photos. Remove the after photo to post as &quot;Needs fixing&quot;.</span>
                  </>
                ) : (
                  <>
                    <span className="status status-broken">Needs fixing</span>
                    <span>— add an after photo to publish as Fixed instead.</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="banner" style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
            <Link href="/account/owner" className="btn btn-ghost justify-center">Cancel</Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-accent btn-lg justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Publishing…' : 'Publish fix'}
              {!submitting && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
