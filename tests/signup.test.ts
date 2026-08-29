// Signup flow test for the Expense Manager app.
// for documentation see: https://mobilewright.dev/docs/
import { test, expect } from '@mobilewright/test';

function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function randomTestUser() {
  const suffix = randomString(8);
  return {
    name: `Test User ${suffix}`,
    email: `test.${suffix}@example.com`,
    password: `Pw${randomString(6)}!9`,
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

  await screen.getByLabel('Create Account').tap();

  // Signup succeeds and the Create Account screen is no longer shown.
  await expect(screen.getByText('Create Account')).not.toBeVisible();
});
