/** What a failed sign-in or sign-up looks like to the account screen. */
export interface AuthFailure {
  message: string;
  status?: number;
  /** The server never answered. */
  network?: boolean;
}

/** Turns a sign-in or sign-up failure into text a person can act on. */
export function friendlyAuthError({ message, status, network }: AuthFailure): string {
  if (network) return "Couldn't reach the server. Check your connection or the server address.";
  if (status === 409) return 'That username is taken';
  if (status === 403 && message === 'Registration is disabled on this server')
    return "This server doesn't allow new accounts";
  return message;
}
