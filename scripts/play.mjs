// Read the live version of an app from its public Google Play listing.
//
// The listing page embeds the version in its AF_initDataCallback payload as
//   ...,[[["8.2.0"]],[[[36]],...      (also as `"141":[[["8.2.0"]],...`)
// (the trailing `[[[<number>]]` is the required-Android-API marker).
// Some listings (e.g. com.watch_go.watch2048) expose no version at all; those
// return `parse_failed` and keep the previously stored value. No
// credentials are needed, but the markup is undocumented, so every failure is
// reported as `null` and callers fall back to previously stored data.

const VERSION_RE = /\[\[\["(\d[^"\]]{0,39})"\]\],\[\[\[\d+\]\]/;

export function extractPlayVersion(html) {
  if (!html) return null;
  const m = VERSION_RE.exec(html);
  return m ? m[1] : null;
}

export function playListingUrl(pkg) {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}&hl=en&gl=US`;
}

// Returns { status: 'ok' | 'not_found' | 'parse_failed' | 'error', version }.
//  - not_found: the listing does not exist (app not published / removed)
//  - parse_failed: page loaded but no version marker found (markup changed?)
//  - error: network/HTTP failure
export async function fetchPlayVersion({ pkg, fetchFn = fetch }) {
  if (!pkg) return { status: 'error', version: null };
  let res;
  try {
    res = await fetchFn(playListingUrl(pkg), {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; watch-go-now-dashboard)', 'Accept-Language': 'en-US,en;q=0.9' },
    });
  } catch {
    return { status: 'error', version: null };
  }
  if (res.status === 404) return { status: 'not_found', version: null };
  if (!res.ok || typeof res.text !== 'function') return { status: 'error', version: null };
  const version = extractPlayVersion(await res.text());
  return version ? { status: 'ok', version } : { status: 'parse_failed', version: null };
}
