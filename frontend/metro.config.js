const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow importing .wasm assets (required by expo-sqlite web worker)
config.resolver.assetExts.push('wasm');

// Cabeceras COOP/COEP SOLO para peticiones web. Aplicarlas a las descargas
// nativas (Expo Go en Android/iOS) puede bloquear el bundle y dejarlo en 99%.
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    const url = req.url || '';
    const isNativeBundle = url.includes('platform=android') || url.includes('platform=ios');
    if (!isNativeBundle) {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    }
    middleware(req, res, next);
  };
};

module.exports = config;
