const { withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFixBuildGradle(config) {
  // Fix StyleSizeLength → StyleLength in expo-modules-core (renamed in Yoga for RN 0.77)
  const cppFile = path.join(
    process.cwd(),
    'node_modules/expo-modules-core/common/cpp/fabric/ExpoViewComponentDescriptor.cpp'
  );
  try {
    if (fs.existsSync(cppFile)) {
      const src = fs.readFileSync(cppFile, 'utf8');
      if (src.includes('StyleSizeLength::points')) {
        fs.writeFileSync(cppFile, src.replace(/StyleSizeLength::points/g, 'StyleLength::points'), 'utf8');
      }
    }
  } catch (_) {}

  // Remove enableBundleCompression from generated app/build.gradle
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents
      .split('\n')
      .filter(line => !line.includes('enableBundleCompression'))
      .join('\n');
    return mod;
  });
};
