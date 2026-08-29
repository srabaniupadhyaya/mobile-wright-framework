// Logout flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test, expect } from '@mobilewright/test';
import { randomTestUser } from './helpers';

test('user can log out after signing up', async ({ screen }) => {
  const user = randomTestUser();

  // Sign up a fresh account to reach the home screen.
  await expect(screen.getByText('Welcome Back')).toBeVisible();
  await screen.getByLabel('Signup').tap();
  await expect(screen.getByText('Create Account')).toBeVisible();

  await screen.getByPlaceholder('John Doe').fill(user.name);
  await screen.getByPlaceholder('john@example.com').fill(user.email);
  await screen.getByPlaceholder('••••••••').fill(user.password);

  // Dismiss the on-screen keyboard before tapping submit (see signup.test.ts).
  await screen.getByText('Create Account').first().tap();
  await screen.getByLabel('Create Account').tap();

  await expect(screen.getByText('Expense Groups')).toBeVisible();

  // Log out.
  await screen.getByLabel('Logout').tap();

  // Logout succeeds and returns to the Login screen.
  await expect(screen.getByText('Welcome Back')).toBeVisible();
  await expect(screen.getByLabel('Signup')).toBeVisible();
});
