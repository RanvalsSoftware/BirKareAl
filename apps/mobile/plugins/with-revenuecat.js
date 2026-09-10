const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

// A bank's payment verification app must be able to return to the purchase.
// See RevenueCat's React Native launchMode guidance. Applied on each prebuild.
module.exports = function withRevenueCat(config) {
  return withAndroidManifest(config, (mod) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(mod.modResults);
    activity.$['android:launchMode'] = 'singleTop';
    return mod;
  });
