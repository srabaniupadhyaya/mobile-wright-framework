// Signup flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test, expect } from '@mobilewright/test';
import { randomTestUser } from './helpers.js';

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
