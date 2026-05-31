'use client';

/**
 * Map page — full-screen Google Map with floating filter card and detail panel.
 *
 * Subscribes to the public feed (approved + fixed) and renders each report as
 * a colored circle marker. Tapping a marker slides in the detail panel.
 *
 * If NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set, renders a friendly fallback
 * so the build doesn't crash. See FIXATL_WEEK_PLAN.md Day 2 watch-outs.
 */

import Link from 'next/link';
import Image from 'next/image';
import DynamicLink from '@/components/DynamicLink';
import { useEffect, useMemo, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import Navigation from '@/components/Navigation';
import { subscribeFeed } from '@/lib/services/reports';
import {
  REPORT_CATEGORIES,
  REPORT_CATEGORY_LABELS,
  type ReportCategory,
  type ReportDoc,
} from '@/types/report';
import { ATLANTA_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';

type StatusFilter = 'all' | 'broken' | 'fixed';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const KEY_PLACEHOLDER = 'REPLACE_ME_BEFORE_DAY_4';
const HAS_KEY = !!MAPS_KEY && MAPS_KEY !== KEY_PLACEHOLDER;

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
// Must match LocationPicker's libraries exactly so useJsApiLoader dedupes.
const LIBRARIES: 'places'[] = ['places'];

export default function MapPage() {
  // Use useJsApiLoader (NOT <LoadScript>) — both the map and LocationPicker
  // share this loader via the same `id` so the script tag is created once.
  // Mixing component + hook loaders causes "google api is already presented"
  // crashes when navigating between /map and /submit.
  const { isLoaded: mapsLoaded, loadError: mapsError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: MAPS_KEY ?? '',
    libraries: LIBRARIES,
  });

  const [reports, setReports] = useState<ReportDoc[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all');
  const [selected, setSelected] = useState<ReportDoc | null>(null);

  useEffect(() => {
    const unsub = subscribeFeed(
      { statuses: ['approved', 'fixed'], pageSize: 200 },
      setReports,
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter === 'broken' && r.status !== 'approved') return false;
      if (statusFilter === 'fixed' && r.status !== 'fixed') return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      return true;
    });
  }, [reports, statusFilter, categoryFilter]);

  const brokenCount = reports.filter((r) => r.status === 'approved').length;
  const fixedCount = reports.filter((r) => r.status === 'fixed').length;

  return (
    <div className="overflow-hidden">
      <Navigation active="map" />

      <div className="relative" style={{ height: 'calc(100vh - 72px)' }}>
        {!HAS_KEY ? (
          <MapKeyMissingFallback />
        ) : mapsError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F2EFE7]">
            <div className="card max-w-md p-8 text-center">
              <p className="font-display text-xl mb-2">Map failed to load.</p>
              <p className="text-sm ink-3">Check your network and refresh.</p>
            </div>
          </div>
        ) : !mapsLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F2EFE7] text-sm ink-3">
            Loading map…
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={ATLANTA_CENTER}
            zoom={DEFAULT_MAP_ZOOM}
            options={{
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
              clickableIcons: false,
            }}
          >
            {filtered.map((r) => (
              <MapMarker
                key={r.id}
                report={r}
                onClick={() => setSelected(r)}
              />
            ))}
          </GoogleMap>
        )}

        {/* Floating filter card (top-left) */}
        <FilterCard
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          totalCount={reports.length}
          brokenCount={brokenCount}
          fixedCount={fixedCount}
        />

        {/* Legend bottom-left */}
        <div className="absolute bottom-6 left-6 z-30 bg-white rounded-full shadow-md border border-[#EAE6DA] py-2 px-4 flex items-center gap-5 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#991B1B] border-2 border-white shadow-sm"></span>
            Needs fixing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#166534] border-2 border-white shadow-sm"></span>
            Fixed
          </span>
        </div>

        {/* Detail panel (right side) */}
        {selected && (
          <DetailPanel report={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}

function MapMarker({
  report,
  onClick,
}: {
  report: ReportDoc;
  onClick: () => void;
}) {
  // Defer the SymbolPath access until the API has loaded.
  // google.maps is a window-scoped global that LoadScript populates.
  const isFixed = report.status === 'fixed';
  const fillColor = isFixed ? '#166534' : '#991B1B';

  // Guard: `google` may not be defined during SSR / before script loads.
  const icon =
    typeof google !== 'undefined' && google.maps
      ? {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 10,
        }
      : undefined;

  return (
    <Marker
      position={{ lat: report.latitude, lng: report.longitude }}
      icon={icon}
      onClick={onClick}
    />
  );
}

function FilterCard({
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  totalCount,
  brokenCount,
  fixedCount,
}: {
  statusFilter: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
  categoryFilter: ReportCategory | 'all';
  onCategoryChange: (c: ReportCategory | 'all') => void;
  totalCount: number;
  brokenCount: number;
  fixedCount: number;
}) {
  return (
    <div className="absolute top-6 left-6 z-30 bg-white rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.18)] border border-[#EAE6DA] p-5 w-80 max-w-[calc(100vw-3rem)]">
      <div className="section-label mb-3">Hazard map</div>
      <h2 className="font-display text-2xl mb-4 leading-tight">Atlanta, live.</h2>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <button
          type="button"
          onClick={() => onStatusChange('all')}
          className={`filter ${statusFilter === 'all' ? 'active' : ''}`}
        >
          All <span className="count">{totalCount}</span>
        </button>
        <button
          type="button"
          onClick={() => onStatusChange('broken')}
          className={`filter ${statusFilter === 'broken' ? 'active' : ''}`}
        >
          <span className="dot bg-[#991B1B]"></span> Broken
        </button>
        <button
          type="button"
          onClick={() => onStatusChange('fixed')}
          className={`filter ${statusFilter === 'fixed' ? 'active' : ''}`}
        >
          <span className="dot bg-[#166534]"></span> Fixed
        </button>
      </div>

      <div>
        <label htmlFor="map-category" className="sr-only">
          Filter by category
        </label>
        <select
          id="map-category"
          value={categoryFilter}
          onChange={(e) =>
            onCategoryChange(e.target.value as ReportCategory | 'all')
          }
          className="input h-10 text-sm"
        >
          <option value="all">All categories</option>
          {REPORT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {REPORT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 pt-4 hairline grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="ink-3 uppercase tracking-wider font-semibold mb-1">
            Broken
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#991B1B]"></span>
            <span className="font-display text-lg">{brokenCount}</span>
          </div>
        </div>
        <div>
          <div className="ink-3 uppercase tracking-wider font-semibold mb-1">
            Fixed
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#166534]"></span>
            <span className="font-display text-lg">{fixedCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  report,
  onClose,
}: {
  report: ReportDoc;
  onClose: () => void;
}) {
  const isFixed = report.status === 'fixed';
  const neighborhood = report.neighborhood ?? '';
  return (
    <div className="absolute top-0 right-0 z-30 h-full w-full sm:w-[440px] bg-white shadow-2xl border-l border-[#EAE6DA] overflow-y-auto">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={report.beforePhotoUrl}
          alt=""
          className="w-full aspect-[8/5] object-cover"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-[#FAFAF7]"
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <span
          className={`absolute top-4 left-4 status-bg ${
            isFixed ? 'status-fixed' : 'status-broken'
          }`}
        >
          {isFixed ? 'Fixed' : 'Needs fixing'}
        </span>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="tag">
            {REPORT_CATEGORY_LABELS[report.category]}
          </span>
          <span className="text-xs ink-3">· {relativeTime(report)}</span>
        </div>
        <h3 className="font-display text-2xl leading-tight mb-2">
          {report.title}
        </h3>
        {report.description && (
          <p className="text-sm ink-2 leading-relaxed">{report.description}</p>
        )}

        <div className="mt-5 pt-5 hairline">
          <div className="eyebrow mb-2">Location</div>
          <div className="font-semibold">{report.address}</div>
          <div className="text-sm ink-3">
            {neighborhood ? `${neighborhood} · ` : ''}
            {report.city}, {report.state}
          </div>
        </div>

        <div className="mt-5 pt-5 hairline">
          <div className="eyebrow mb-3">Reported by</div>
          <div className="flex items-center gap-3">
            <div
              className="avatar w-10 h-10"
              style={{
                background: 'linear-gradient(135deg, #C084FC, #818CF8)',
              }}
            />
            <div>
              <div className="font-semibold text-sm">
                {report.createdByDisplayName}
              </div>
              {report.createdAt && (
                <div className="text-xs ink-3">{relativeTime(report)}</div>
              )}
            </div>
          </div>
        </div>

        <DynamicLink
          href={`/report/${report.id}/`}
          className="btn btn-primary btn-block btn-lg mt-6"
        >
          View full report
        </DynamicLink>
      </div>
    </div>
  );
}

function MapKeyMissingFallback() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-6"
      style={{ background: '#E8E3D5' }}
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.18)] border border-[#EAE6DA] p-8 text-center">
        <Image
          src="/logo.svg"
          alt=""
          width={48}
          height={48}
          className="mx-auto mb-4"
        />
        <div className="section-label justify-center mb-3">Map setup</div>
        <h2 className="font-display text-2xl mb-3 leading-tight">
          Map key not set yet.
        </h2>
        <p className="text-sm ink-2 leading-relaxed">
          Add{' '}
          <code className="font-mono text-xs bg-[#F2EFE7] px-1.5 py-0.5 rounded">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{' '}
          to{' '}
          <code className="font-mono text-xs bg-[#F2EFE7] px-1.5 py-0.5 rounded">
            .env.local
          </code>{' '}
          to enable. See{' '}
          <span className="font-mono text-xs">FIXATL_WEEK_PLAN.md</span> Day 2
          watch-outs.
        </p>
      </div>
    </div>
  );
}

function relativeTime(r: ReportDoc): string {
  const ts = r.createdAt as ReportDoc['createdAt'] | null;
  if (!ts || typeof ts.toDate !== 'function') return '';
  const then = ts.toDate().getTime();
  const diffMs = Date.now() - then;
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 1) return `${day} day${day === 1 ? '' : 's'} ago`;
  if (hr >= 1) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  if (min >= 1) return `${min} min ago`;
  return 'just now';
}
