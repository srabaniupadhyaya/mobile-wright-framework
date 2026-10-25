---
name: restart-emulator
description: Restart the Android emulator (kill it, relaunch the same AVD, wait for boot) so device tests start from a clean state, e.g. after a flaky WebSocket/driver failure
---

# Restart Emulator

## Overview

Restarts the running Android emulator and waits until it has fully booted.
Installed apps and data persist (this is a normal restart, not a wipe), so
`com.navindalmia.expensemanager` stays installed.

## Steps

Run from the repo root. Use `export MSYS_NO_PATHCONV=1` in Bash so adb paths
aren't mangled by Git Bash.

1. **Find the AVD name** of the running emulator (needed to relaunch it):
   ```
   adb shell getprop ro.boot.qemu.avd_name
   ```
   If no emulator is running, list options with
   `"$ANDROID_HOME/emulator/emulator.exe" -list-avds`.

2. **Kill it:**
   ```
   adb emu kill
   ```

3. **Relaunch detached as a cold boot** (PowerShell, so it survives the tool
   call). `-no-snapshot-load` is required: a plain restart resumes the saved
   snapshot, which on this machine comes back with a black screen that the
   mobilewright driver can't see through (see "If the screen is black" below).
   ```
   Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList "-avd","<avd_name>","-no-snapshot-load"
   ```

4. **Wait for boot** (Bash):
   ```
   timeout 180 adb wait-for-device
   for i in $(seq 1 30); do [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ] && break; sleep 5; done
   adb devices
   ```

5. **Confirm the app is still installed:**
   ```
   adb shell pm list packages | grep expensemanager
   ```
   If missing, reinstall with `adb install -r apps/demo-app.apk` (see the
   `update-apk` skill).

6. **Confirm the screen actually renders** (launch the app and check the
   screenshot size; a black screen is ~30 KB, a rendered app ~70 KB):
   ```
   adb shell monkey -p com.navindalmia.expensemanager.staging -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
   sleep 8
   adb exec-out screencap -p > screen.png; ls -l screen.png
   ```
   Look at the image if the size is close to 30 KB, then delete `screen.png`.

7. **Report** the AVD name, that the device shows as `device`, whether the
   app is installed, and whether the screen rendered.

## If the screen is black

`uiautomator` can see the app and logcat shows no crash, but the screenshot
is black and `screen.viewTree()` returns only system UI, so every test fails
at its first assertion. Cause: a snapshot restore left the display not
drawing the app. Fix: repeat steps 2-6 with `-no-snapshot-load` (already in
step 3).

## Notes

- Add `-wipe-data` to the emulator args only if the user asks for a clean
  slate; it removes the installed app.
- Restarting can clear the intermittent `WebSocket connection closed`
  driver failures described in `docs/TEST_PLAN.md`, but don't use it to
  paper over a reproducible failure.
