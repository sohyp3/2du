import { Share } from 'react-native';

export async function shareLink(url: string): Promise<'shared' | 'copied'> {
  await Share.share({ message: url });
  return 'shared';
}
