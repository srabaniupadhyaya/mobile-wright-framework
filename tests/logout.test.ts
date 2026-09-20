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
