const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow importing .wasm assets (required by expo-sqlite web worker)
config.resolver.assetExts.push('wasm');

// Enable COEP/CORP headers so the SQLite WASM worker can run on web
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    middleware(req, res, next);
  };
};

module.exports = config;
