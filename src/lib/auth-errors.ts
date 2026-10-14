export function isCredentialsSignInError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "CredentialsSignin" ||
    error.message === "CredentialsSignin" ||
    error.message.includes("CredentialsSignin")
  );
}
