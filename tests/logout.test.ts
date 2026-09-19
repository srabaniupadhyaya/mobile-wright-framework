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
