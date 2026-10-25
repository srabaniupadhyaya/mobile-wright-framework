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
