const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
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

  // Fix 3: Patch generated MainApplication.kt to use RN 0.78.3 APIs
  // expo@54 template.tgz ships a MainApplication.kt targeting RN 0.79
  // (ReactNativeApplicationEntryPoint, ReleaseLevel) which don't exist in RN 0.78.3.
  // withDangerousMod runs after template extraction so android/ already exists.
  const findMainApplication = (dir) => {
    if (!fs.existsSync(dir)) return null;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { const r = findMainApplication(full); if (r) return r; }
      else if (entry.name === 'MainApplication.kt') return full;
    }
    return null;
  };
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const appSrcDir = path.join(cfg.modRequest.projectRoot, 'android', 'app', 'src', 'main', 'java');
      const mainAppPath = findMainApplication(appSrcDir);
      if (mainAppPath) {
        patchFile(mainAppPath, (src) => {
          if (!src.includes('ReactNativeApplicationEntryPoint')) return src;
          return src
            .replace("import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative\n", '')
            .replace("import com.facebook.react.common.ReleaseLevel\n", '')
            .replace(
              'import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint\n',
              'import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load\n'
            )
            .replace(
              /    DefaultNewArchitectureEntryPoint\.releaseLevel = try \{[\s\S]*?\}\s*\n\s*loadReactNative\(this\)/,
              '    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {\n      load()\n    }'
            );
        });
      }
      return cfg;
    },
  ]);

  // Fix 4: Remove enableBundleCompression from generated app/build.gradle
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents
      .split('\n')
      .filter(line => !line.includes('enableBundleCompression'))
      .join('\n');
    return mod;
  });
};
