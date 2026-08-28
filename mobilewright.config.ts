import { defineConfig } from 'mobilewright';

export default defineConfig({
  testDir: './tests',
  platform: 'android',
  bundleId: 'com.navindalmia.expensemanager',
  timeout: 30_000,
});
