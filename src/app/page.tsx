'use client';

/**
 * Landing page — translated from mockups/landing.html.
 *
 * Data:
 *   - "Recently fixed" strip + "Featured fix" pull from subscribeFeed({ statuses: ['fixed'] }, ...).
 *   - Stats band numbers are hardcoded for now (will be wired up later).
 *   - Everything else is static copy from the mockup.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DynamicLink from '@/components/DynamicLink';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { subscribeFeed } from '@/lib/services/reports';
import { REPORT_CATEGORY_LABELS } from '@/types/report';
import type { ReportDoc } from '@/types/report';

export default function HomePage() {
  const [recentFixes, setRecentFixes] = useState<ReportDoc[]>([]);

  useEffect(() => {
    const unsub = subscribeFeed({ statuses: ['fixed'], pageSize: 3 }, setRecentFixes);
    return unsub;
  }, []);

  const featured = recentFixes[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* HERO */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        {/* subtle bg decoration */}
        <div className="absolute top-0 right-0 -z-10 w-1/2 h-full">
          <svg className="absolute top-20 right-10 w-[600px] h-[600px] opacity-[0.04]" viewBox="0 0 100 100">
            <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="#0A0A0A" />
          </svg>
        </div>

        <div className="container">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">

            {/* Editorial copy */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[#D6D2C4] bg-white text-sm mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E94E1B]"></span>
                <span className="font-medium">68 fixes since launch</span>
                <span className="ink-4">·</span>
                <span className="ink-3">23 in the queue</span>
              </div>

              <h1 className="font-display-hero text-[64px] sm:text-[88px] lg:text-[104px] mb-8">
                We&apos;re fixing<br />
                Atlanta.<br />
                <span style={{ color: '#E94E1B' }}>One missing<br />drain cover<br />at a time.</span>
              </h1>

              <p className="text-xl sm:text-2xl ink-2 max-w-xl leading-relaxed mb-10">
                See a busted lid, a faded sign, a hazard on the street? Snap a pic, drop a pin, and we&apos;ll fix it — then paint it with our flower so the whole city sees.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/submit" className="btn btn-accent btn-lg">
                  Report something broken
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
                <Link href="/feed" className="btn btn-ghost btn-lg">Browse the feed</Link>
              </div>
            </div>

            {/* Hero before/after composite — uses the most recent fixed report
                when one exists. Otherwise renders a clean logo-only stamp card
                so the layout still reads as "before / after" without fake imagery. */}
            <div className="lg:col-span-5 relative">
              <div className="relative max-w-[480px] mx-auto">
                {featured ? (
                  <>
                    {/* Before — real photo */}
                    <div className="ba-frame rounded-2xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] rotate-[-3deg]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={featured.beforePhotoUrl} alt="" className="w-full aspect-square object-cover" />
                      <span className="ba-tag">Before</span>
                    </div>
                    {/* After — real after photo if there is one, else stamp the before */}
                    <div className="absolute top-[55%] -right-4 sm:-right-12 w-[70%] after-frame rounded-2xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(233,78,27,0.4)] rotate-[5deg]" style={{ aspectRatio: '1/1' }}>
                      <div className="photo" style={{ backgroundImage: `url('${featured.afterPhotoUrl ?? featured.beforePhotoUrl}')` }}></div>
                      <div className="wash"></div>
                      <div className="vignette"></div>
                      <div className="stamp"><Image src="/logo.svg" alt="" width={100} height={100} /></div>
                      <span className="ba-tag after">After</span>
                    </div>
                  </>
                ) : (
                  /* No fixes yet — show a stamp-only "what a fix looks like" card */
                  <div className="after-frame rounded-2xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(233,78,27,0.4)] aspect-square mx-auto">
                    <div className="wash" style={{ opacity: 1 }}></div>
                    <div className="vignette"></div>
                    <div className="stamp"><Image src="/logo.svg" alt="" width={200} height={200} /></div>
                    <span className="ba-tag after">Painted with the flower</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section
        className="py-20 sm:py-24 border-y"
        style={{ background: '#F2EFE7', borderColor: '#EAE6DA' }}
      >
        <div className="container">
          <div className="grid sm:grid-cols-4 gap-8 sm:gap-4">
            <div>
              <div className="font-display-hero text-[72px] sm:text-[88px] leading-none">68</div>
              <div className="eyebrow mt-3">Things fixed</div>
            </div>
            <div>
              <div className="font-display-hero text-[72px] sm:text-[88px] leading-none" style={{ color: '#E94E1B' }}>23</div>
              <div className="eyebrow mt-3">In the queue</div>
            </div>
            <div>
              <div className="font-display-hero text-[72px] sm:text-[88px] leading-none">14</div>
              <div className="eyebrow mt-3">Neighborhoods</div>
            </div>
            <div>
              <div className="font-display-hero text-[72px] sm:text-[88px] leading-none">1,750</div>
              <div className="eyebrow mt-3">Reporters</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED FIX (editorial showcase) — only renders when there's a real fix to feature */}
      {featured && (
        <section className="py-24 sm:py-32">
          <div className="container">
            <div className="section-label mb-6">The latest fix</div>

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* big before/after stack */}
              <div className="grid grid-cols-2 gap-3">
                <figure className="ba-frame rounded-xl aspect-[3/4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.beforePhotoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <span className="ba-tag">Before</span>
                </figure>
                <figure className="after-frame rounded-xl aspect-[3/4]">
                  <div className="photo" style={{ backgroundImage: `url('${featured.afterPhotoUrl ?? featured.beforePhotoUrl}')` }}></div>
                  <div className="wash"></div>
                  <div className="vignette"></div>
                  <div className="stamp"><Image src="/logo.svg" alt="" width={100} height={100} /></div>
                  <span className="ba-tag after">After</span>
                </figure>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="status status-fixed">Fixed</span>
                  <span className="ink-4 text-xs">·</span>
                  <span className="tag">{REPORT_CATEGORY_LABELS[featured.category]}</span>
                  {featured.fixedAt && (
                    <>
                      <span className="ink-4 text-xs">·</span>
                      <span className="text-xs ink-3">{formatDate(featured.fixedAt)}</span>
                    </>
                  )}
                </div>
                <h2 className="font-display text-5xl sm:text-6xl leading-[1.05] mb-6">
                  {featured.title}
                </h2>
                <p className="text-lg ink-2 leading-relaxed mb-8 max-w-lg">
                  Reported by{' '}
                  <span className="underline underline-offset-4 font-semibold text-black">
                    @{featured.createdByDisplayName}
                  </span>
                  {featured.neighborhood ? ` in ${featured.neighborhood}` : ''}. Fixed by the Fix-ATL team and painted with the flower.
                </p>
                <DynamicLink href={`/report/${featured.id}/`} className="btn btn-primary btn-lg">
                  Read the full story
                </DynamicLink>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* RECENTLY FIXED */}
      <section className="py-20 sm:py-24 hairline">
        <div className="container">
          <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
            <div>
              <div className="section-label mb-3">Recently fixed</div>
              <h2 className="font-display text-4xl sm:text-5xl">Fresh paint, fresh fixes.</h2>
            </div>
            <Link href="/feed" className="btn-link text-sm">View all fixes →</Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentFixes.length === 0 ? (
              // Placeholder while no fixed reports yet — keeps the layout from collapsing.
              <div className="sm:col-span-2 lg:col-span-3 text-center py-16 ink-3">
                No fixes yet — be the first to spot something broken.
              </div>
            ) : (
              recentFixes.map((report) => (
                <DynamicLink key={report.id} href={`/report/${report.id}/`} className="card card-hover">
                  <div className="grid grid-cols-2 gap-px bg-[#EAE6DA]">
                    <div className="ba-frame aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={report.beforePhotoUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="after-frame aspect-square">
                      <div className="photo" style={{ backgroundImage: `url('${report.beforePhotoUrl}')` }}></div>
                      <div className="wash"></div>
                      <div className="vignette"></div>
                      <div className="stamp"><Image src="/logo.svg" alt="" width={100} height={100} /></div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="status status-fixed">Fixed</span>
                      <span className="tag">{REPORT_CATEGORY_LABELS[report.category]}</span>
                    </div>
                    <h3 className="font-display text-xl leading-tight">{report.title}</h3>
                    <p className="text-sm ink-3 mt-1.5">
                      {report.neighborhood ?? report.city} · {relativeTime(report.fixedAt ?? report.createdAt)}
                    </p>
                  </div>
                </DynamicLink>
              ))
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — editorial three-step */}
      <section className="py-24 sm:py-32">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 mb-16 items-end">
            <div>
              <div className="section-label mb-4">How it works</div>
              <h2 className="font-display text-5xl sm:text-6xl leading-[1.05]">Three steps.<br />That&apos;s the whole thing.</h2>
            </div>
            <p className="text-lg ink-2 leading-relaxed max-w-xl">
              No app to install. No 311 phone tree. Just take a photo, drop a pin, and let us do the field work. We post every fix publicly so you see exactly where your tax-free dollar of effort went.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-[#EAE6DA] border border-[#EAE6DA] rounded-2xl overflow-hidden">
            <div className="bg-[#FAFAF7] p-10">
              <div className="font-mono text-sm font-semibold ink-3 mb-8">01 / SPOT</div>
              <h3 className="font-display text-3xl mb-4 leading-tight">See it.<br />Snap it.</h3>
              <p className="ink-2 leading-relaxed">
                A pothole, a missing lid, a graffiti&apos;d wall. Open Fix-ATL, take a photo, autocomplete the address — done in 30 seconds.
              </p>
            </div>
            <div className="bg-[#FAFAF7] p-10">
              <div className="font-mono text-sm font-semibold ink-3 mb-8">02 / REVIEW</div>
              <h3 className="font-display text-3xl mb-4 leading-tight">We approve<br />&amp; queue it.</h3>
              <p className="ink-2 leading-relaxed">
                The Fix-ATL team reviews every report (usually inside 24 hours). Once approved, it goes on the public map as something we&apos;ll fix.
              </p>
            </div>
            <div className="bg-[#FAFAF7] p-10">
              <div className="font-mono text-sm font-semibold ink-3 mb-8">03 / FIX</div>
              <h3 className="font-display text-3xl mb-4 leading-tight">We go fix it.<br />Then paint it. 🌼</h3>
              <p className="ink-2 leading-relaxed">
                We patch the problem, brand the fix with the Fix-ATL flower, and post the before / after for the whole city to see.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE FIX */}
      <section className="py-20 sm:py-24 hairline">
        <div className="container">
          <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
            <div>
              <div className="section-label mb-3">What we fix</div>
              <h2 className="font-display text-4xl sm:text-5xl">If it&apos;s broken &amp; on the street.</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="card p-6 text-center hover:border-[#0A0A0A] cursor-pointer transition-colors">
              <div className="text-3xl mb-3">🕳️</div>
              <div className="font-display text-sm">Potholes</div>
            </div>
            <div className="card p-6 text-center hover:border-[#0A0A0A] cursor-pointer transition-colors">
              <div className="text-3xl mb-3">⭕</div>
              <div className="font-display text-sm">Drain Covers</div>
            </div>
            <div className="card p-6 text-center hover:border-[#0A0A0A] cursor-pointer transition-colors">
              <div className="text-3xl mb-3">💧</div>
              <div className="font-display text-sm">Water Lids</div>
            </div>
            <div className="card p-6 text-center hover:border-[#0A0A0A] cursor-pointer transition-colors">
              <div className="text-3xl mb-3">🚧</div>
              <div className="font-display text-sm">Sidewalks</div>
            </div>
            <div className="card p-6 text-center hover:border-[#0A0A0A] cursor-pointer transition-colors">
              <div className="text-3xl mb-3">🪧</div>
              <div className="font-display text-sm">Signs</div>
            </div>
            <div className="card p-6 text-center hover:border-[#0A0A0A] cursor-pointer transition-colors">
              <div className="text-3xl mb-3">🖌️</div>
              <div className="font-display text-sm">Graffiti</div>
            </div>
            <div className="card p-6 text-center hover:border-[#0A0A0A] cursor-pointer transition-colors">
              <div className="text-3xl mb-3">❓</div>
              <div className="font-display text-sm">Other</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 pt-16">
        <div className="container">
          <div
            className="rounded-3xl p-12 sm:p-20 relative overflow-hidden border"
            style={{ background: '#FFEFE5', borderColor: '#F5C8AC' }}
          >
            <svg className="absolute -top-20 -right-20 w-[400px] h-[400px] opacity-20" viewBox="0 0 100 100">
              <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="#E94E1B" />
            </svg>
            <div className="relative max-w-3xl">
              <h2 className="font-display-hero text-5xl sm:text-7xl mb-6 leading-[0.95]">
                See something broken<br />
                <span style={{ color: '#E94E1B' }}>right now?</span>
              </h2>
              <p className="text-xl mb-10 max-w-2xl leading-relaxed ink-2">
                30 seconds, one photo, one pin. We take it from there.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/submit" className="btn btn-accent btn-lg">Report it now →</Link>
                <Link href="/map" className="btn btn-ghost btn-lg">See the map</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ----- helpers -----

function formatDate(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  const d = ts.toDate();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
