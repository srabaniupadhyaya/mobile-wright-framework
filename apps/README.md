# apps/

Place the demo app APK here as `demo-app.apk`. It's excluded from git
(see `.gitignore`) because of its size (~69MB).

- Package name: `com.navindalmia.expensemanager.staging` ("Expense Manager", staging build)
- Install on a booted emulator/device with:
  ```
  adb install -r apps/demo-app.apk
  ```
