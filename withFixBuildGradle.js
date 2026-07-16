const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withFixBuildGradle(config) {
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents
      .split('\n')
      .filter(line => !line.includes('enableBundleCompression'))
      .join('\n');
    return mod;
  });
};
