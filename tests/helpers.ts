// Shared test data helpers for the Expense Manager app tests.
import { expect } from '@mobilewright/test';
import type { Screen } from '@mobilewright/core';

function randomString(chars: string, length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const ALPHANUMERIC = `${LETTERS}0123456789`;

/**
 * Ensure the app starts each test from the logged-out (Login) screen.
 *
 * A previous test in the same run (or a leftover session from a prior run)
 * can leave the app signed in, since the app persists auth state across
 * launches and there's no automatic reset between tests. Tests that assume
 * they start at the Login screen call this first so they're self-contained
 * regardless of what ran before them.
 */
export async function ensureLoggedOut(screen: Screen) {
  if (await screen.getByLabel('Logout').isVisible({ timeout: 2000 })) {
    await screen.getByLabel('Logout').tap();
  }
  await expect(screen.getByText('Welcome Back')).toBeVisible();
}

export function randomTestUser() {
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
