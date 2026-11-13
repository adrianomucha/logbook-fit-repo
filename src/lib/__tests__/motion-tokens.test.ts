import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cssBezier, EASE } from '@logbook/shared/motion';

// The web reads its curves from CSS variables; the native app reads them from
// @logbook/shared/motion. This keeps the two from drifting apart.
describe('motion tokens', () => {
  const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

  it.each(Object.entries(EASE))('--ease-%s matches the shared curve', (name, curve) => {
    expect(css).toContain(`--ease-${name}: ${cssBezier(curve)};`);
  });
});
