/**
 * DynamicLink — for routes whose path isn't known at build time.
 *
 * Why this exists: with Next.js static export, dynamic routes like
 * `/report/[id]` are prerendered ONCE at the placeholder path `/report/_/`.
 * The real `/report/abc123/` only resolves at runtime via a Firebase rewrite
 * that serves the underscore HTML.
 *
 * Next.js's `<Link>` tries a soft client-side navigation first — it asks
 * for the route's RSC payload, gets a 404 (because abc123 isn't a known
 * static page), and shows an error before falling back to a full reload.
 *
 * `<a>` does a full page navigation. Firebase Hosting handles the rewrite
 * cleanly, the underscore HTML loads, and `useParams()` reads the real id.
 *
 * Use this wrapper anywhere you'd link to a dynamic route:
 *   - /report/{id}
 *   - /profile/{uid}
 *   - /account/mark-fixed/{id}
 *
 * For routes that exist statically (/feed, /map, /account, etc.), keep using
 * <Link> — those are fine with soft navigation.
 */

'use client';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';

export default function DynamicLink(
  props: AnchorHTMLAttributes<HTMLAnchorElement>,
) {
  const { onClick, href, ...rest } = props;
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    // eslint-disable-next-line no-console
    console.log('[FIXATL] DynamicLink click', { href, target: e.currentTarget.tagName });
    if (onClick) onClick(e);
    // If we're already going to do a full nav (default <a> behavior),
    // belt-and-suspenders: explicitly cancel any SPA interception and force
    // a hard navigation via window.location.
    if (!e.defaultPrevented && href && typeof href === 'string') {
      e.preventDefault();
      // eslint-disable-next-line no-console
      console.log('[FIXATL] DynamicLink → window.location.href =', href);
      window.location.href = href;
    }
  }
  return <a href={href} onClick={handleClick} {...rest} />;
}
