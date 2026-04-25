import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractIconUrl, fetchIconUrl } from '../scripts/landing.mjs';

test('extracts icon URL from JSON-LD image field', () => {
  const html = `
    <script type="application/ld+json">
    {
      "@type": "SoftwareApplication",
      "image": "https://watch-go.com/205/icon.png"
    }
    </script>
  `;
  assert.equal(extractIconUrl(html, 205), 'https://watch-go.com/205/icon.png');
});

test('handles .jpg extension', () => {
  const html = `"image": "https://watch-go.com/204/icon.jpg"`;
  assert.equal(extractIconUrl(html, 204), 'https://watch-go.com/204/icon.jpg');
});

test('skips JSON-LD images that do not match the app id', () => {
  // The Organization schema has logo + image fields too; we want only the app's icon.
  const html = `
    "image": "https://watch-go.com/images/banner-image.jpg"
    "image": "https://watch-go.com/205/icon.png"
  `;
  assert.equal(extractIconUrl(html, 205), 'https://watch-go.com/205/icon.png');
});

test('falls back to <img class="application-icon"> when JSON-LD missing', () => {
  const html = `<img class="application-icon" src="/205/icon.png" alt="Pomodoro">`;
  assert.equal(extractIconUrl(html, 205), 'https://watch-go.com/205/icon.png');
});

test('returns null when no icon found', () => {
  assert.equal(extractIconUrl('<html></html>', 999), null);
});

test('returns null on empty input', () => {
  assert.equal(extractIconUrl('', 100), null);
  assert.equal(extractIconUrl(null, 100), null);
});

test('fetchIconUrl returns null when fetch throws', async () => {
  const result = await fetchIconUrl({
    landing: 'https://watch-go.com/205',
    id: 205,
    fetchFn: async () => { throw new Error('network'); },
  });
  assert.equal(result, null);
});

test('fetchIconUrl returns null when status is not ok', async () => {
  const result = await fetchIconUrl({
    landing: 'https://watch-go.com/205',
    id: 205,
    fetchFn: async () => ({ ok: false, status: 404, text: async () => '' }),
  });
  assert.equal(result, null);
});

test('fetchIconUrl extracts icon from successful response', async () => {
  const html = `"image": "https://watch-go.com/100/icon.png"`;
  const result = await fetchIconUrl({
    landing: 'https://watch-go.com/100',
    id: 100,
    fetchFn: async () => ({ ok: true, text: async () => html }),
  });
  assert.equal(result, 'https://watch-go.com/100/icon.png');
});
