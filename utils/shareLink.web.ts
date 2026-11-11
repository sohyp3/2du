export async function shareLink(url: string): Promise<'shared' | 'copied'> {
  await navigator.clipboard.writeText(url);
  return 'copied';
}
