export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIREMENTS_HINT =
  "8+ characters, with an uppercase letter, a lowercase letter, and a number.";

/** Returns a user-facing error message if the password doesn't meet the
 * requirements, or null if it's fine. Used both client-side (for the
 * hint) and server-side in signUpAction — a Server Function is reachable
 * via direct POST, so client-only validation isn't enough on its own. */
export function passwordError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  return null;
}
