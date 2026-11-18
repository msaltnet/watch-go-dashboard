function appKey(app) {
  return `${app.id}::${app.variant ?? ''}`;
}

function findPrevious(previous, meta) {
  return previous.apps.find(a => appKey(a) === appKey(meta));
}

// Play Store info: ok/partial -> new values, not_found -> cleared (not published),
// parse_failed/error/missing -> keep the previously stored values but record the
// failure in play_status so the dashboard can show it.
function playFields(result, prev, builtAt) {
  const play = result.play;
  if (play?.status === 'ok' || play?.status === 'partial') {
    return {
      play_version: play.version,
      play_installs: play.installs ?? null,
      play_rating: play.rating ?? null,
      play_rating_count: play.rating_count ?? null,
      play_status: play.status,
      play_checked_at: builtAt,
    };
  }
  if (play?.status === 'not_found') {
    return {
      play_version: null, play_installs: null, play_rating: null, play_rating_count: null,
      play_status: 'not_found', play_checked_at: builtAt,
    };
  }
  return {
    play_version: prev?.play_version ?? null,
    play_installs: prev?.play_installs ?? null,
    play_rating: prev?.play_rating ?? null,
    play_rating_count: prev?.play_rating_count ?? null,
    play_status: play?.status ?? 'error',
    play_checked_at: prev?.play_checked_at ?? null,
  };
}

export function mergeFetchResults({ previous, fresh, builtAt }) {
  const total = fresh.length;
  const succeededCount = fresh.filter(r => r.status === 'ok').length;
  if (succeededCount === 0 && total > 0) {
    throw new Error('all apps failed — refusing to overwrite previous data');
  }

  const apps = fresh.map(result => {
    const { meta, status } = result;
    const prev = findPrevious(previous, meta);
    const icon_url = result.icon_url ?? prev?.icon_url ?? null;
    const play = playFields(result, prev, builtAt);
    if (status === 'ok') {
      const first = result.updates[0];
      return {
        ...meta,
        overview_html: result.overview_html,
        updates: result.updates,
        latest_version: first?.version ?? null,
        latest_update_date: first?.date ?? null,
        latest_update_label: first?.label ?? null,
        icon_url,
        ...play,
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
        latest_update_label: null,
        icon_url,
        ...play,
        fetch_status: 'no_docs',
        last_successful_fetch: null,
      };
    }
    // fetch_failed: preserve previous entry if exists
    if (prev) {
      return { ...prev, icon_url, ...play, fetch_status: 'fetch_failed' };
    }
    return {
      ...meta,
      overview_html: null,
      updates: [],
      latest_version: null,
      latest_update_date: null,
      latest_update_label: null,
      icon_url,
      ...play,
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
