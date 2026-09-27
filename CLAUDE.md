# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An automated UI test suite for the **Expense Manager** Android app
(`com.navindalmia.expensemanager`), an Expo/EAS-built React Native app,
using [mobilewright](https://mobilewright.dev) — a Playwright-style
framework for native mobile apps (locators, auto-waiting `expect`, test
fixtures) instead of browsers. Tests drive a real Android emulator via
`adb`/`uiautomator`, not a simulator or mocked UI.

There is no application source code in this repo — only the test
framework, the built APK (`apps/demo-app.apk`, gitignored), and docs.

## Commands

```
npm test                                      # run all tests in tests/
npx mobilewright test tests/login.test.ts     # run a single file
npx mobilewright test tests/login.test.ts --reporter html  # HTML report incl. screenshots
npm run test:report                           # run, then generate the HTML report
npm run report                                # serve the last HTML report
npx tsc --noEmit                              # type-check (must pass before every commit)
```

There is no lint script. `npx tsc --noEmit` is the only static check, and
it's load-bearing: `tsconfig.json` uses `"module": "nodenext"`, which means
relative imports must use explicit `.js` extensions even in `.ts` files
(`from './helpers.js'`, not `'./helpers'`) or `tsc` fails with TS2835.

**Diagnostics** (mobilewright's own CLI, not project-specific — useful when
tests fail mysteriously, before suspecting the test code):
```
npx mobilewright doctor      # checks the environment (SDK, emulator, env vars) for problems
npx mobilewright devices     # lists connected devices/emulators mobilewright can see
npx mobilewright install     # installs the mobilewright agent on a connected device
npx mobilewright inspect     # opens the Mobilewright Inspector (browser UI) for live element inspection
```

Device runs are never parallel — there is exactly one emulator
(`emulator-5554`, AVD `Pixel_10_Pro_XL`). Never invoke `mobilewright test`
concurrently with another run.

## Architecture

**Page Object Model + custom fixtures**, layered as:

- `tests/pages/*.ts` — one class per app screen (`LoginPage`, `SignupPage`,
  `HomePage`). Each class owns that screen's locators and any workaround
  needed to interact with it reliably (keyboard dismissal, settle delays),
  and exposes intent-level methods (`signup.signUp(user)`, `home.logOut()`).
  **Tests never call `screen.getBy*` directly** — all locators live in
  page classes. A new screen gets a new page class here.
- `tests/fixtures.ts` — extends `@mobilewright/test`'s `test` (a Playwright
  `TestType`, so `test.extend` works normally) with ready-made fixtures:
  `loginPage`, `signupPage`, `homePage`, a fresh `user` per test
  (`randomTestUser()`), and two **auto** fixtures that run for every test
  with no test opting in:
  - `startLoggedOut` — calls `ensureLoggedOut` before the test body runs,
    since the app persists auth state across launches with no reset
    between tests otherwise.
  - `screenshotAfterEach` — attaches a `final-screen` screenshot after
    every test, pass or fail, for the HTML report. Best-effort: swallows
    errors so a lost driver connection doesn't mask the test's real result.
  All test files import `test` (and `expect`) from `./fixtures.js`, never
  directly from `@mobilewright/test`.
- `tests/helpers.ts` — `randomTestUser()` (respects each field's actual
  validation, e.g. the name field rejects digits) and `ensureLoggedOut()`.
  Page files never import from here or from `fixtures.ts`; the dependency
  only runs one way (helpers/fixtures → pages).
- `tests/ui-strings.ts` — every exact user-facing error string the app
  shows (login/signup errors), observed by hand and centralized here so no
  test hard-codes UI copy. Update this file, not the test, when the app's
  copy changes.
- `mobilewright.config.ts` — `testDir`, `platform: 'android'`, `bundleId`,
  and the default 30s test timeout.

**Why fixtures wrap page objects**: this removes the three-line
"`new LoginPage(screen)` / `new SignupPage(screen)` / `new HomePage(screen)`"
boilerplate every test used to repeat, and centralizes the auto-login-out
and screenshot behavior in one place instead of every test file.

## Environment quirks worth knowing before touching tests

These are hard-won and will waste time again if re-discovered:

- **The app's on-screen keyboard eats the first tap after `fill()`.**
  Tapping the submit button while the keyboard is still open sometimes
  just dismisses the keyboard instead of reaching the button. `SignupPage`
  handles this by pressing the hardware `BACK` button once (reliable
  across emulator instances) rather than tapping a heading — an earlier
  "tap the heading to close the keyboard" approach worked on one emulator
  instance and silently stopped working on another.
- **`WebSocket connection closed` errors aren't always infra flake.**
  Known reproducible triggers: tapping Logout, and closing the keyboard —
  both cause a navigation/layout change that briefly drops the mobilewright
  driver's connection to the device (the app itself is fine). The fix is a
  settle delay (`HomePage.logOut()`, `SignupPage.submit()`) plus a bumped
  `testInfo.setTimeout(...)` on the test, never a blind retry. If a new
  navigation trigger causes this, confirm it's reproducible in isolation
  before assuming it's this same known cause.
- **If every test suddenly fails at its very first assertion**, suspect the
  emulator's display before the tests: after a snapshot restore, the app
  can be alive and focused (`uiautomator`/`dumpsys` see it fine) while the
  screen is actually black and `screen.viewTree()` returns only system-UI
  nodes. A plain restart does not fix this; only a cold boot does
  (`-no-snapshot-load` — see `.claude/skills/restart-emulator/`).
- **The backend can cold-start.** `expense-manager-udoo.onrender.com` is on
  a free tier that sleeps after inactivity; the first request after a
  while can exceed the test timeout, looking exactly like a hung UI. Worth
  checking before assuming a real regression, but don't wave away every
  timeout as this without checking either.
- Full name field only accepts letters/spaces/hyphens/apostrophes; email
  and password fields have no such restriction.

## Project-specific skills

- `.claude/skills/restart-emulator/` — cold-boots the emulator and
  verifies the screen actually renders (not just that it booted). Prefer
  this over restarting manually; it encodes the black-screen fix above.
- `.claude/skills/update-apk/` — fetches a new EAS build artifact, verifies
  the package name and hash, and reinstalls it, without ever overwriting
  the current APK before validating the new one.

## Docs

- `docs/TEST_PLAN.md` — the living app map (verified screens/elements),
  prioritized test coverage backlog, and a numbered lessons-learned list.
  Read this before writing new tests; update it (app map + lessons) after
  discovering new UI behavior or environment quirks.
- `docs/PLAN.md` — historical log of the initial environment setup
  (SDK, AVD, `mobilewright.config.ts`). Not a live doc.
- `docs/superpowers/plans/` — dated implementation plans for specific
  batches of test work, executed task-by-task per the `superpowers`
  skill set.
