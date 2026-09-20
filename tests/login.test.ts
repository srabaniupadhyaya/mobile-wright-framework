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
