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
