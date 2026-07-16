const { withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function patchFile(filePath, patchFn) {
  try {
    if (fs.existsSync(filePath)) {
      const src = fs.readFileSync(filePath, 'utf8');
      const patched = patchFn(src);
      if (patched !== src) fs.writeFileSync(filePath, patched, 'utf8');
    }
  } catch (_) {}
}

module.exports = function withFixBuildGradle(config) {
  const root = process.cwd();

  // Fix 1: StyleLength → StyleSizeLength in expo-modules-core C++ (RN 0.78.3 Maven AAR uses StyleSizeLength in setDimension)
  patchFile(
    path.join(root, 'node_modules/expo-modules-core/common/cpp/fabric/ExpoViewComponentDescriptor.cpp'),
    (src) => src.replace(/StyleLength::points/g, 'StyleSizeLength::points')
  );

  // Fix 2: Remove ReactNativeConfig import and getReactNativeConfig() from ExpoReactHostFactory.kt
  // (ReactNativeConfig was removed from com.facebook.react.fabric in RN 0.78.3 and ReactHostDelegate
  // no longer declares getReactNativeConfig(), so overriding it causes a compilation error)
  patchFile(
    path.join(root, 'node_modules/expo/android/src/main/java/expo/modules/ExpoReactHostFactory.kt'),
    (src) => {
      let out = src.replace(
        /\nimport com\.facebook\.react\.fabric\.ReactNativeConfig\n?/g,
        '\n'
      );
      out = out.replace(
        /\n\s*override fun getReactNativeConfig\(\): ReactNativeConfig = ReactNativeConfig\.DEFAULT_CONFIG\n?/g,
        '\n'
      );
      return out;
    }
  );

  // Fix 3: Remove enableBundleCompression from generated app/build.gradle
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents
      .split('\n')
      .filter(line => !line.includes('enableBundleCompression'))
      .join('\n');
    return mod;
  });
};
