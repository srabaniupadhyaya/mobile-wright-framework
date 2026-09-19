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
