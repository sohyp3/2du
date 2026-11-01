import { Redirect } from 'expo-router';

export default function SyncRedirect() {
  return <Redirect href={{ pathname: '/settings', params: { tab: 'sync' } }} />;
}
