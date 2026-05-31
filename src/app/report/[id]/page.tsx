/**
 * Report detail server-component wrapper.
 *
 * Because we're statically exporting (`output: 'export'`), every dynamic
 * route MUST export `generateStaticParams`. We can't enumerate every report
 * id at build time, so we use the underscore trick: emit a single placeholder
 * `_` route and let the client component hydrate from the URL via useParams.
 *
 * Do NOT add `'use client'` here. The real page lives in ClientPage.tsx.
 */

import ClientPage from './ClientPage';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function Page() {
  return <ClientPage />;
}
