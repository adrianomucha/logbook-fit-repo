/**
 * Twitter/X reads its own meta tags rather than falling back to og:image on
 * every surface, so the card is served from the same renderer as the Open
 * Graph image instead of being duplicated.
 *
 * `runtime` is declared here rather than re-exported: Next.js reads route
 * segment config statically and can't follow it through a re-export (it warns
 * and silently falls back to the default).
 */
export const runtime = 'nodejs';

export { alt, size, contentType, default } from './opengraph-image';
