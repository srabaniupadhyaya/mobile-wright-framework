// Logout flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test, expect } from '@mobilewright/test';
import { ensureLoggedOut, randomTestUser } from './helpers.js';

test('user can log out after signing up', async ({ screen }, testInfo) => {
  // The full signup + logout round trip, plus the settle time below for the
  // driver's WebSocket to reconnect after the logout navigation, runs past
  // the default 30s test timeout.
  testInfo.setTimeout(60_000);

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

  // Log out.
  await screen.getByLabel('Logout').tap();

  // The logout navigation transition briefly drops the automation
  // WebSocket connection (the app itself lands on the Login screen fine —
  // this is purely the driver reconnecting). Give it a moment to settle
  // before polling, otherwise the very next assertion can hit the drop and
  // time out waiting on a connection that's about to come back.
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Logout succeeds and returns to the Login screen.
  await expect(screen.getByText('Welcome Back')).toBeVisible();
  await expect(screen.getByLabel('Signup')).toBeVisible();
});
