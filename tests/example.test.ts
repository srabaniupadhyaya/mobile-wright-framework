// this is a skeleton test for mobilewright (see https://github.com/mobile-next/mobilewright/blob/main/README.md)
// for documentation see: https://mobilewright.dev/docs/
// for agent skill see: https://github.com/mobile-next/mobilewright-skill
import { test, expect } from '@mobilewright/test';

test('app launches and shows login screen', async ({ screen, device }) => {
  await expect(screen.getByText('Expense Manager')).toBeVisible();
  await expect(screen.getByText('Welcome Back')).toBeVisible();
});
