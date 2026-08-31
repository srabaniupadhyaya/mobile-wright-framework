// Logout flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test, expect } from '@mobilewright/test';
import { randomTestUser } from './helpers.js';

test('user can log out after signing up', async ({ screen }) => {
  const user = randomTestUser();

  // Sign up a fresh account to reach the home screen.
  await expect(screen.getByText('Welcome Back')).toBeVisible();
  await screen.getByLabel('Signup').tap();
  await expect(screen.getByText('Create Account')).toBeVisible();

  await screen.getByTestId('name-input').fill(user.name);
  await screen.getByTestId('email-input').fill(user.email);
  await screen.getByTestId('password-input').fill(user.password);

  // Dismiss the on-screen keyboard before tapping submit (see signup.test.ts).
  await screen.getByText('Create Account').first().tap();
  await screen.getByTestId('submit-button').tap();

  await expect(screen.getByText('Expense Groups')).toBeVisible();

  // Log out.
  await screen.getByLabel('Logout').tap();

  // Logout succeeds and returns to the Login screen.
  await expect(screen.getByText('Welcome Back')).toBeVisible();
  await expect(screen.getByLabel('Signup')).toBeVisible();
});
