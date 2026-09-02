const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// The app lives inside the Logbook monorepo and consumes @logbook/shared as
// TypeScript source through a symlink (node_modules/@logbook/shared →
// ../packages/shared). Metro has to watch that folder, and gets the repo
// root's node_modules as a fallback so the shared code's own imports (zod,
// date-fns) resolve. Hierarchical lookup stays on: Expo nests some of its
// own dependencies under node_modules/expo/node_modules.
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [path.resolve(monorepoRoot, 'packages/shared')];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
