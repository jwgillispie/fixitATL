/**
 * /profile/[uid] — server-component wrapper for static export.
 *
 * Returns a single placeholder param ('_') so Next can satisfy the dynamic
 * route at build time. The real uid is read client-side from useParams in
 * ClientPage. See _AGENT_CONTEXT.md → "dynamic routes — underscore trick".
 */

import ClientPage from './ClientPage';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ uid: '_' }];
}

export default function Page() {
  return <ClientPage />;
}
