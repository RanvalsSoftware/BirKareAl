# iPad launch crash — build 9

Apple submission: `26b305a3-9a3b-4fdb-851c-bf8984a62ee0`.
Review device: iPad Air 11-inch (M3), iPadOS 27.2.

Both supplied crash reports terminate in UIKit at
`___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_invoke`
with `EXC_BREAKPOINT / SIGTRAP`. The relevant UIKit frames already have symbols.
This identifies the missing scene lifecycle; the reports do not establish an
API, authentication, subscription, or JavaScript failure.

## Fix

- Keep Expo SDK 57.0.24, which contains the backported scene runtime.
- Enable `expo-build-properties` → `ios.enableSceneSupport: true` in
  `apps/mobile/app.config.ts`.
- Prebuild now makes AppDelegate conform to `ExpoReactNativeFactoryProvider`,
  removes its legacy window/React Native startup, and registers
  `EXExpoAppSceneDelegate` in `UIApplicationSceneManifest`.
- Set `ios.buildNumber` to `10` for the next submission.

The generated `apps/mobile/ios` directory is ignored by Git. The config plugin
and dependency lockfile preserve the fix for future native generation. Do not
fix only the generated Info.plist: the app delegate must migrate as well.

Reference: [Expo SDK 57 scene lifecycle migration](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md#staying-on-sdk-57-with-xcode-27).

## Release handoff

Open `apps/mobile/ios/BirKareAI.xcworkspace` in Xcode. Select the signing team,
confirm build 10, and archive for a physical iOS device. The existing Release
environment plugin selects production settings for the JavaScript bundle.
Upload the new binary and replace build 9 on the App Store submission after
testing. A metadata change or JavaScript-only update cannot replace this native
lifecycle fix in the old binary.

The local machine has Xcode 27 and iPadOS 26.x simulator runtimes, but no
iPadOS 27.2 runtime. Testing on 26.x cannot establish successful execution on
Apple's exact review OS; a 27.x device/TestFlight launch check remains required.
