# Page Objects, Fixtures and P0 Auth Error Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the existing tests onto a Page Object Model (POM), wrap the page objects in custom test fixtures, then add the three remaining P0 auth tests (wrong-password login, duplicate-email signup, signup validation) on top of both.

**Architecture:** One class per screen in `tests/pages/` (`LoginPage`, `SignupPage`, `HomePage`). Each class owns every locator, keyboard-dismissal and settle-delay detail for its screen and exposes intent-level methods. `tests/fixtures.ts` extends `@mobilewright/test`'s `test` (a Playwright `TestType`) via `test.extend` with `loginPage`, `signupPage`, `homePage`, a fresh `user`, and an auto fixture that starts every test logged out. Tests destructure what they need and never construct pages or touch `screen.getBy*`. Tasks 1-3 refactor the existing suite with unchanged behaviour. Task 4 records the app's real error strings in `tests/ui-strings.ts`. Tasks 5-6 add the new tests, each adding only the page methods it needs.

**Tech Stack:** TypeScript (`nodenext` modules), `@mobilewright/test` 0.0.53 (Playwright Test based), Android emulator `Pixel_10_Pro_XL`, app `com.navindalmia.expensemanager`.

**Spec:** `docs/TEST_PLAN.md` §3 "P0 — Auth" (the three unchecked items) and §4 "Lessons learned".

## Progress Ledger (read this first when resuming)

Status as of 2026-09-27. Commits are on `master`, already pushed to `origin/master`.

- **Task 1 — done, committed** `cca7aa5` "Add page objects and move signup and logout tests onto them".
- **Task 2 — done, committed** `5cd8ef9` "Move login test onto page objects".
- **Task 3 — done, committed** `9ad7a54` "Add custom test fixtures and move existing tests onto them".
- **Task 4 — done, committed** `ff547da` "Record observed auth error copy in ui-strings". `tests/ui-strings.ts` holds the real observed strings, not placeholders.
- **Task 7 (screenshot fixture) — code written, NOT committed.** `screenshotAfterEach` is in the working tree's `tests/fixtures.ts` (Steps 1-2 done, `tsc --noEmit` passes). Step 3 (confirm one screenshot per test across a full clean suite run) has not been cleanly verified — every attempt so far hit the Task 8 bug below before finishing a clean pass. Step 4 (docs + commit) not done.
- **Task 8 (new, not in original plan) — code written, NOT committed, PARTIALLY CONFIRMED, INCOMPLETE.** Added below. Discovered while verifying Task 5: `SignupPage.submit()`'s keyboard-dismiss tap (tap the heading) stopped reliably closing the keyboard on this emulator instance, so the submit tap was silently swallowed and every test that calls `signUp()` (i.e. everything) hung until timeout. Fixed in the working tree by dismissing via hardware `BACK` instead. First verification attempt (old APK build): ran `tests/signup.test.ts` 10 times, ~6 failed / ~4 passed, mixed signatures — inconclusive.
  **A new APK build was installed 2026-09-27 (`/update-apk`, hash `64313956d6...`) partway through this investigation — re-verification below is against that new build, not the one the 6/10-fail run used, so the two tallies aren't directly comparable.**
  **Re-verification against the new build (5 runs): 3 passed, 2 failed, and this time both failures share one exact, reproducible signature** — `HomePage.expectLoaded()` fails at its *second* assertion (`getByLabel('Logout')`) with `WebSocket connection closed`, immediately after its *first* assertion (`getByText('Expense Groups')`) already succeeded (confirmed via a `final-screen` screenshot showing the app already fully on the Home screen with Logout visible when the test times out). **This means: the app itself worked, signup completed, navigation to Home completed — the driver's WebSocket dropped during that Signup→Home navigation transition and didn't reconnect in time.** This is the same known class of issue as the Logout-navigation drop (`docs/TEST_PLAN.md` §4.5) and the keyboard-dismiss-relayout drop this task already patched — just a third, previously-unpatched trigger: the signup submit tap's own navigation. **The real fix is a settle delay after the submit tap in `SignupPage.submit()`** (there is currently a settle delay around the mid-form Back-button keypress, but none after the actual submit-and-navigate step) — this has NOT yet been added or verified. Do that next before trusting this task as done.
  Given this, the original keyboard-swallow diagnosis (stuck on Signup form, never advancing) may or may not still be a live, separate bug on top of this navigation-drop one — the two produce different screenshots (stuck-on-form vs. reached-Home-but-driver-dropped) so they're distinguishable; keep checking the screenshot on every future failure rather than assuming which bug it is.

  **UPDATE — a settle delay was added after the submit tap in `SignupPage.submit()` (unconditional, 3000ms, mirrors `HomePage.logOut()`'s pattern) to address the navigation-drop finding above. Re-ran `signup.test.ts` once: FAILED, but with a THIRD, worse failure mode, at a DIFFERENT line (the Back-button-dismiss settle/assert, line ~42, not the new post-submit delay).** The `final-screen` screenshot showed the Android home launcher — the app was not merely stuck or slow, it had been **ejected entirely**. Root cause: `keyboardOpen` is set purely from "did `fillForm()` run," not from an actual check of OS keyboard visibility; if the keyboard had already closed by the time `submit()` runs (timing-dependent, not confirmed how), hardware `BACK` does its normal safe thing — navigates back — and Signup apparently has no back-stack under it, so one Back press exits the whole app to the launcher. **This is a worse failure mode than the one Task 8 originally targeted:** the original bug (tap silently swallowed, stuck on form) just times out in a contained way; this one kills the app mid-test, breaking every subsequent step for reasons unrelated to what's being tested.
  **STOPPED HERE, uncommitted, pending a decision on the real fix** (see conversation for options floated: go back to tap-based dismissal since its failure mode is a safe hang rather than an app-exit; or query actual OS keyboard state before deciding to press Back, if the driver/protocol exposes that; or combine both). Do not re-attempt the Back-button approach as-is without addressing this.

  **UPDATE — reverted to the original tap-the-heading dismissal (user chose option 1), kept the post-submit settle delay. Re-ran once: FAILED again, same stuck-on-Signup-form symptom as the very first failure this whole investigation started from.** But this time the `final-screen` screenshot shows **no keyboard visible at all** — form fully filled, Create Account button plainly visible, nothing covering it. The error was a bare `Error: WebSocket connection closed` with no `expect()` line attached, meaning the drop happened during a plain `.tap()` action call itself, on an already-static screen with nothing navigating and no keyboard involved. **This does not fit the "specific navigation trigger causes a brief, recoverable WebSocket drop" model that `docs/TEST_PLAN.md` §4.5 currently documents and that every fix in this task has assumed.** It looks more like general connection instability between the mobilewright driver and this emulator that can hit any action, not just ones after a screen transition. Settle delays targeted at specific triggers (logout, keyboard relayout, signup navigation) may each be papering over one symptom of a broader problem rather than fixing a root cause. **Have not investigated further** (e.g. `npx mobilewright doctor`, driver/agent version, whether reinstalling the mobilewright agent on the device via `npx mobilewright install` helps, or general emulator resource/performance issues) — stopped to report this rather than keep patching individual symptoms. The plan's Global Constraint "No blind retries" was written assuming failures are diagnosable and fixable; if the connection is simply unreliable at a baseline rate, that constraint itself may need revisiting (this is a call for the user, not something to unilaterally override).
- **Task 5 — code written, NOT committed, NOT verified.** `tests/login-errors.test.ts` exists (untracked), `LoginPage.expectError` and `HomePage.expectNotLoaded` are added (uncommitted). Step 5 (run 3x) was in progress when the Task 8 bug was discovered — the failures being diagnosed were the keyboard bug, not this test's own logic. Must re-run Step 5 from scratch after Task 8 is verified.
- **Task 6 — not started.** `tests/signup-errors.test.ts` does not exist yet.
- **Out-of-plan, uncommitted:** `.claude/skills/restart-emulator/SKILL.md` was updated (cold boot with `-no-snapshot-load` + a screen-renders check) during earlier debugging of a black-screen emulator issue. Unrelated to this plan's file list; commit it separately whenever convenient (e.g. alongside Task 8, since Task 8's diagnosis is what prompted re-reading it).

