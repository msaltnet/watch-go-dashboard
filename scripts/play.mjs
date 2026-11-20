// Read live store info (version, install bucket, rating) of an app from its
// public Google Play listing. No credentials needed, but the markup is
// undocumented, so every failure is reported and callers fall back to
// previously stored data.
//
// Version:  ...,[[["8.2.0"]],[[[36]],...      (also as `"141":[[["8.2.0"]],...`)
//           (the trailing `[[[<number>]]` is the required-Android-API marker)
//           Some listings (e.g. com.watch_go.watch2048) expose none at all.
// Installs: ["10,000+",10000,17210,"10K+"]   -> Play's own bucket label "10K+"
// Updated:  <div>Updated on</div><div ...>Nov 8, 2026</div>  (hl=en) -> ISO date
// Rating:   JSON-LD aggregateRating {ratingValue, ratingCount}; absent when the
//           app has no ratings yet (legit, not a failure).

const VERSION_RE = /\[\[\["(\d[^"\]]{0,39})"\]\],\[\[\[\d+\]\]/;
const INSTALLS_RE = /\["[\d,.]+[KMB]?\+",\d+,\d+,"([\d,.]+[KMB]?\+)"\]/;
const RATING_RE = /"aggregateRating":\{[^}]*?"ratingValue":"([\d.]+)"[^}]*?"ratingCount":"(\d+)"/;

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const UPDATED_RE = /Updated on<\/div><div[^>]*>([A-Z][a-z]{2}) (\d{1,2}), (\d{4})</;

export function extractPlayUpdated(html) {
  if (!html) return null;
  const m = UPDATED_RE.exec(html);
  if (!m || !MONTHS[m[1]]) return null;
  return `${m[3]}-${String(MONTHS[m[1]]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
}

export function extractPlayVersion(html) {
  if (!html) return null;
  const m = VERSION_RE.exec(html);
  return m ? m[1] : null;
}

export function extractPlayInstalls(html) {
  if (!html) return null;
  const m = INSTALLS_RE.exec(html);
  return m ? m[1] : null;
}

export function extractPlayRating(html) {
  if (!html) return { rating: null, rating_count: null };
  const m = RATING_RE.exec(html);
  if (!m) return { rating: null, rating_count: null };
  return { rating: Math.round(parseFloat(m[1]) * 10) / 10, rating_count: parseInt(m[2], 10) };
}

export function playListingUrl(pkg) {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}&hl=en&gl=US`;
}

const EMPTY = { version: null, installs: null, updated: null, rating: null, rating_count: null };

// Returns { status, version, installs, rating, rating_count }.
//  status:
//   - ok: version, install bucket and update date found
//   - partial: version found but install bucket or update date missing (markup changed?)
//   - not_found: the listing does not exist (app not published / removed)
//   - parse_failed: page loaded but no version marker found (markup changed?)
//   - error: network/HTTP failure
// expectVersion=false: the listing is known not to expose a version (apps.yml
// `play_no_version: true`); the version is then optional and its absence is
// not a failure as long as the install bucket is found.
export async function fetchPlayVersion({ pkg, fetchFn = fetch, expectVersion = true }) {
  if (!pkg) return { status: 'error', ...EMPTY };
  let res;
  try {
    res = await fetchFn(playListingUrl(pkg), {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; watch-go-now-dashboard)', 'Accept-Language': 'en-US,en;q=0.9' },
    });
  } catch {
    return { status: 'error', ...EMPTY };
  }
  if (res.status === 404) return { status: 'not_found', ...EMPTY };
  if (!res.ok || typeof res.text !== 'function') return { status: 'error', ...EMPTY };
  const html = await res.text();
  const version = extractPlayVersion(html);
  const installs = extractPlayInstalls(html);
  const updated = extractPlayUpdated(html);
  if (!version && (expectVersion || !installs)) return { status: 'parse_failed', ...EMPTY };
  return {
    status: installs && updated ? 'ok' : 'partial',
    version,
    installs,
    updated,
    ...extractPlayRating(html),
  };
}
