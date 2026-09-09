const { IOSConfig, withInfoPlist } = require('expo/config-plugins');

const developmentUrlScheme = 'exp+birkare-ai';

/**
 * Keep Expo's native development URL separate from the public Linking scheme.
 *
 * `expo-linking` reads `expoConfig.scheme` at runtime and warns when that value
 * contains multiple schemes. Expo CLI, however, prefers a native `exp+` scheme
 * when opening a development build. Registering it only in Info.plist satisfies
 * the CLI without exposing it as an application-level Linking choice.
 */
module.exports = function withDevelopmentUrlScheme(config) {
  return withInfoPlist(config, (modConfig) => {
    modConfig.modResults = IOSConfig.Scheme.appendScheme(
      developmentUrlScheme,
      modConfig.modResults,
    );

    return modConfig;
  });
};
