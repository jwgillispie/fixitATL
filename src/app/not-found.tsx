/**
 * App Router's special not-found page — rendered when notFound() is called
 * or when a route doesn't exist. Server component (no hooks needed).
 *
 * Translates mockups/404.html — keeps the hexagon SVG inline as-is.
 */

import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <Navigation />

      <main className="flex-1 flex items-center">
        <div className="container py-20">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="section-label mb-5">404 · Not found</div>
              <h1 className="font-display-hero text-6xl sm:text-7xl lg:text-8xl mb-6 leading-[0.9]">
                We can&apos;t fix<br />
                what we can&apos;t<br />
                <span style={{ color: '#E94E1B' }}>find.</span>
              </h1>
              <p className="text-xl ink-2 max-w-xl leading-relaxed mb-10">
                That report or profile doesn&apos;t exist — maybe it got deleted, or the link&apos;s wrong. Either way, you&apos;re in the right neighborhood.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/feed" className="btn btn-primary btn-lg">
                  Go to the feed
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
                <Link href="/map" className="btn btn-ghost btn-lg">Open the map</Link>
                <Link href="/submit" className="btn btn-ghost btn-lg">Report something</Link>
              </div>

              <div className="mt-12 pt-8 hairline">
                <div className="eyebrow mb-3">If you arrived from a link…</div>
                <p className="text-sm ink-3 max-w-lg leading-relaxed">
                  Double-check the URL — report IDs and profile usernames are case-sensitive. Or message us on{' '}
                  <a
                    href="https://instagram.com/fix_atl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 text-black font-semibold"
                  >
                    @fix_atl
                  </a>{' '}
                  and we&apos;ll dig it up.
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center">
              <div className="relative">
                {/* Big hexagon — verbatim from mockup */}
                <svg className="w-64 h-64 sm:w-80 sm:h-80 opacity-90" viewBox="0 0 100 100">
                  <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="#0A0A0A" strokeWidth="0.7" />
                  <polygon points="50,11 84,30.5 84,69.5 50,89 16,69.5 16,30.5" fill="none" stroke="#E94E1B" strokeWidth="0.5" strokeDasharray="2,2" />
                  <text x="50" y="58" fontFamily="Inter Tight" fontSize="22" fontWeight="900" fill="#0A0A0A" textAnchor="middle" letterSpacing="-0.04em">404</text>
                  <text x="50" y="72" fontFamily="Inter" fontSize="5" fontWeight="700" fill="#6B6B66" textAnchor="middle" letterSpacing="0.3em">NOT FOUND</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
