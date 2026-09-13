// Login flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test, expect } from '@mobilewright/test';
import { ensureLoggedOut, randomTestUser } from './helpers.js';

test('user can log in with an existing account', async ({ screen }, testInfo) => {
  // Signup + logout + login, plus the settle time after logout for the
  // driver's WebSocket to reconnect, runs past the default 30s timeout.
  testInfo.setTimeout(90_000);

  const user = randomTestUser();

  // Sign up a fresh account to reach the home screen.
  await ensureLoggedOut(screen);
  await screen.getByLabel('Signup').tap();
  await expect(screen.getByText('Create Account')).toBeVisible();

  await screen.getByTestId('name-input').fill(user.name);
  await screen.getByTestId('email-input').fill(user.email);
  await screen.getByTestId('password-input').fill(user.password);

  // Dismiss the on-screen keyboard before tapping submit (see signup.test.ts).
  await screen.getByText('Create Account').first().tap();
  await screen.getByTestId('submit-button').tap();

  await expect(screen.getByText('Expense Groups')).toBeVisible();

  // Log out, then wait for the driver's WebSocket to reconnect after the
  // logout navigation reset (see logout.test.ts).
  await screen.getByLabel('Logout').tap();
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await expect(screen.getByText('Welcome Back')).toBeVisible();

  // Log back in with the same credentials used to sign up. This verifies
  // the account was actually persisted server-side, not just kept alive
  // in the current app session.
  await screen.getByTestId('email-input').fill(user.email);
  await screen.getByTestId('password-input').fill(user.password);

  // Dismiss the keyboard before tapping submit, same as on signup.
  await screen.getByText('Welcome Back').tap();
  await screen.getByTestId('submit-button').tap();

  // Login succeeds and navigates to the home screen.
  await expect(screen.getByText('Expense Groups')).toBeVisible();
  await expect(screen.getByLabel('Logout')).toBeVisible();
});