**Pick up here:** run `tests/signup.test.ts` three times (Task 8's own verification, done as part of finishing Task 8 below), then resume Task 5 Step 5, then Task 5 Step 6, then Task 7 Step 3-4, then Task 6.

## Global Constraints

- Relative imports need explicit `.js` extensions, even in `.ts` files (`from './pages/HomePage.js'`). `npx tsc --noEmit` must pass (TS2835 otherwise).
- Page classes take a `Screen` (`import type { Screen } from '@mobilewright/core'`) and store it in an explicitly declared field. Do not use constructor parameter properties.
- Tests contain no `screen.getBy*` calls. All locators live in `tests/pages/*.ts`.
- Page files never import from `tests/helpers.ts` or `tests/fixtures.ts`. `helpers.ts` may import from `tests/pages/`; `fixtures.ts` may import from both.
- From Task 3 onward, every test file imports `test` from `./fixtures.js`, not from `@mobilewright/test`. `expect` is only needed inside page classes.
- Prefer `getByTestId` for form fields and buttons: `name-input`, `email-input`, `password-input`, `submit-button`.
- Dismiss the keyboard (tap the screen heading) before tapping `submit-button`. This lives inside the page methods, not in tests.
- The 5000 ms settle after tapping Logout lives in `HomePage.logOut()`. Tests that log out set `testInfo.setTimeout(...)` themselves: 60 000 ms for logout, 90 000 ms for login and any test that signs up, logs out, then does more.
- Every test gets its own fresh data from the `user` fixture (`randomTestUser()`) and starts on the Login screen. Before Task 3 tests call `ensureLoggedOut(screen)` themselves; from Task 3 on the auto fixture `startLoggedOut` does it. No test depends on another test's state.
- Assert on text that exists only on the destination or error state. Never assert only that ambiguous text is absent. Error assertions check the specific inline error text.
- No blind retries. A failing test is diagnosed, not re-run until it passes.
- There is exactly one emulator (`emulator-5554`). Device runs are never parallel.
- The backend cold-starts (free tier). A first-request timeout after inactivity may be cold start.
- The refactors in Tasks 1-3 are behaviour-preserving: the same timeouts, the same steps in the same order, and no assertion dropped or weakened.
- Commit messages are imperative and start with a capital ("Add login error test").

## File Structure

| File | Responsibility |
|---|---|
| `tests/pages/LoginPage.ts` (create, Task 1; extended in Tasks 2, 5) | Login screen |
| `tests/pages/SignupPage.ts` (create, Task 1; extended in Tasks 6, 8) | Signup screen |
| `tests/pages/HomePage.ts` (create, Task 1; extended in Task 5) | Home (Expense Groups) screen |
| `tests/helpers.ts` (modify, Task 1) | `randomTestUser` (unchanged) and `ensureLoggedOut`, now via page objects |
| `tests/signup.test.ts`, `tests/logout.test.ts` (modify, Tasks 1 and 3) | Refactored onto pages, then onto fixtures |
| `tests/login.test.ts` (modify, Tasks 2 and 3) | Refactored onto pages, then onto fixtures |
| `tests/fixtures.ts` (create, Task 3) | `test.extend` with page, `user` and `startLoggedOut` fixtures |
| `tests/fixtures.ts` (modify, Task 7) | Adds the `screenshotAfterEach` auto fixture |
| `tests/ui-strings.ts` (create, Task 4) | Observed error copy |
| `tests/login-errors.test.ts` (create, Task 5) | Wrong-password test |
| `tests/signup-errors.test.ts` (create, Task 6) | Duplicate-email and validation tests |
| `docs/TEST_PLAN.md` (modify, Tasks 1, 3, 4, 5, 6) | Document POM and fixtures, record error copy, tick items |

---

### Task 1: Page objects, and move signup and logout tests onto them

**Files:**
- Create: `tests/pages/LoginPage.ts`, `tests/pages/SignupPage.ts`, `tests/pages/HomePage.ts`
- Modify: `tests/helpers.ts`, `tests/signup.test.ts`, `tests/logout.test.ts`
- Modify: `docs/TEST_PLAN.md` (§1 primer: add a short "Page objects" note)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (exact signatures later tasks rely on):

```ts
// tests/pages/LoginPage.ts
export class LoginPage {
  constructor(screen: Screen);
  expectLoaded(): Promise<void>;           // "Welcome Back" visible
  goToSignup(): Promise<void>;             // taps the Signup link
  expectSignupLinkVisible(): Promise<void>;
}

// tests/pages/SignupPage.ts
export type SignupFields = { name?: string; email?: string; password?: string };
export class SignupPage {
  constructor(screen: Screen);
  expectLoaded(): Promise<void>;           // "Create Account" visible
  fillForm(fields: SignupFields): Promise<void>;   // fills only the given fields
  submit(): Promise<void>;                 // dismisses keyboard, taps submit
  signUp(user: { name: string; email: string; password: string }): Promise<void>; // fillForm + submit
}

// tests/pages/HomePage.ts
export class HomePage {
  constructor(screen: Screen);
  expectLoaded(): Promise<void>;           // "Expense Groups" and Logout visible
  isLoggedIn(): Promise<boolean>;          // Logout visible within 2 s
  tapLogout(): Promise<void>;              // tap only, no waiting
  logOut(): Promise<void>;                 // tapLogout + 5000 ms driver settle
}
```

- [x] **Step 1: Baseline. Confirm the existing suite passes before changing anything**

Run: `npm test`
Expected: signup, logout and login all `✓`. If one fails, diagnose it first (see `docs/TEST_PLAN.md` §4). A refactor cannot be judged against a red baseline.

- [x] **Step 2: Create `tests/pages/LoginPage.ts`**

```ts
// Page object for the Expense Manager Login screen.
import { expect } from '@mobilewright/test';
import type { Screen } from '@mobilewright/core';

export class LoginPage {
  private readonly screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  async expectLoaded() {
    await expect(this.screen.getByText('Welcome Back')).toBeVisible();
  }

  async goToSignup() {
    await this.screen.getByLabel('Signup').tap();
  }

  async expectSignupLinkVisible() {
    await expect(this.screen.getByLabel('Signup')).toBeVisible();
  }
}
```

- [x] **Step 3: Create `tests/pages/SignupPage.ts`**

```ts
// Page object for the Expense Manager Signup screen.
import { expect } from '@mobilewright/test';
import type { Screen } from '@mobilewright/core';

export type SignupFields = { name?: string; email?: string; password?: string };

export class SignupPage {
  private readonly screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  async expectLoaded() {
    await expect(this.screen.getByText('Create Account')).toBeVisible();
  }

  /** Fills only the fields provided; omitted fields are left empty. */
  async fillForm(fields: SignupFields) {
    if (fields.name) await this.screen.getByTestId('name-input').fill(fields.name);
    if (fields.email) await this.screen.getByTestId('email-input').fill(fields.email);
    if (fields.password) await this.screen.getByTestId('password-input').fill(fields.password);
  }

  async submit() {
    // Dismiss the on-screen keyboard before tapping submit: the keyboard is
    // still up right after fill(), and a tap on the submit button while it's
    // showing gets consumed by Android to close the keyboard instead of
    // reaching the button underneath, leaving the form stuck. Tapping the
    // (non-interactive) heading closes the keyboard harmlessly first.
    await this.screen.getByText('Create Account').first().tap();
    await this.screen.getByTestId('submit-button').tap();
  }

  async signUp(user: { name: string; email: string; password: string }) {
    await this.fillForm(user);
    await this.submit();
  }
}
```

- [x] **Step 4: Create `tests/pages/HomePage.ts`**

```ts
// Page object for the Expense Manager Home (Expense Groups) screen.
import { expect } from '@mobilewright/test';
import type { Screen } from '@mobilewright/core';

export class HomePage {
  private readonly screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  async expectLoaded() {
    await expect(this.screen.getByText('Expense Groups')).toBeVisible();
    await expect(this.screen.getByLabel('Logout')).toBeVisible();
  }

  async isLoggedIn() {
    return this.screen.getByLabel('Logout').isVisible({ timeout: 2000 });
  }

  async tapLogout() {
    await this.screen.getByLabel('Logout').tap();
  }

  /**
   * Log out, then wait for the driver to settle. The logout navigation
   * transition briefly drops the automation WebSocket connection (the app
   * itself lands on the Login screen fine; this is purely the driver
   * reconnecting). Without the pause, the very next assertion can hit the
   * drop and time out.
   */
  async logOut() {
    await this.tapLogout();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
```

- [x] **Step 5: Rewrite `ensureLoggedOut` in `tests/helpers.ts` to use the pages**

Replace the imports at the top of the file and the `ensureLoggedOut` function. Leave `randomString`, `LETTERS`, `ALPHANUMERIC` and `randomTestUser` exactly as they are. The top of the file becomes:

```ts
// Shared test data helpers for the Expense Manager app tests.
import type { Screen } from '@mobilewright/core';
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
```

and the function becomes (keep its existing doc comment above it):

```ts
export async function ensureLoggedOut(screen: Screen) {
  const home = new HomePage(screen);
  if (await home.isLoggedIn()) {
    await home.tapLogout();
  }
  await new LoginPage(screen).expectLoaded();
}
```

- [x] **Step 6: Rewrite `tests/signup.test.ts`**

```ts
// Signup flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test } from '@mobilewright/test';
import { ensureLoggedOut, randomTestUser } from './helpers.js';
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SignupPage } from './pages/SignupPage.js';

test('user can sign up with a new random account', async ({ screen }) => {
  const user = randomTestUser();
  const login = new LoginPage(screen);
  const signup = new SignupPage(screen);
  const home = new HomePage(screen);

  await ensureLoggedOut(screen);

  // Navigate from Login to the Signup screen.
  await login.goToSignup();
  await signup.expectLoaded();

  // Fill out the signup form with random credentials and submit.
  await signup.signUp(user);

  // Signup succeeds and navigates to the home screen.
  await home.expectLoaded();
});
```

- [x] **Step 7: Rewrite `tests/logout.test.ts`**

```ts
// Logout flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test } from '@mobilewright/test';
import { ensureLoggedOut, randomTestUser } from './helpers.js';
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SignupPage } from './pages/SignupPage.js';

test('user can log out after signing up', async ({ screen }, testInfo) => {
  // The full signup + logout round trip, plus the settle time inside
  // HomePage.logOut() for the driver's WebSocket to reconnect, runs past
  // the default 30s test timeout.
  testInfo.setTimeout(60_000);

  const user = randomTestUser();
  const login = new LoginPage(screen);
  const signup = new SignupPage(screen);
  const home = new HomePage(screen);

  // Sign up a fresh account to reach the home screen.
  await ensureLoggedOut(screen);
  await login.goToSignup();
  await signup.expectLoaded();
  await signup.signUp(user);
  await home.expectLoaded();

  // Log out.
  await home.logOut();

  // Logout succeeds and returns to the Login screen.
  await login.expectLoaded();
  await login.expectSignupLinkVisible();
});
```

- [x] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [x] **Step 9: Run the refactored tests. Both must pass, three times each**

```bash
for i in 1 2 3; do npx mobilewright test tests/signup.test.ts tests/logout.test.ts 2>&1 | grep -E "✘|✓|passed|failed"; done
```

Expected: `✓` for both tests on every run. On failure, diagnose against the Step 1 baseline. Do not re-run until green.

- [x] **Step 10: Document the POM in `docs/TEST_PLAN.md`**

In §1, after the "Test data isolation" paragraph, add a short "Page objects" paragraph: one class per screen in `tests/pages/`, they own locators and workarounds (keyboard dismissal, logout settle), tests call intent-level methods and never use `screen.getBy*`, and new screens get a new page class.

- [x] **Step 11: Commit**

```bash
git add tests/pages tests/helpers.ts tests/signup.test.ts tests/logout.test.ts docs/TEST_PLAN.md
git commit -m "Add page objects and move signup and logout tests onto them"
```

---

### Task 2: Move the login test onto page objects

**Files:**
- Modify: `tests/pages/LoginPage.ts` (add `login`)
- Modify: `tests/login.test.ts`

**Interfaces:**
- Consumes: `LoginPage`, `SignupPage`, `HomePage` and `ensureLoggedOut`/`randomTestUser` exactly as produced by Task 1.
- Produces: `LoginPage.login(email: string, password: string): Promise<void>`. It fills both fields, dismisses the keyboard by tapping the "Welcome Back" heading, and taps submit.

- [x] **Step 1: Add `login` to `tests/pages/LoginPage.ts`**

Add inside the class, after `goToSignup`:

```ts
  async login(email: string, password: string) {
    await this.screen.getByTestId('email-input').fill(email);
    await this.screen.getByTestId('password-input').fill(password);
    // Dismiss the keyboard before tapping submit, same as on signup.
    await this.screen.getByText('Welcome Back').tap();
    await this.screen.getByTestId('submit-button').tap();
  }
```

- [x] **Step 2: Rewrite `tests/login.test.ts`**

```ts
// Login flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test } from '@mobilewright/test';
import { ensureLoggedOut, randomTestUser } from './helpers.js';
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SignupPage } from './pages/SignupPage.js';

test('user can log in with an existing account', async ({ screen }, testInfo) => {
  // Signup + logout + login, plus the settle time after logout for the
  // driver's WebSocket to reconnect, runs past the default 30s timeout.
  testInfo.setTimeout(90_000);

  const user = randomTestUser();
  const login = new LoginPage(screen);
  const signup = new SignupPage(screen);
  const home = new HomePage(screen);

  // Sign up a fresh account to reach the home screen.
  await ensureLoggedOut(screen);
  await login.goToSignup();
  await signup.expectLoaded();
  await signup.signUp(user);
  await home.expectLoaded();

  // Log out, then wait for the Login screen.
  await home.logOut();
  await login.expectLoaded();

  // Log back in with the same credentials used to sign up. This verifies
  // the account was actually persisted server-side, not just kept alive
  // in the current app session.
  await login.login(user.email, user.password);

  // Login succeeds and navigates to the home screen.
  await home.expectLoaded();
});
```

- [x] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [x] **Step 4: Run the whole existing suite three times**

```bash
for i in 1 2 3; do npm test 2>&1 | grep -E "✘|✓|passed|failed"; done
```

Expected: signup, logout, login all `✓` on every run. The first-run flake seen on a fresh emulator boot is a known risk: if the very first run fails at the post-signup `Expense Groups` assertion with a WebSocket drop and the other two pass, diagnose whether it reproduces in isolation before adding a settle delay to `SignupPage.submit()`.

- [x] **Step 5: Commit**

```bash
git add tests/pages/LoginPage.ts tests/login.test.ts
git commit -m "Move login test onto page objects"
```

---

### Task 3: Custom fixtures, and move the existing tests onto them

**Files:**
- Create: `tests/fixtures.ts`
- Modify: `tests/signup.test.ts`, `tests/logout.test.ts`, `tests/login.test.ts`
- Modify: `docs/TEST_PLAN.md` (§1 primer: add a short "Fixtures" note)

**Interfaces:**
- Consumes: the three page classes, `ensureLoggedOut`, `randomTestUser` from Tasks 1-2.
- Produces: `tests/fixtures.ts` exporting exactly:

```ts
export const test;   // @mobilewright/test's test, extended with:
                     //   loginPage: LoginPage
                     //   signupPage: SignupPage
                     //   homePage: HomePage
                     //   user: ReturnType<typeof randomTestUser>  (fresh per test)
                     //   startLoggedOut: void  (auto fixture: runs ensureLoggedOut before each test)
export { expect } from '@mobilewright/test';
```

- [x] **Step 1: Baseline. Confirm the Task 2 suite is green**

Run: `npm test`
Expected: signup, logout, login all `✓`.

- [x] **Step 2: Create `tests/fixtures.ts`**

```ts
// Custom test fixtures for the Expense Manager app tests.
// `test` is @mobilewright/test's Playwright-based test, extended so each
// test receives ready-made page objects and fresh test data.
import { test as base } from '@mobilewright/test';
import { ensureLoggedOut, randomTestUser } from './helpers.js';
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SignupPage } from './pages/SignupPage.js';

type AppFixtures = {
  loginPage: LoginPage;
  signupPage: SignupPage;
  homePage: HomePage;
  user: ReturnType<typeof randomTestUser>;
  startLoggedOut: void;
};

export const test = base.extend<AppFixtures>({
  loginPage: async ({ screen }, use) => {
    await use(new LoginPage(screen));
  },
  signupPage: async ({ screen }, use) => {
    await use(new SignupPage(screen));
  },
  homePage: async ({ screen }, use) => {
    await use(new HomePage(screen));
  },
  // A new random account's credentials for every test, so no test depends
  // on data left behind by another test or a previous run.
  user: async ({}, use) => {
    await use(randomTestUser());
  },
  // The app persists auth state across launches, so every test starts by
  // making sure it is on the Login screen. Auto: no test has to ask for it.
  startLoggedOut: [
    async ({ screen }, use) => {
      await ensureLoggedOut(screen);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@mobilewright/test';
```

- [x] **Step 3: Type-check. This is also the proof that `test.extend` exists in this package**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

If `base.extend` is missing or the typing fails, stop: do not work around it with a different mechanism. Record the error text, leave Task 3 uncommitted, and report it. Everything after this task assumes fixtures work.

- [x] **Step 4: Rewrite `tests/signup.test.ts`**

```ts
// Signup flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test } from './fixtures.js';

test('user can sign up with a new random account', async ({
  loginPage,
  signupPage,
  homePage,
  user,
}) => {
  // Navigate from Login to the Signup screen.
  await loginPage.goToSignup();
  await signupPage.expectLoaded();

  // Fill out the signup form with random credentials and submit.
  await signupPage.signUp(user);

  // Signup succeeds and navigates to the home screen.
  await homePage.expectLoaded();
});
```

- [x] **Step 5: Rewrite `tests/logout.test.ts`**

```ts
// Logout flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test } from './fixtures.js';

test('user can log out after signing up', async ({
  loginPage,
  signupPage,
  homePage,
  user,
}, testInfo) => {
  // The full signup + logout round trip, plus the settle time inside
  // HomePage.logOut() for the driver's WebSocket to reconnect, runs past
  // the default 30s test timeout.
  testInfo.setTimeout(60_000);

  // Sign up a fresh account to reach the home screen.
  await loginPage.goToSignup();
  await signupPage.expectLoaded();
  await signupPage.signUp(user);
  await homePage.expectLoaded();

  // Log out.
  await homePage.logOut();

  // Logout succeeds and returns to the Login screen.
  await loginPage.expectLoaded();
  await loginPage.expectSignupLinkVisible();
});
```

- [x] **Step 6: Rewrite `tests/login.test.ts`**

```ts
// Login flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test } from './fixtures.js';

test('user can log in with an existing account', async ({
  loginPage,
  signupPage,
  homePage,
  user,
}, testInfo) => {
  // Signup + logout + login, plus the settle time after logout for the
  // driver's WebSocket to reconnect, runs past the default 30s timeout.
  testInfo.setTimeout(90_000);

  // Sign up a fresh account to reach the home screen.
  await loginPage.goToSignup();
  await signupPage.expectLoaded();
  await signupPage.signUp(user);
  await homePage.expectLoaded();

  // Log out, then wait for the Login screen.
  await homePage.logOut();
  await loginPage.expectLoaded();

  // Log back in with the same credentials used to sign up. This verifies
  // the account was actually persisted server-side, not just kept alive
  // in the current app session.
  await loginPage.login(user.email, user.password);

  // Login succeeds and navigates to the home screen.
  await homePage.expectLoaded();
});
```

- [x] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [x] **Step 8: Run the whole suite three times**

```bash
for i in 1 2 3; do npm test 2>&1 | grep -E "✘|✓|passed|failed"; done
```

Expected: signup, logout, login all `✓` on every run. One behavioural difference to watch for: `startLoggedOut` now runs as fixture setup before the test body, so `testInfo.setTimeout` inside a test applies after it. That step takes a few seconds against the default 30 s, so it should not matter; if a test now times out during setup, raise the timeout in `mobilewright.config.ts` for that reason rather than moving `ensureLoggedOut` back.

- [x] **Step 9: Document the fixtures in `docs/TEST_PLAN.md`**

In §1, after the "Page objects" paragraph, add a short "Fixtures" paragraph: `tests/fixtures.ts` extends `test` with `loginPage`, `signupPage`, `homePage`, `user`, and the auto `startLoggedOut`; tests import `test` from `./fixtures.js` and destructure what they need; new page classes get a fixture entry there. Also update the "Test data isolation" paragraph so it says `startLoggedOut` and the `user` fixture now cover what tests previously did by hand.

- [x] **Step 10: Commit**

```bash
git add tests/fixtures.ts tests/signup.test.ts tests/logout.test.ts tests/login.test.ts docs/TEST_PLAN.md
git commit -m "Add custom test fixtures and move existing tests onto them"
```

---

### Task 4: Observe the app's auth errors and record them

**Files:**
- Create: `tests/ui-strings.ts`
- Create (temporary, deleted before commit): `tests/probe.test.ts`
- Modify: `docs/TEST_PLAN.md` (§2 app map, add observed error copy)

**Interfaces:**
- Consumes: `test` and the page/`user` fixtures from Task 3.
- Produces: `tests/ui-strings.ts` exporting exactly:

```ts
export const UI = {
  login: {
    wrongPasswordError: string,
  },
  signup: {
    duplicateEmailError: string,
    emptyFieldsError: string,
    invalidEmailError: string,
    shortPasswordError: string,
  },
} as const;
```

Each value is the exact visible text the app shows, copied from the UI dump.

- [x] **Step 1: Confirm the device is up**

Run: `export MSYS_NO_PATHCONV=1; adb devices`
Expected: `emulator-5554  device`. If not, start it and wait for `adb shell getprop sys.boot_completed` to print `1`.

- [x] **Step 2: Write a throwaway probe test that stops on each error state**

Create `tests/probe.test.ts`. Change the `CASE` constant per run (`wrong-password`, `duplicate-email`, `empty`, `invalid-email`, `short-password`). It performs the action, then pauses 40 s so the UI can be dumped over adb.

```ts
import { test } from './fixtures.js';
import { randomTestUser } from './helpers.js';

const CASE: string = 'wrong-password';

test('probe', async ({ loginPage, signupPage, homePage, user }, testInfo) => {
  testInfo.setTimeout(180_000);

  if (CASE === 'wrong-password' || CASE === 'duplicate-email') {
    // Create an account and log out, so the email exists.
    await loginPage.goToSignup();
    await signupPage.signUp(user);
    await homePage.expectLoaded();
    await homePage.logOut();
    await loginPage.expectLoaded();
  }

  if (CASE === 'wrong-password') {
    await loginPage.login(user.email, `${user.password}-wrong`);
  } else {
    await loginPage.goToSignup();
    if (CASE === 'duplicate-email') {
      await signupPage.fillForm({ name: 'Another Person', email: user.email, password: user.password });
    } else if (CASE === 'invalid-email') {
      await signupPage.fillForm({ name: 'Probe User', email: 'not-an-email', password: user.password });
    } else if (CASE === 'short-password') {
      await signupPage.fillForm({ name: 'Probe User', email: randomTestUser().email, password: 'a' });
    }
    // CASE === 'empty': leave every field blank.
    await signupPage.submit();
  }
  await new Promise((r) => setTimeout(r, 40_000));
});
```

- [x] **Step 3: Run each case and dump the visible text**

For each `CASE` value, edit the constant, run the probe in the background, and dump the screen while it pauses:

```bash
export MSYS_NO_PATHCONV=1
npx mobilewright test tests/probe.test.ts > probe.log 2>&1 &
sleep 45    # cases that sign up and log out need ~30 s before the pause starts; the rest ~15 s
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml | grep -o 'text="[^"]*"' | grep -v '=""'
wait
```

Expected: the list contains the error message text in addition to the screen heading. Copy each error string exactly. Adjust the `sleep` if the dump shows the wrong screen. `*.log` is gitignored.

If a case shows no error text (for example the submit button is simply disabled), record that finding and leave that key out of `UI` (Step 5).

- [x] **Step 4: Delete the probe and its log**

```bash
rm tests/probe.test.ts probe.log
```

- [x] **Step 5: Write `tests/ui-strings.ts` with the exact strings observed**

```ts
// Exact error copy observed in the Expense Manager app (build 060dd245).
// Update here when the app's copy changes; tests import from this file
// so no test hard-codes UI text.
export const UI = {
  login: {
    wrongPasswordError: '<exact text from Step 3>',
  },
  signup: {
    duplicateEmailError: '<exact text from Step 3>',
    emptyFieldsError: '<exact text from Step 3>',
    invalidEmailError: '<exact text from Step 3>',
    shortPasswordError: '<exact text from Step 3>',
  },
} as const;
```

Replace each `<exact text from Step 3>` with the observed string. If a case produced no error text, omit that key and note it in Step 6; Task 6 skips the matching case.

- [x] **Step 6: Record findings in `docs/TEST_PLAN.md`**

In §2, add a line under the Login and Signup rows listing each observed error string, and note any case where the app shows no text (disabled button, silent no-op). Do not tick any checkbox yet.

- [x] **Step 7: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

```bash
git add tests/ui-strings.ts docs/TEST_PLAN.md
git commit -m "Record observed auth error copy in ui-strings"
```

---

### Task 5: Wrong-password login test — IN PROGRESS, see Progress Ledger

Steps 1-3 are done (code written, uncommitted). Steps 4-6 were interrupted
by discovering the Task 8 bug below — the failures seen during Step 5 were
that bug, not a problem with this test. **Do Task 8 first**, then restart
Task 5 at Step 4.

**Files:**
- Modify: `tests/pages/LoginPage.ts` (add `expectError`)
- Modify: `tests/pages/HomePage.ts` (add `expectNotLoaded`)
- Create: `tests/login-errors.test.ts`
- Modify: `docs/TEST_PLAN.md` (tick "Login with wrong password")

**Interfaces:**
- Consumes: `UI.login.wrongPasswordError` from `tests/ui-strings.ts`; `test` from `tests/fixtures.ts`; `LoginPage.login`, `SignupPage.signUp`, `HomePage.logOut/expectLoaded`.
- Produces:
  - `LoginPage.expectError(text: string): Promise<void>` (the given error text is visible)
  - `HomePage.expectNotLoaded(): Promise<void>` (the Logout button is not visible)

- [x] **Step 1: Add `expectError` to `tests/pages/LoginPage.ts`**

```ts
  async expectError(text: string) {
    await expect(this.screen.getByText(text)).toBeVisible();
  }
```

- [x] **Step 2: Add `expectNotLoaded` to `tests/pages/HomePage.ts`**

```ts
  async expectNotLoaded() {
    await expect(this.screen.getByLabel('Logout')).not.toBeVisible();
  }
```

- [x] **Step 3: Write the test**

Create `tests/login-errors.test.ts`:

```ts
// Login error-path tests for the Expense Manager app.
import { test } from './fixtures.js';
import { UI } from './ui-strings.js';

test('login with a wrong password shows an error and stays on Login', async ({
  loginPage,
  signupPage,
  homePage,
  user,
}, testInfo) => {
  // Signup + logout + settle time runs past the default 30s timeout.
  testInfo.setTimeout(90_000);

  await loginPage.goToSignup();
  await signupPage.signUp(user);
  await homePage.expectLoaded();
  await homePage.logOut();
  await loginPage.expectLoaded();

  await loginPage.login(user.email, `${user.password}-wrong`);

  await loginPage.expectError(UI.login.wrongPasswordError);
  await loginPage.expectLoaded();
  await homePage.expectNotLoaded();
});
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 5: Run the test three times**

```bash
for i in 1 2 3; do npx mobilewright test tests/login-errors.test.ts 2>&1 | grep -E "✘|✓|passed|failed"; done
```

Expected: three `✓` lines. On failure, diagnose (is it the known post-signup WebSocket drop?) rather than re-running. If it is that drop, add a 5000 ms settle after the submit tap in `SignupPage.submit()`, then re-run the whole suite three times, since the change is shared.

- [ ] **Step 6: Tick the plan item and commit**

In `docs/TEST_PLAN.md`, change `- [ ] Login with wrong password shows an error and stays on Login` to `- [x] ... (login-errors.test.ts)`.

```bash
git add tests/pages tests/login-errors.test.ts docs/TEST_PLAN.md
git commit -m "Add wrong-password login error test"
```

---

### Task 8: Fix SignupPage's keyboard dismissal (added mid-execution) — CODE WRITTEN, UNVERIFIED

Discovered while running Task 5 Step 5. `signup.test.ts`, `login.test.ts`,
`login-errors.test.ts` all call `SignupPage.signUp()` — its bug therefore
blocked verification of everything downstream, not just Task 5.

**What broke:** `SignupPage.submit()` dismissed the keyboard by tapping the
"Create Account" heading (a plan-mandated pattern from Task 1, itself
carried over from the pre-refactor test). On the emulator instance in use
this session, that tap stopped closing the keyboard — confirmed by the
`screenshotAfterEach` fixture's `final-screen` attachment on a failed run,
which showed the Signup form still fully filled in with the keyboard open
and Create Account never pressed. The submit tap was then silently
swallowed by the open keyboard, and the test hung until the 30s timeout,
surfacing as `WebSocket connection closed` — the same symptom as the
already-documented logout/keyboard WebSocket-drop issue (`docs/TEST_PLAN.md`
§4.5), which is why it read as infra flake at first. **Root-caused, not
assumed:** confirmed manually (clicking Create Account by hand in the
emulator worked fine — ruling out an app/backend bug) and via three
separate repro attempts, including one after a full cold-boot restart, all
of which hung the same way with the heading-tap approach.

**The fix:** dismiss via the hardware `BACK` button instead, which reliably
closes an open keyboard without navigating away (guarded so it's never
pressed when no keyboard is open, since Back would then leave the screen).

**Files:**
- Modify: `tests/pages/SignupPage.ts`

**Interfaces:**
- No change to `SignupPage`'s public shape (`fillForm`, `submit`, `signUp`
  keep their existing signatures). Internal only: adds a private
  `keyboardOpen` flag.

- [x] **Step 1: Track keyboard state and dismiss via Back**

Already applied in the working tree. Current `submit()`:

```ts
  async submit() {
    // Close the on-screen keyboard before tapping submit: it is still up
    // right after fill() and covers the submit button, so the tap would
    // never reach it. Tapping the heading used to close it, but on some
    // emulator instances it doesn't; the Back button reliably does, and only
    // does so while the keyboard is open (with no keyboard it would leave
    // the screen, hence the keyboardOpen guard).
    if (this.keyboardOpen) {
      await this.screen.pressButton('BACK');
      this.keyboardOpen = false;
      // Closing the keyboard relayouts the screen and briefly drops the
      // driver's WebSocket (same effect as the logout navigation); let it
      // reconnect before asserting.
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await expect(this.screen.getByTestId('submit-button')).toBeVisible();
    }
    await this.screen.getByTestId('submit-button').tap();
  }
```

`fillForm()` sets `this.keyboardOpen = true` when any field was filled (see
the file for the exact diff — already applied).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0. (Passed as of the last edit, but re-run since
this ledger update itself touched no `.ts` files — just confirm nothing
regressed.)

- [ ] **Step 3: Run `signup.test.ts` three times. This fix has never passed once — do not assume it works**

```bash
for i in 1 2 3; do npx mobilewright test tests/signup.test.ts 2>&1 | grep -E "✘|✓|passed|failed|Error"; done
```

Expected: three `✓` lines. If it still hangs the same way, re-check with
`screenshotAfterEach`'s `final-screen` attachment (`--reporter html`, then
inspect the PNG in `mobilewright-report/data/`) before changing anything
else — confirm what's actually on screen rather than guessing again.

- [ ] **Step 4: Run the whole existing suite three times**

```bash
for i in 1 2 3; do npm test 2>&1 | grep -E "✘|✓|passed|failed|Error"; done
```

Expected: every test `✓` on every run (`signup`, `logout`, `login`, plus
whatever of Task 5/7 is committed by the time this runs).

- [ ] **Step 5: Update `docs/TEST_PLAN.md` §4 with this lesson**

Add a numbered entry alongside the existing keyboard-dismissal lesson
(§4.1): the heading-tap dismissal pattern is emulator-instance-dependent
and not reliable; prefer the hardware Back button, guarded by tracking
whether the keyboard was actually opened.

- [ ] **Step 6: Commit**

Bundle with the also-uncommitted `restart-emulator` skill update (unrelated
file, but both came out of the same debugging session):

```bash
git add tests/pages/SignupPage.ts docs/TEST_PLAN.md .claude/skills/restart-emulator/SKILL.md
git commit -m "Fix SignupPage keyboard dismissal via Back button"
```

---

### Task 6: Signup duplicate-email and validation tests

**Files:**
- Modify: `tests/pages/SignupPage.ts` (add `expectError`)
- Create: `tests/signup-errors.test.ts`
- Modify: `docs/TEST_PLAN.md` (tick the two signup items)

**Interfaces:**
- Consumes: `UI.signup.*`; `test` from `tests/fixtures.ts`; `SignupPage.fillForm/submit/signUp/expectLoaded`, `LoginPage.goToSignup`, `HomePage.logOut/expectLoaded/expectNotLoaded`.
- Produces: `SignupPage.expectError(text: string): Promise<void>`.

- [ ] **Step 1: Add `expectError` to `tests/pages/SignupPage.ts`**

```ts
  async expectError(text: string) {
    await expect(this.screen.getByText(text)).toBeVisible();
  }
```

- [ ] **Step 2: Write the tests**

Create `tests/signup-errors.test.ts`. The validation cases are data-driven so each is its own reported test. If Task 4 omitted a `UI.signup` key because the app shows no text for that case, delete that case object and record why in Step 6.

```ts
// Signup error-path tests for the Expense Manager app.
import { test } from './fixtures.js';
import { randomTestUser } from './helpers.js';
import type { SignupFields } from './pages/SignupPage.js';
import { UI } from './ui-strings.js';

test('signup with an already-registered email shows an error', async ({
  loginPage,
  signupPage,
  homePage,
  user,
}, testInfo) => {
  testInfo.setTimeout(90_000);

  await loginPage.goToSignup();
  await signupPage.signUp(user);
  await homePage.expectLoaded();
  await homePage.logOut();
  await loginPage.expectLoaded();

  // Second signup reuses the email with a different name.
  await loginPage.goToSignup();
  await signupPage.expectLoaded();
  await signupPage.signUp({ name: 'Another Person', email: user.email, password: user.password });

  await signupPage.expectError(UI.signup.duplicateEmailError);
  await homePage.expectNotLoaded();
});

const validationCases: { title: string; fields: SignupFields; error: string }[] = [
  {
    title: 'empty fields',
    fields: {},
    error: UI.signup.emptyFieldsError,
  },
  {
    title: 'invalid email format',
    fields: { name: 'Valid Name', email: 'not-an-email', password: 'ValidPw123!' },
    error: UI.signup.invalidEmailError,
  },
  {
    title: 'too-short password',
    fields: { name: 'Valid Name', email: randomTestUser().email, password: 'a' },
    error: UI.signup.shortPasswordError,
  },
];

for (const { title, fields, error } of validationCases) {
  test(`signup validation: ${title} shows an inline error`, async ({
    loginPage,
    signupPage,
    homePage,
  }) => {
    await loginPage.goToSignup();
    await signupPage.expectLoaded();
    await signupPage.fillForm(fields);
    await signupPage.submit();

    await signupPage.expectError(error);
    await homePage.expectNotLoaded();
  });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 4: Run the file three times**

```bash
for i in 1 2 3; do npx mobilewright test tests/signup-errors.test.ts 2>&1 | grep -E "✘|✓|passed|failed"; done
```

Expected: every test `✓` on all three runs. A validation test that fails because state lingers from the previous test (the form left half-filled on the Signup screen, so `startLoggedOut` sees neither Logout nor "Welcome Back") is fixed by making `ensureLoggedOut` navigate back to Login in that state, not by a retry.

- [ ] **Step 5: Run the whole suite once**

Run: `npm test`
Expected: all tests pass, including `signup`, `logout`, `login`, `login-errors`, and `signup-errors`.

- [ ] **Step 6: Tick the plan items and commit**

In `docs/TEST_PLAN.md`, tick `Signup with an already-registered email shows an error` and `Signup validation: ...` with a pointer to `signup-errors.test.ts`. Add to §4 any new lesson learned. If a validation case was dropped in Step 2, leave that half of the validation item unticked and explain why.

```bash
git add tests/pages/SignupPage.ts tests/signup-errors.test.ts docs/TEST_PLAN.md
git commit -m "Add signup duplicate-email and validation error tests"
```

---

### Task 7: Screenshot after every test (added mid-execution) — CODE WRITTEN, UNCOMMITTED

Added at the user's request while diagnosing flaky failures in Task 5: every test attaches a screenshot of the final screen, pass or fail, so a failed run shows what the app looked like. Executed before Task 5's commit because it aids that diagnosis. In practice this fixture is what surfaced the Task 8 bug (the `final-screen` attachment on a failed run showed the Signup form stuck with the keyboard open) — do Task 8 before finishing this task's own Step 3 verification, since a clean full-suite run wasn't reachable until that bug is fixed.

**Files:**
- Modify: `tests/fixtures.ts`
- Modify: `docs/TEST_PLAN.md` (§1 Fixtures paragraph)

**Interfaces:**
- Consumes: `screen.screenshot(): Promise<Buffer>` and `testInfo.attach(...)`.
- Produces: an auto fixture `screenshotAfterEach: void`. No test asks for it.

**Design note:** a `test.afterEach` call inside `fixtures.ts` attaches only to the first test file that loads the module, so it would not cover every test. An auto fixture whose teardown runs after `use()` covers every test that imports `fixtures.ts` and is equivalent to `afterEach`.

- [ ] **Step 1: Add the fixture to `tests/fixtures.ts`**

Add `screenshotAfterEach: void;` to `AppFixtures`, and this entry to the `extend` object, after `startLoggedOut`:

```ts
  // After every test, pass or fail, attach a screenshot of the final screen
  // so a failed run shows what the app looked like. Best-effort: if the
  // driver connection is already gone, that must not mask the real failure.
  screenshotAfterEach: [
    async ({ screen }, use, testInfo) => {
      await use();
      try {
        const png = await screen.screenshot();
        await testInfo.attach('final-screen', { body: png, contentType: 'image/png' });
      } catch {
        // Screenshot unavailable (driver disconnected); keep the test's own result.
      }
    },
    { auto: true },
  ],
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Run the suite once and confirm screenshots are attached**

Run: `npm test`, then look under `test-results/` (or `npm run test:report` and open the report) for a `final-screen` PNG per test.
Expected: one screenshot per test, including passing ones.

- [ ] **Step 4: Document and commit**

Add one sentence to the §1 Fixtures paragraph in `docs/TEST_PLAN.md`: every test attaches a `final-screen` screenshot via the auto fixture `screenshotAfterEach`.

```bash
git add tests/fixtures.ts docs/TEST_PLAN.md docs/superpowers/plans/2026-09-19-p0-auth-error-tests.md
git commit -m "Attach a final-screen screenshot after every test"
```
