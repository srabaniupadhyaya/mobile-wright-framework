import { defineConfig } from 'mobilewright';

export default defineConfig({
  testDir: './tests',
  platform: 'android',
  bundleId: 'com.navindalmia.expensemanager.staging',
  timeout: 30_000,
});
