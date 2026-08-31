---
name: update-apk
description: Fetch a new Expense Manager EAS build APK from an expo.dev artifact link, verify it, replace apps/demo-app.apk, and reinstall it on the running emulator/device
---

# Update APK

## Overview

The Expense Manager demo app (`com.navindalmia.expensemanager`) is built via
Expo/EAS. There's no CI hook or stable "latest" URL — a human must open
https://expo.dev/accounts/navindalmia/projects/expense-manager/builds (login
required), find the latest successful build, and copy its artifact link
(`https://expo.dev/artifacts/eas/<id>.apk`). Given that link, this skill
downloads, verifies, and installs the new build.

## When to Use

Invoke with the artifact link as an argument, e.g.:

```
/update-apk https://expo.dev/artifacts/eas/<id>.apk
```

If the user says "there's a new build" without a link, ask them to open the
builds page above and paste the latest successful build's artifact link —
there is no way to discover it without browser/API access to expo.dev.

## Steps

Run from the repo root (`apps/demo-app.apk` is the target path).

1. **Download to a temp file, never straight over the current APK:**
   ```
   curl -L -o apps/demo-app.apk.new "<link>" -w "\nHTTP %{http_code}, size %{size_download} bytes\n"
   ```
   A 404 comes back as a small XML body (`NoSuchKey`) with `HTTP 404` — if you
   see that, the link has expired or was mistyped; ask the user for a fresh
   one instead of proceeding.

2. **Validate it's really an APK:**
   ```
   file apps/demo-app.apk.new   # expect "Zip archive data"
   ```

3. **Confirm the package** (adjust the build-tools version to whatever's
   installed under `$ANDROID_HOME/build-tools/`):
   ```
   "$ANDROID_HOME/build-tools/<version>/aapt" dump badging apps/demo-app.apk.new | grep ^package
   ```
   Expect `package: name='com.navindalmia.expensemanager'`. Stop and flag it
   to the user if the package name doesn't match — wrong link was pasted.

4. **Compare against the current APK before overwriting:**
   ```
   sha256sum apps/demo-app.apk apps/demo-app.apk.new
   ```
   Report both hashes either way. If they match, tell the user this build is
   identical to what's already installed and stop (delete the `.new` file).

5. **Replace and install:**
   ```
   mv apps/demo-app.apk.new apps/demo-app.apk
   adb install -r apps/demo-app.apk
   ```
   `adb devices` first if it's unclear whether an emulator is running.

6. **Report** old vs. new SHA-256/size and the `adb install` result
   (`Success` / `Failure ...`) back to the user.

## Notes

- `apps/demo-app.apk` is gitignored (`apps/*.apk`) — it's never committed, so
  this must be redone in each fresh checkout/worktree that needs to run
  device tests.
- See `apps/README.md` for the package name and manual install command.
