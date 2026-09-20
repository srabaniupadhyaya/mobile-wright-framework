// Exact error copy observed in the Expense Manager app (build 060dd245).
// Update here when the app's copy changes; tests import from this file
// so no test hard-codes UI text.
//
// Where each message appears:
//  - wrongPasswordError, duplicateEmailError: inline text on the form screen.
//  - the other three: a native alert titled "Validation" with an "OK"
//    button. The alert reports only the first failing field, so
//    emptyFieldsError is the email message.
export const UI = {
  login: {
    wrongPasswordError: 'Invalid email or password',
  },
  signup: {
    duplicateEmailError: 'Unable to create account. Please try another email.',
    emptyFieldsError: 'Email is required',
    invalidEmailError: 'Please enter a valid email',
    shortPasswordError: 'Password must be at least 8 characters',
  },
} as const;
