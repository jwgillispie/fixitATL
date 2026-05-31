'use client';

/**
 * Submit page — translated from mockups/submit.html.
 *
 * Signed-in members submit a new "broken thing" report:
 *   - Photo (required, captured or chosen from library)
 *   - Title (1–80 chars, required)
 *   - Category (required, default 'pothole')
 *   - Location (required, picked via Google Places autocomplete)
 *   - Description (optional, max 500 chars)
 *
 * On success, redirect to /account?submitted=1 — the account page
 * reads that query param and shows a success banner.
 *
 * Image compression happens inside submitReport — don't double-compress.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import LocationPicker, { type PlaceDetails } from '@/components/shared/LocationPicker';
import { useAuthContext } from '@/contexts/AuthContext';
import { submitReport } from '@/lib/services/reports';
import {
  REPORT_CATEGORIES,
  REPORT_CATEGORY_EMOJI,
  REPORT_CATEGORY_LABELS,
  type ReportCategory,
} from '@/types/report';

export default function SubmitPage() {
  return (
    <AuthGuard>
      <SubmitInner />
    </AuthGuard>
  );
}

function SubmitInner() {
  const router = useRouter();
  const { fbUser, user } = useAuthContext();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory>('pothole');
  const [location, setLocation] = useState<PlaceDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrlRef = useRef<string | null>(null);

  // Clean up the object URL when the component unmounts or photo changes.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (file) {
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  }

  const canSubmit =
    !!photoFile && title.trim().length >= 1 && !!location && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!photoFile) {
      setError('Please add a photo of what\'s broken.');
      return;
    }
    if (title.trim().length < 1) {
      setError('Give your report a short title.');
      return;
    }
    if (!location) {
      setError('Pick a location from the suggestions.');
      return;
    }
    if (!fbUser || !user) {
      setError('You need to be signed in to submit a report.');
      return;
    }

    setSubmitting(true);
    try {
      await submitReport({
        beforeFile: photoFile,
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
          uid: fbUser.uid,
          displayName: user.displayName,
          photoUrl: user.photoUrl,
        },
      });
      router.push('/account?submitted=1');
    } catch (err) {
      console.error('submitReport failed', err);
      setError(
        'Something went wrong saving your report. Check your connection and try again.',
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation active="submit" />

      <main className="container-narrow py-12 sm:py-16 flex-1">
        <div className="mb-10">
          <Link
            href="/feed"
            className="text-sm ink-3 hover:text-black inline-flex items-center gap-1.5 mb-6"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to feed
          </Link>
          <div className="section-label mb-3">New report</div>
          <h1 className="font-display-hero text-5xl sm:text-6xl mb-4 leading-[0.95]">
            Spot something<br />broken?
          </h1>
          <p className="text-lg ink-2 max-w-xl">
            Pin it, snap it, send it. We&apos;ll review and add it to the fix queue — usually within 24 hours.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-10 bg-white p-8 sm:p-10 rounded-2xl border border-[#EAE6DA]"
        >
          {/* Photo */}
          <div>
            <label className="field-label" htmlFor="photo">
              Photo of what&apos;s broken{' '}
              <span className="text-[#991B1B] normal-case">required</span>
            </label>
            <label
              htmlFor="photo"
              className="relative block w-full aspect-[4/3] rounded-xl border-2 border-dashed border-[#D6D2C4] bg-[#FAFAF7] cursor-pointer overflow-hidden group hover:border-[#0A0A0A] transition-colors"
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={photoPreview ? { backgroundImage: `url('${photoPreview}')` } : undefined}
              />
              {!photoPreview && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-14 h-14 rounded-full bg-white border border-[#EAE6DA] shadow-sm flex items-center justify-center mb-4">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E94E1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                  </div>
                  <div className="font-display text-lg mb-1">Tap to take a photo</div>
                  <div className="text-sm ink-3">or choose one from your library</div>
                </div>
              )}
              {photoPreview && (
                <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-xs font-semibold">
                  Tap to change
                </div>
              )}
            </label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <p className="text-xs ink-3 mt-2">JPG or PNG, up to 5MB. We compress automatically.</p>
          </div>

          {/* Title */}
          <div>
            <label className="field-label" htmlFor="title">
              What&apos;s the issue?{' '}
              <span className="text-[#991B1B] normal-case">required</span>
            </label>
            <input
              id="title"
              type="text"
              className="input"
              placeholder="e.g. Missing drain cover on Boulevard"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-xs ink-3 mt-2 font-mono">{title.length} / 80</p>
          </div>

          {/* Category */}
          <div>
            <label className="field-label">
              Category <span className="text-[#991B1B] normal-case">required</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {REPORT_CATEGORIES.map((cat) => {
                const isLast = cat === 'other';
                const isSelected = category === cat;
                return (
                  <label
                    key={cat}
                    className={`cat-pill ${isLast ? 'col-span-2' : ''}`}
                  >
                    <input
                      type="radio"
                      name="cat"
                      checked={isSelected}
                      onChange={() => setCategory(cat)}
                    />
                    <div>
                      {REPORT_CATEGORY_EMOJI[cat]} {REPORT_CATEGORY_LABELS[cat]}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="field-label">
              Where is it? <span className="text-[#991B1B] normal-case">required</span>
            </label>
            <LocationPicker
              onLocationSelected={setLocation}
              placeholder="Search any address in Atlanta..."
            />
            {location ? (
              <p className="text-xs mt-2 font-mono" style={{ color: '#166534' }}>
                ✓ {location.address}
              </p>
            ) : (
              <p className="text-xs ink-3 mt-2">Powered by Google Places · biased to Atlanta metro</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="field-label" htmlFor="desc">
              More details <span className="ink-4 normal-case font-normal">optional</span>
            </label>
            <textarea
              id="desc"
              rows={3}
              className="input"
              placeholder="Anything that helps us find it or understand what's needed..."
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs ink-3 mt-2 font-mono">{description.length} / 500</p>
          </div>

          {/* Info banner */}
          <div className="banner banner-info">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <div className="font-semibold mb-1">What happens next</div>
              <p>The Fix-ATL team reviews every report. Once approved (usually within 24 hours), it goes live on the public feed and map. You&apos;ll see updates in your account.</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="banner" style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="text-sm">{error}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
            <Link href="/feed" className="btn btn-ghost justify-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-accent btn-lg justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>Submitting…</>
              ) : (
                <>
                  Submit report
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
