// Signup flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test, expect } from '@mobilewright/test';
import { ensureLoggedOut, randomTestUser } from './helpers.js';

test('user can sign up with a new random account', async ({ screen }) => {
  const user = randomTestUser();

  await ensureLoggedOut(screen);

  // Navigate from Login to the Signup screen.
  await screen.getByLabel('Signup').tap();
  await expect(screen.getByText('Create Account')).toBeVisible();

  // Fill out the signup form with random credentials.
  await screen.getByTestId('name-input').fill(user.name);
  await screen.getByTestId('email-input').fill(user.email);
  await screen.getByTestId('password-input').fill(user.password);

  // Dismiss the on-screen keyboard before tapping submit: the keyboard is
  // still up right after fill(), and a tap on the submit button while it's
  // showing gets consumed by Android to close the keyboard instead of
  // reaching the button underneath, leaving the form stuck. Tapping the
  // (non-interactive) heading closes the keyboard harmlessly first.
  await screen.getByText('Create Account').first().tap();

  await screen.getByTestId('submit-button').tap();

  // Signup succeeds and navigates to the home screen.
  await expect(screen.getByText('Expense Groups')).toBeVisible();
  await expect(screen.getByLabel('Logout')).toBeVisible();
});
