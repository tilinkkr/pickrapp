// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * On Windows, Metro watches every folder separately (one OS handle each).
 * This project's node_modules has ~7,000 folders, close to Node's ~8,000
 * handle limit, so a busy bundle crashes the dev server with
 * "EMFILE: too many open files". These folders hold native code, tests, docs
 * and Node-only build tooling that the app bundle never imports, so Metro can
 * skip them: it then neither watches nor resolves anything inside them.
 */
const NOT_BUNDLED = new RegExp(
  [
    // Native sources and docs at a package's root.
    String.raw`[\\/]node_modules[\\/](?:@[^\\/]+[\\/])?[^\\/]+[\\/](?:android|ios|apple|cpp|jni|windows|macos|ReactAndroid|ReactCommon|ReactApple|sdks|third-party|third-party-podspecs|docs)(?:[\\/]|$)`,
    // Test folders anywhere inside a package.
    String.raw`[\\/]node_modules[\\/].*[\\/]__(?:tests|mocks|fixtures)__(?:[\\/]|$)`,
    // Build-time tooling that only runs in Node. (Not @expo/cli: web rendering bundles a file from it.)
    String.raw`[\\/]node_modules[\\/](?:eslint[^\\/]*|@eslint[^\\/]*|@typescript-eslint|typescript|@react-native[\\/](?:debugger-frontend|codegen|community-cli-plugin)|@expo[\\/](?:prebuild-config|devcert|ngrok[^\\/]*)|jest[^\\/]*|@jest|es-abstract)(?:[\\/]|$)`,
  ].join('|')
);

config.resolver.blockList = [config.resolver.blockList ?? [], NOT_BUNDLED].flat();

// Fewer transform workers means fewer files open at once: slower first bundle, but it
// stops the EMFILE crash that took the tunnel down (gateway timeout) on 2026-11-14.
config.maxWorkers = 2;

module.exports = config;
