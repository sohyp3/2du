// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');
// Zustand 4's ESM build uses import.meta, which Metro's script bundle cannot run.
config.resolver.resolveRequest = (context, name, platform) =>
  context.resolveRequest(
    name === 'zustand' || name.startsWith('zustand/')
      ? { ...context, unstable_enablePackageExports: false }
      : context,
    name,
    platform
  );
const previousEnhancer = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const handler = previousEnhancer ? previousEnhancer(middleware, server) : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return handler(req, res, next);
  };
};

module.exports = withNativeWind(config, { input: './global.css' });
