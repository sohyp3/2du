/** The links for a calendar feed key: the plain https URL, the webcal:// URL calendar apps
 * subscribe to, and Google Calendar's "add by URL" link. */
export function feedUrls(
  server: string,
  key: string
): { https: string; webcal: string; google: string } {
  const https = `${server.replace(/\/+$/, '')}/feed/${key}.ics`;
  const webcal = https.replace(/^[a-z][a-z0-9+.-]*:\/\//i, 'webcal://');
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
  };
}
