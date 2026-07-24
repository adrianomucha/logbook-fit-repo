/**
 * Twitter/X reads its own meta tags rather than falling back to og:image on
 * every surface, so the card is served from the same renderer as the Open
 * Graph image instead of being duplicated.
 */
export { runtime, alt, size, contentType, default } from './opengraph-image';
