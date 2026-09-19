// Page object for the Expense Manager Signup screen.
import { expect } from '@mobilewright/test';
import type { Screen } from '@mobilewright/core';

export type SignupFields = { name?: string; email?: string; password?: string };

export class SignupPage {
  private readonly screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  async expectLoaded() {
    await expect(this.screen.getByText('Create Account')).toBeVisible();
  }

  /** Fills only the fields provided; omitted fields are left empty. */
  async fillForm(fields: SignupFields) {
    if (fields.name) await this.screen.getByTestId('name-input').fill(fields.name);
    if (fields.email) await this.screen.getByTestId('email-input').fill(fields.email);
    if (fields.password) await this.screen.getByTestId('password-input').fill(fields.password);
  }

  async submit() {
    // Dismiss the on-screen keyboard before tapping submit: the keyboard is
    // still up right after fill(), and a tap on the submit button while it's
    // showing gets consumed by Android to close the keyboard instead of
    // reaching the button underneath, leaving the form stuck. Tapping the
    // (non-interactive) heading closes the keyboard harmlessly first.
    await this.screen.getByText('Create Account').first().tap();
    await this.screen.getByTestId('submit-button').tap();
  }

  async signUp(user: { name: string; email: string; password: string }) {
    await this.fillForm(user);
    await this.submit();
  }
}
