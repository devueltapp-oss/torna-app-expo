/**
 * Config plugin: permite `#import <React/...>` no-modular dentro de pods que se
 * compilan como framework module.
 *
 * ## Por qué
 *
 * Con `ios.useFrameworks: "static"` (que la app necesita para Firebase), los pods
 * de `@react-native-firebase` (`RNFBApp`, …) se compilan como clang framework
 * modules. Sus fuentes hacen `#import <React/RCTBridgeModule.h>` / `RCTConvert.h`
 * / `RCTEventEmitter.h`, que son headers **no-modulares** de `React-Core`. El
 * clang de Xcode 26 trata eso como `-Werror,-Wnon-modular-include-in-framework-module`
 * y el build falla:
 *
 *   include of non-modular header inside framework module
 *   'RNFBApp.RNFBAppModule': '.../React-Core/React/RCTBridgeModule.h'
 *
 * En Expo SDK 51 / Xcode 16 no saltaba (toolchain más laxo). En SDK 55 / Xcode 26
 * sí. El fix estándar es poner
 * `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` en el `post_install`
 * del Podfile para todos los targets de pods. Es inofensivo: solo relaja una
 * advertencia-como-error; es el valor por defecto de los targets de app.
 *
 * Workflow managed (sin Podfile en el repo): se parchea el Podfile generado por
 * `expo prebuild` insertando el loop al inicio del bloque `post_install`.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SNIPPET = [
  "    installer.pods_project.targets.each do |target|",
  "      target.build_configurations.each do |config|",
  "        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'",
  "      end",
  "    end",
  "",
].join("\n");

module.exports = function withNonModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );
      let contents = fs.readFileSync(podfilePath, "utf8");

      if (
        contents.includes("CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES")
      ) {
        return config;
      }

      const marker = "post_install do |installer|\n";
      if (!contents.includes(marker)) {
        throw new Error(
          "[withNonModularHeaders] no se encontró el bloque post_install en el Podfile",
        );
      }
      contents = contents.replace(marker, marker + SNIPPET);
      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
