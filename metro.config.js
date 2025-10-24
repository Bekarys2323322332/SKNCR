const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const defaultConfig = getDefaultConfig(__dirname);



 
const config = getDefaultConfig(__dirname)
defaultConfig.resolver.sourceExts.push('cjs');
module.exports = withNativeWind(config, { input: './app/globals.css' }), defaultConfig;