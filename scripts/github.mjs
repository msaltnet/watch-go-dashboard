const API_BASE = 'https://api.github.com';

export async function fetchDocFile({ repo, path, token, fetchFn = fetch }) {
  const url = `${API_BASE}/repos/${repo}/contents/${path}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'watch-go-dashboard',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const maxAttempts = 3;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetchFn(url, { headers });
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      await sleep(300 * 2 ** (attempt - 1));
      continue;
    }

    if (res.status === 404) {
      return { status: 'not_found' };
    }
    if (res.status === 401 || res.status === 403) {
      return { status: 'auth_failed', http: res.status };
    }
    if (res.status === 429 || res.status >= 500) {
      lastErr = new Error(`HTTP ${res.status}`);
      if (attempt === maxAttempts) break;
      await sleep(300 * 2 ** (attempt - 1));
      continue;
    }
    if (!res.ok) {
      return { status: 'error', http: res.status };
    }

    const body = await res.json();
    if (body.encoding !== 'base64' || typeof body.content !== 'string') {
      return { status: 'error', reason: 'unexpected_body' };
    }
    const content = Buffer.from(body.content, 'base64').toString('utf8');
    return { status: 'ok', content };
  }

  return { status: 'error', reason: lastErr?.message ?? 'unknown' };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
