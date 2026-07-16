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

  // Fix 1: StyleSizeLength → StyleLength in expo-modules-core C++ (renamed in Yoga for RN 0.77)
  patchFile(
    path.join(root, 'node_modules/expo-modules-core/common/cpp/fabric/ExpoViewComponentDescriptor.cpp'),
    (src) => src.replace(/StyleSizeLength::points/g, 'StyleLength::points')
  );

  // Fix 2: Add missing getReactNativeConfig() to ExpoReactHostDelegate (required by RN 0.77)
  patchFile(
    path.join(root, 'node_modules/expo/android/src/main/java/expo/modules/ExpoReactHostFactory.kt'),
    (src) => {
      if (src.includes('getReactNativeConfig')) return src;
      // Add import next to existing fabric import
      let out = src.replace(
        'import com.facebook.react.fabric.ComponentFactory',
        'import com.facebook.react.fabric.ComponentFactory\nimport com.facebook.react.fabric.ReactNativeConfig'
      );
      // Insert method BEFORE handleInstanceException (same class scope, safe insertion point)
      out = out.replace(
        '    override fun handleInstanceException',
        '    override fun getReactNativeConfig(): ReactNativeConfig = ReactNativeConfig.DEFAULT_CONFIG\n\n    override fun handleInstanceException'
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
