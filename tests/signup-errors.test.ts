// Signup error-path tests for the Expense Manager app.
import { test } from './fixtures.js';
import { randomTestUser } from './helpers.js';
import type { SignupFields } from './pages/SignupPage.js';
import { UI } from './ui-strings.js';

test('signup with an already-registered email shows an error', async ({
  loginPage,
  signupPage,
  homePage,
  user,
}, testInfo) => {
  // Two signups + logout + settle time.
  testInfo.setTimeout(120_000);

  await loginPage.goToSignup();
  await signupPage.signUp(user);
  await homePage.expectLoaded();
  await homePage.logOut();
  await loginPage.expectLoaded();

  // Second signup reuses the email with a different name.
  await loginPage.goToSignup();
  await signupPage.expectLoaded();
  await signupPage.signUp({ name: 'Another Person', email: user.email, password: user.password });

  await signupPage.expectError(UI.signup.duplicateEmailError);
  await homePage.expectNotLoaded();
});

// The app reports only the first failing field, in a native "Validation" alert.
const validationCases: { title: string; fields: SignupFields; error: string }[] = [
  {
    title: 'empty fields',
    fields: {},
    error: UI.signup.emptyFieldsError,
  },
  {
    title: 'invalid email format',
    fields: { name: 'Valid Name', email: 'not-an-email', password: 'ValidPw123!' },
    error: UI.signup.invalidEmailError,
  },
  {
    title: 'too-short password',
    fields: { name: 'Valid Name', email: randomTestUser().email, password: 'a' },
    error: UI.signup.shortPasswordError,
  },
];

for (const { title, fields, error } of validationCases) {
  test(`signup validation: ${title} shows a validation alert`, async ({
    loginPage,
    signupPage,
    homePage,
  }, testInfo) => {
    testInfo.setTimeout(60_000);

    await loginPage.goToSignup();
    await signupPage.expectLoaded();
    await signupPage.fillForm(fields);
    await signupPage.submit();

    await signupPage.expectValidationAlert(error);
    await signupPage.dismissValidationAlert();
    await signupPage.expectLoaded();
    await homePage.expectNotLoaded();
  });
}
