# Mobile Wright Framework — Setup Plan

Automated mobile testing for the Expense Manager Android app, using
[mobilewright](https://mobilewright.dev) (a Playwright-style automation
framework for mobile apps).

## Status: starter test passing ✅

## Done

- **Installed `mobilewright`** (`^0.0.53`) and `@mobilewright/test` (dev
  dependency) via npm. `package.json` set to `"type": "module"` since
  `@mobilewright/test` ships ESM only.
- **Verified environment** with `npx mobilewright doctor`:
  - Installed Android SDK cmdline-tools (`sdkmanager`/`avdmanager`
    replacement) — wasn't bundled with the existing Android Studio install.
  - Installed an Android system image (`system-images;android-35;google_apis;x86_64`
    plus a Play Store image for the AVD).
  - Set `ANDROID_HOME` and added `platform-tools`/`emulator` to PATH
    (user-level env vars — **requires a new terminal to pick up**).
  - Remaining doctor warnings (optional, not blockers):
    - Windows Hypervisor Platform status unverified — enable via
      `Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -All -NoRestart`
      (admin PowerShell, needs reboot) for full emulator acceleration.
    - Android SDK not excluded from Windows Defender — recommended for
      speed: `Add-MpPreference -ExclusionPath "<sdk path>"`.
- **Created and booted an emulator**: AVD `medium_phone` (Android API 36,
  Google Play image). Boots via `android.exe emulator start medium_phone`.
- **Installed the demo app** on the emulator:
  - APK copied from Downloads into the project at `apps/demo-app.apk`.
  - Package name extracted via `aapt`: `com.navindalmia.expensemanager`
    ("Expense Manager").
  - Installed with `adb install -r apps/demo-app.apk`.
- **Configured mobilewright for Android** (`mobilewright.config.ts`):
  ```ts
  export default defineConfig({
    platform: 'android',
    bundleId: 'com.navindalmia.expensemanager',
    timeout: 30_000,
  });
  ```
- **Fixed the test runner wiring**: `npm test` must run `mobilewright test`
  (its own CLI, which loads `mobilewright.config.ts` and injects the
  device-pool coordinator), **not** `playwright test` — the latter doesn't
  know about mobilewright's config and fails with
  `MOBILEWRIGHT_COORDINATOR_URL is not set`.
- **Starter test passing** (`example.test.ts`): launches the app and
  asserts the real login screen content is visible (`"Expense Manager"`,
  `"Welcome Back"`) — corrected from the scaffold's generic `"Welcome"`
  placeholder by inspecting the actual UI via `adb shell uiautomator dump`.

```
> npm test
✓  example.test.ts:6:1 › app launches and shows login screen (8.5s)
1 passed
```

## Next steps

1. **Login flow test** — fill `EMAIL`/`PASSWORD` fields, tap `Login`, and
   assert the post-login (home/dashboard) screen appears. Needs valid
   test credentials for the demo app (or a mock/test account).
2. **Core expense flows** — add/edit/delete an expense, verify totals or
   list updates. Define the app's key user journeys to cover.
3. **Test data isolation** — decide how tests get a clean app state each
   run (e.g. `device.terminateApp` + `launchApp` per test, already
   supported by `@mobilewright/test`'s `autoAppLaunch`; consider clearing
   app data between runs via `adb shell pm clear`).
4. **CI-friendliness**:
   - Script emulator boot + `adb wait-for-device` + boot-completed check
     as a reusable setup step (currently done manually).
   - Decide whether CI provisions a fresh AVD per run or reuses a cached
     one.
5. **Reporting** — `mobilewright test --reporter html` is available;
   wire up screenshot-on-failure / video (`test.use({ video: 'retain-on-failure' })`)
   for easier debugging of failures.
6. **Housekeeping**:
   - Confirm `apps/demo-app.apk` (69MB) should be committed to the repo,
     or moved to a build artifact / fetched at test-setup time instead.
   - Apply the two optional `doctor` warnings (Hypervisor Platform,
     Defender exclusion) if emulator performance becomes an issue.
   - Add a `.gitignore` for `node_modules`, `mobilewright-report/`, and
     any video/screenshot output directories.
