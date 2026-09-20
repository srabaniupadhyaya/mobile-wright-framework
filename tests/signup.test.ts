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
