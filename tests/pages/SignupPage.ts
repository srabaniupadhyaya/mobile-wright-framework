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

  async isLoaded() {
    return this.screen.getByTestId('name-input').isVisible({ timeout: 2000 });
  }

  async goToLogin() {
    await this.screen.getByLabel('Login').tap();
  }

  /** Inline error text shown on the form (e.g. duplicate email). */
  async expectError(text: string) {
    await expect(this.screen.getByText(text)).toBeVisible();
  }

  /** Native "Validation" alert; it blocks the screen until dismissed. */
  async expectValidationAlert(text: string) {
    await expect(this.screen.getByText('Validation')).toBeVisible();
    await expect(this.screen.getByText(text)).toBeVisible();
  }

  async dismissValidationAlert() {
    await this.screen.getByText('OK').tap();
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
    // (non-interactive) heading closes the keyboard harmlessly first — this
    // is a safe no-op if the keyboard is already closed, unlike the hardware
    // Back button (tried and reverted: Back exits the screen entirely when
    // there's nothing left to dismiss, and on this app one Back press from
    // Signup ejects all the way to the Android launcher — a worse failure
    // mode than the tap simply not registering).
    await this.screen.getByText('Create Account').first().tap();
    await this.screen.getByTestId('submit-button').tap();
    // The submit tap can trigger a navigation (success → Home) or an
    // inline/native error (validation, duplicate email) — either way it's a
    // screen transition, and like Logout and the keyboard-dismiss above,
    // that briefly drops the driver's WebSocket. Let it settle before the
    // caller asserts on whatever comes next.
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  async signUp(user: { name: string; email: string; password: string }) {
    await this.fillForm(user);
    await this.submit();
  }
}
