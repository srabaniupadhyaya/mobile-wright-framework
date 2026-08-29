// Signup flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test, expect } from '@mobilewright/test';

function randomString(chars: string, length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const ALPHANUMERIC = `${LETTERS}0123456789`;

function randomTestUser() {
  // The full name field only accepts letters, spaces, hyphens, and
  // apostrophes, so its suffix must stay letters-only. The email/password
  // suffix has no such restriction, so it can use digits too.
  const nameSuffix = randomString(LETTERS, 8);
  const emailSuffix = randomString(ALPHANUMERIC, 8);
  return {
    name: `Test User ${nameSuffix}`,
    email: `test.${emailSuffix}@example.com`,
    password: `Pw${randomString(ALPHANUMERIC, 6)}!9`,
  };
}

test('user can sign up with a new random account', async ({ screen }) => {
  const user = randomTestUser();

  await expect(screen.getByText('Welcome Back')).toBeVisible();

  // Navigate from Login to the Signup screen.
  await screen.getByLabel('Signup').tap();
  await expect(screen.getByText('Create Account')).toBeVisible();

  // Fill out the signup form with random credentials.
  await screen.getByPlaceholder('John Doe').fill(user.name);
  await screen.getByPlaceholder('john@example.com').fill(user.email);
  await screen.getByPlaceholder('••••••••').fill(user.password);

  // Dismiss the on-screen keyboard before tapping submit: the keyboard is
  // still up right after fill(), and a tap on the submit button while it's
  // showing gets consumed by Android to close the keyboard instead of
  // reaching the button underneath, leaving the form stuck. Tapping the
  // (non-interactive) heading closes the keyboard harmlessly first.
  await screen.getByText('Create Account').first().tap();

  await screen.getByLabel('Create Account').tap();

  // Signup succeeds and navigates to the home screen.
  await expect(screen.getByText('Expense Groups')).toBeVisible();
  await expect(screen.getByLabel('Logout')).toBeVisible();
});
