// Page object for the Expense Manager Login screen.
import { expect } from '@mobilewright/test';
import type { Screen } from '@mobilewright/core';

export class LoginPage {
  private readonly screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  async expectLoaded() {
    await expect(this.screen.getByText('Welcome Back')).toBeVisible();
  }

  async goToSignup() {
    await this.screen.getByLabel('Signup').tap();
  }

  async expectSignupLinkVisible() {
    await expect(this.screen.getByLabel('Signup')).toBeVisible();
  }
}
