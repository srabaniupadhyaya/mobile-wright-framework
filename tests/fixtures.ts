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
  screenshotAfterEach: void;
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
    // Own timeout, so the (slow) screenshot doesn't eat the test's budget.
    { auto: true, timeout: 30_000 },
  ],
});

export { expect } from '@mobilewright/test';
