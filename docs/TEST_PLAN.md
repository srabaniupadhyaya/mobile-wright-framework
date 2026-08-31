# Expense Manager — Test Plan

A guide for writing the next set of automated tests against the Expense
Manager Android app using mobilewright. Written for someone new to both
mobile testing and mobilewright — start with the primer below if the test
code in `tests/` looks unfamiliar.

See `docs/PLAN.md` for how the environment (emulator, SDK, `mobilewright.config.ts`)
was originally set up — that doc is a historical setup log. This one is about
what to test next and how.

---

## 1. Mobilewright primer

Mobilewright is a Playwright-style framework, but for native mobile apps
instead of browsers. If you've never used Playwright either, the concepts to
know are:

- **`screen`** — the fixture every test gets, representing the current app
  UI. You query it for elements and act on them.
- **Locators** — you don't grab elements by pixel coordinates. You describe
  *what* you want:
  - `screen.getByText('Expense Groups')` — matches by visible text.
  - `screen.getByLabel('Logout')` — matches by accessibility label
    (Android's `content-desc`).
  - `screen.getByPlaceholder('John Doe')` — matches a text input by its
    placeholder/hint text.
  - Locators are lazy — building one doesn't search the screen yet. Actions
    (`.tap()`, `.fill()`) and assertions do.
- **Actions**: `.tap()`, `.fill(text)`, `.clear()`. These auto-wait for the
  element to become visible/enabled before acting, and auto-retry briefly if
  the layout is still settling — you rarely need manual `sleep`s.
- **Assertions**: `await expect(locator).toBeVisible()`,
  `.not.toBeVisible()`, `.toHaveText(...)`, etc. — these retry for up to the
  test timeout (30s by default here, see `mobilewright.config.ts`) before
  failing, so don't wrap them in extra retry loops yourself.
- **`.first()` / `.nth(i)`** — when a query matches more than one element
  (e.g. `getByText('Create Account')` matches both a screen heading and a
  button's label), disambiguate with these instead of making the text more
  specific than it needs to be.
- **Fixtures**: `test('name', async ({ screen, device }) => { ... })`.
  `device` gives you lower-level access (screenshots, `pressButton`,
  orientation) when a locator-level action isn't enough.

**Running tests:**
```
npm test                    # mobilewright test — runs everything in tests/
npx mobilewright test tests/logout.test.ts   # a single file
npm run test:report         # runs, then serves an HTML report with
npm run report              #   screenshots/traces per test (open separately)
```

**Test data isolation:** each test should create its own fresh
account/data rather than depending on state left by another test or a
previous run. `tests/helpers.ts` has `randomTestUser()` for this. Between
full local runs, `adb shell pm clear com.navindalmia.expensemanager` wipes
the app to a logged-out state — do this if a test fails and you suspect
stale state (an old session, a leftover group) rather than a real bug.

---

## 2. App map (what's been verified so far)

Confirmed by walking the app manually and via the existing tests
(`tests/signup.test.ts`, `tests/logout.test.ts`, `tests/example.test.ts`):

| Screen | Key elements | Notes |
|---|---|---|
| **Login** | `email-input`, `password-input`, `submit-button` (label "Login"), "Signup" link | Heading text: "Expense Manager" / "Welcome Back" |
| **Signup** | `name-input`, `email-input`, `password-input`, `submit-button` (label "Create Account"), "Login" link | Full name only accepts letters/spaces/hyphens/apostrophes — reject digits. Submit tap must happen after the keyboard is dismissed (see §4). |
| **Home (Expense Groups)** | Heading "Expense Groups", "Logout" button, "+ New" button (label "Create new group"), group list or empty state ("No expense groups yet") | Reached after signup/login. |
| **Create Group** | "Group Name" (required), "Description" (optional, 500 char limit), "Default Currency" (GBP/USD/EUR/INR/AUD/CAD/JPY/CNY, defaults to GBP), Cancel/Create buttons | Not yet covered by a test. |

**Not yet explored — needs a manual walkthrough before writing tests:**
- Opening a created group (expense list within a group, empty state, totals)
- Adding/editing/deleting an individual expense
- Splitting an expense between members / who-owes-who ("settle up")
- Inviting or managing group members
- Editing or deleting a group
- Any account/profile screen, password reset, or email verification flow
  (the API response includes a `requireEmailVerification` flag — worth
  checking what UI that drives)

Do this exploration once, screenshot each screen (`await
screen.screenshot()`, write to a PNG, inspect it), and fill in this table
before writing the next batch of tests — don't guess at element labels.

---

## 3. Proposed test coverage, in priority order

### P0 — Auth (mostly done)
- [x] App launches to Login screen (`example.test.ts`)
- [x] Sign up with a new random account (`signup.test.ts`)
- [x] Log out (`logout.test.ts`)
- [ ] **Log in** with an existing account (sign up, log out, then log back in
  with the same credentials — verifies the account actually persisted
  server-side, not just the in-session state)
- [ ] Login with wrong password shows an error and stays on Login
- [ ] Signup with an already-registered email shows an error
- [ ] Signup validation: empty fields, invalid email format, weak/short
  password — assert the appropriate inline error, not just "stays on
  screen" (see §4 on why "stays on screen" alone is a weak assertion)

### P1 — Group management
- [ ] Create a group with just the required Group Name; verify it appears
  in the home list
- [ ] Create a group with description + non-default currency; verify both
  are reflected wherever the group displays them
- [ ] Group Name is required — Create button disabled or validation error
  when empty
- [ ] Description respects the 500-char limit (this is exactly the kind of
  boundary a UI test is good at — try 500, 501, and confirm the counter
  and the submitted value)
- [ ] Multiple groups: create two, confirm both list, confirm opening each
  shows the right one

### P1 — Expense management (pending exploration, see §2)
- [ ] Add an expense to a group with an amount/description; verify it
  appears in the group's expense list and any running total updates
- [ ] Edit an existing expense
- [ ] Delete an expense
- [ ] Add an expense with invalid amount (negative, zero, non-numeric) —
  verify validation

### P2 — Cross-cutting / edge cases
- [ ] Session persistence: log in, kill and relaunch the app
  (`device.terminateApp()` / relaunch — check what `@mobilewright/test`'s
  `autoAppLaunch` does here), confirm still logged in (or confirm it
  requires re-login, whichever is the intended behavior — this is worth
  clarifying as a product question, not assuming)
- [ ] Logout actually clears session: after logout, relaunch and confirm
  Login screen appears, not Home
- [ ] Empty states render correctly: brand-new account's Home screen,
  a group with zero expenses

### P3 — Non-functional (lower priority, do once the above is stable)
- [ ] Screen rotation doesn't break layout mid-flow (if the app supports
  landscape at all — check first)
- [ ] Basic performance sanity: signup/login complete within a reasonable
  time when the backend is warm (see §4 re: cold starts)

---

## 4. Lessons learned this session — read before writing new tests

These are real issues hit while building the existing three tests. Avoid
repeating the investigation:

1. **A tap right after `.fill()` can get eaten by the keyboard.** On this
   app, tapping a submit button while the on-screen keyboard is still open
   sometimes just dismisses the keyboard instead of registering the tap on
   the button underneath. Pattern used in `signup.test.ts`: tap a harmless
   non-interactive element (e.g. the screen heading) first to close the
   keyboard, *then* tap the real button.

2. **Don't assert on the absence of ambiguous text.** The original signup
   test asserted `getByText('Create Account')` became *not* visible after
   submit — but that text matches both the screen heading and (transiently)
   the submit button's own label, so the assertion was weak and masked a
   real bug for a while. Prefer asserting the presence of something that
   only exists on the *destination* screen (e.g. `"Expense Groups"` after
   signup succeeds).

3. **Random test data needs to respect field validation.** The original
   `randomString()` helper mixed letters and digits and used it for the
   name field too — but the name field rejects digits, so ~most runs failed
   signup validation silently. `tests/helpers.ts` now uses a letters-only
   generator for anything that becomes a "name". Check each field's actual
   validation rules before generating random data for it.

4. **The backend can cold-start.** The API
   (`expense-manager-udoo.onrender.com`) is hosted on a free tier that
   sleeps after inactivity; the first request after a while can take much
   longer than the test timeout, which looks exactly like a hung UI (a
   permanent loading spinner). If a test fails this way after a period of
   no activity, retry before assuming it's a real regression — but also
   don't wave away *every* timeout as this cause without checking.

5. **The mobilewright↔emulator connection itself can drop mid-test**
   (`WebSocket connection closed`), independent of anything the test or
   app is doing. This looks identical to a real timeout in the output.
   Retrying the same test immediately is the fastest way to tell infra
   flake apart from a real bug — if it passes clean on retry with no code
   change, it was infra.

6. **`nodenext` module resolution needs explicit `.js` extensions** on
   relative imports even in `.ts` files (e.g. `from './helpers.js'`, not
   `'./helpers'`) — `tsc --noEmit` will catch this (TS2835) if missed.

---

## 5. Suggested next steps, concretely

1. Do the manual exploration in §2 (group detail, add/edit/delete expense)
   and fill in the app map.
2. Write `tests/login.test.ts` (P0, listed above) — it's the biggest gap
   and reuses everything already in `tests/helpers.ts`.
3. Write `tests/create-group.test.ts` covering the P1 group creation cases.
4. Once expense screens are mapped, add `tests/expenses.test.ts`.
5. Revisit `mobilewright.config.ts`'s 30s default timeout once cold-start
   behavior (§4.4) is better understood — consider a longer timeout
   specifically for the first test in a run, or a warm-up ping.
