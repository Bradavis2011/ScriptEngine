const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-svg 15.12.1 loads from src/ (TypeScript) via the "react-native"
// field in its package.json, which imports Node's "buffer" built-in.
// Intercept "buffer" at resolver level so Metro uses the npm polyfill instead
// of throwing "attempted to import Node standard library module".
const prev = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'buffer') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/buffer/index.js'),
      type: 'sourceFile',
    };
  }
  return prev
    ? prev(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
