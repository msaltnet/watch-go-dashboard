function appKey(app) {
  return `${app.id}::${app.variant ?? ''}`;
}

function findPrevious(previous, meta) {
  return previous.apps.find(a => appKey(a) === appKey(meta));
}

export function mergeFetchResults({ previous, fresh, builtAt }) {
  const total = fresh.length;
  const succeededCount = fresh.filter(r => r.status === 'ok').length;
  const failedCount = fresh.filter(r => r.status === 'fetch_failed').length;
  const nonFailedCount = total - failedCount;
  if (nonFailedCount === 0 && total > 1) {
    throw new Error('all apps failed — refusing to overwrite previous data');
  }

  const apps = fresh.map(result => {
    const { meta, status } = result;
    if (status === 'ok') {
      const first = result.updates[0];
      return {
        ...meta,
        overview_html: result.overview_html,
        updates: result.updates,
        latest_version: first?.version ?? null,
        latest_update_date: first?.date ?? null,
        fetch_status: 'ok',
        last_successful_fetch: builtAt,
      };
    }
    if (status === 'no_docs') {
      return {
        ...meta,
        overview_html: null,
        updates: [],
        latest_version: null,
        latest_update_date: null,
        fetch_status: 'no_docs',
        last_successful_fetch: null,
      };
    }
    // fetch_failed: preserve previous entry if exists
    const prev = findPrevious(previous, meta);
    if (prev) {
      return { ...prev, fetch_status: 'fetch_failed' };
    }
    return {
      ...meta,
      overview_html: null,
      updates: [],
      latest_version: null,
      latest_update_date: null,
      fetch_status: 'fetch_failed',
      last_successful_fetch: null,
    };
  });

  const stats = {
    total,
    succeeded: succeededCount,
    no_docs: fresh.filter(r => r.status === 'no_docs').length,
    failed: fresh.filter(r => r.status === 'fetch_failed').length,
  };

  return { built_at: builtAt, stats, apps };
}
