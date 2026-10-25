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

test('login with an unregistered email shows the same generic error', async ({
  loginPage,
  homePage,
  user,
}, testInfo) => {
  testInfo.setTimeout(60_000);

  // `user` was never signed up, so this email has no account. The app should
  // not reveal that, so the message matches the wrong-password one.
  await loginPage.login(user.email, user.password);

  await loginPage.expectError(UI.login.wrongPasswordError);
  await loginPage.expectLoaded();
  await homePage.expectNotLoaded();
});

const validationCases = [
  { title: 'empty fields', email: '', password: '', error: UI.login.emptyFieldsError },
  {
    title: 'email but no password',
    email: 'someone@example.com',
    password: '',
    error: UI.login.missingPasswordError,
  },
];

for (const { title, email, password, error } of validationCases) {
  test(`login validation: ${title} shows a validation alert`, async ({
    loginPage,
    homePage,
  }, testInfo) => {
    testInfo.setTimeout(60_000);

    await loginPage.login(email, password);

    await loginPage.expectValidationAlert(error);
    await loginPage.dismissValidationAlert();
    await loginPage.expectLoaded();
    await homePage.expectNotLoaded();
  });
}
