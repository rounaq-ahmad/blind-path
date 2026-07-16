const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withFixBuildGradle(config) {
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents
      .replace(/[ \t]*enableBundleCompression\s*=\s*(true|false)\r?\n?/g, '');
    return mod;
  });
};
