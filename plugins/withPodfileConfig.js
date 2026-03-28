/**
 * Expo config plugin that persists two Podfile customizations across
 * `expo prebuild --clean` runs:
 *
 * 1. `use_modular_headers!` — required for Firebase Swift pods.
 * 2. `FOLLY_CFG_NO_COROUTINES=1` post-install flag — avoids C++ coroutine
 *    build errors introduced in RN 0.76+.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withPodfileConfig = config => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = await fs.promises.readFile(podfilePath, 'utf8');

      // 1. Add use_modular_headers! after the platform line
      if (!contents.includes('use_modular_headers!')) {
        contents = contents.replace(
          /(platform :ios,[^\n]+\n)/,
          `$1use_modular_headers!\n`,
        );
      }

      // 2. Add FOLLY_CFG_NO_COROUTINES=1 inside post_install if not present
      if (!contents.includes('FOLLY_CFG_NO_COROUTINES')) {
        const follyBlock = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        gcc_defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS']
        case gcc_defs
        when Array
          gcc_defs << 'FOLLY_CFG_NO_COROUTINES=1' unless gcc_defs.include?('FOLLY_CFG_NO_COROUTINES=1')
        when String
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = "\#{gcc_defs} FOLLY_CFG_NO_COROUTINES=1" unless gcc_defs.include?('FOLLY_CFG_NO_COROUTINES')
        else
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = ['$(inherited)', 'FOLLY_CFG_NO_COROUTINES=1']
        end
      end
    end`;

        // Insert before the closing `end` of the post_install block
        contents = contents.replace(
          /(post_install do \|installer\|[\s\S]*?)(  end\n)/,
          `$1${follyBlock}\n$2`,
        );
      }

      await fs.promises.writeFile(podfilePath, contents);
      return config;
    },
  ]);
};

module.exports = withPodfileConfig;
