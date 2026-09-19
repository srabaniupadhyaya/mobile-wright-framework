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

3. **Relaunch detached** (PowerShell, so it survives the tool call):
   ```
   Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList "-avd","<avd_name>"
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

6. **Report** the AVD name, that the device shows as `device`, and whether
   the app is installed.

## Notes

- Add `-wipe-data` to the emulator args only if the user asks for a clean
  slate; it removes the installed app.
- Restarting can clear the intermittent `WebSocket connection closed`
  driver failures described in `docs/TEST_PLAN.md`, but don't use it to
  paper over a reproducible failure.
