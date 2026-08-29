// Shared test data helpers for the Expense Manager app tests.

function randomString(chars: string, length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const ALPHANUMERIC = `${LETTERS}0123456789`;

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
