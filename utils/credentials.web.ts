// The session token outlives the tab so the app reopens signed in, including offline.
// Passwords are never stored here; the browser's password manager handles those.
export const readCredential = async (key: string) => localStorage.getItem(key);
export const writeCredential = async (key: string, value: string) => {
  localStorage.setItem(key, value);
};
export const deleteCredential = async (key: string) => {
  localStorage.removeItem(key);
};
