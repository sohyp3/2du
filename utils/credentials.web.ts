// Browser sessions end when the tab closes; passwords are never persisted.
export const readCredential = async (key: string) => sessionStorage.getItem(key);
export const writeCredential = async (key: string, value: string) => {
  sessionStorage.setItem(key, value);
};
export const deleteCredential = async (key: string) => {
  sessionStorage.removeItem(key);
};
