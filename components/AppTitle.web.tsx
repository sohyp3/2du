import Head from 'expo-router/head';

// Static export puts an empty Helmet <title> first in <head>, and the browser uses the
// first one, so a <title> in +html.tsx is ignored. This fills that tag instead.
export function AppTitle() {
  return (
    <Head>
      <title>2du — make room for what matters</title>
    </Head>
  );
}
