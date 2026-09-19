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

  async login(email: string, password: string) {
    await this.screen.getByTestId('email-input').fill(email);
    await this.screen.getByTestId('password-input').fill(password);
    // Dismiss the keyboard before tapping submit, same as on signup.
    await this.screen.getByText('Welcome Back').tap();
    await this.screen.getByTestId('submit-button').tap();
  }

  async expectSignupLinkVisible() {
    await expect(this.screen.getByLabel('Signup')).toBeVisible();
  }
}
