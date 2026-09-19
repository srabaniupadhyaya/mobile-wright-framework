// Page object for the Expense Manager Home (Expense Groups) screen.
import { expect } from '@mobilewright/test';
import type { Screen } from '@mobilewright/core';

export class HomePage {
  private readonly screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  async expectLoaded() {
    await expect(this.screen.getByText('Expense Groups')).toBeVisible();
    await expect(this.screen.getByLabel('Logout')).toBeVisible();
  }

  async isLoggedIn() {
    return this.screen.getByLabel('Logout').isVisible({ timeout: 2000 });
  }

  async tapLogout() {
    await this.screen.getByLabel('Logout').tap();
  }

  /**
   * Log out, then wait for the driver to settle. The logout navigation
   * transition briefly drops the automation WebSocket connection (the app
   * itself lands on the Login screen fine; this is purely the driver
   * reconnecting). Without the pause, the very next assertion can hit the
   * drop and time out.
   */
  async logOut() {
    await this.tapLogout();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
