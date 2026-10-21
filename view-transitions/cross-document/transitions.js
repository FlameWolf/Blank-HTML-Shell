/*
 * Cross-document view transitions demo: choose an animation per navigation.
 *
 * Every page loads this as a classic script in its <head>, so the listeners
 * exist before the first frame is rendered. (pagereveal fires just before
 * it; a deferred or module script could be too late.)
 *
 *   overview -> planet    "drill-in"   the planet morphs into the big one
 *   planet   -> overview  "drill-out"  and back again
 *   planet   -> planet    "forwards" or "backwards", by distance from the Sun
 *
 * styles.css uses :active-view-transition-type() to style each type.
 */
(() => {
  const PAGES = ['index', 'mercury', 'venus', 'earth', 'mars'];
  const LABELS = { index: 'Overview', mercury: 'Mercury', venus: 'Venus', earth: 'Earth', mars: 'Mars' };
  const STORAGE_KEY = 'cross-document-demo:last-page';

  /**
   * ".../mars.html" -> "mars"; the overview (".../index.html" or ".../cross-document/") -> "index".
   * Pages outside this demo, such as the guide, -> null.
   */
  function pageName(url) {
    const target = new URL(url, location.href);
    if (new URL('.', target).href !== new URL('.', location.href).href) return null;
    const match = /([\w-]+)\.html$/.exec(target.pathname);
    if (!match) return 'index';
    return PAGES.includes(match[1]) ? match[1] : null;
  }

  /** The transition type for a navigation, or null if there isn't a suitable one. */
  function typeFor(fromUrl, toUrl) {
    const from = pageName(fromUrl);
    const to = pageName(toUrl);
    if (!from || !to || from === to) return null;
    if (from === 'index') return 'drill-in';
    if (to === 'index') return 'drill-out';
    return PAGES.indexOf(to) > PAGES.indexOf(from) ? 'forwards' : 'backwards';
  }

  // ---------------------------------------------------------------------------
  // The OLD page: `pageswap` fires just before this document is replaced.
  // Types added here apply while the old page's snapshots are captured.
  // ---------------------------------------------------------------------------
  window.addEventListener('pageswap', (event) => {
    // event.activation describes the navigation; entry.url is the destination.
    // It is null for cross-origin navigations, which never transition anyway.
    const destination = event.activation?.entry?.url ?? null;

    // Fallback for browsers without navigation.activation: remember where the
    // user is coming from (and going to), for the next page's pagereveal handler.
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ from: location.href, to: destination }));
    } catch {
      // Storage can be unavailable (for example in some private modes).
    }

    if (!event.viewTransition) return;
    // The transition can still be skipped, for example because the new page
    // doesn't opt in (like the guide this demo links back to). Skipping
    // rejects `ready`, so don't leave that rejection unhandled.
    event.viewTransition.ready.catch(() => {});

    if (!destination) return;
    const type = typeFor(location.href, destination);
    if (type) event.viewTransition.types.add(type);
  });

  // ---------------------------------------------------------------------------
  // The NEW page: `pagereveal` fires before its first frame is rendered, and
  // again whenever it is restored from the back/forward cache.
  // Types added here decide which CSS animations run.
  // ---------------------------------------------------------------------------
  const info = { transition: '-', navigation: '-', from: '-', types: '-' };

  window.addEventListener('pagereveal', (event) => {
    let fromUrl = null;
    let storedFrom = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      const stored = JSON.parse(raw);
      // Ignore a value left behind by a navigation that went somewhere else.
      if (stored && (!stored.to || stored.to === location.href)) storedFrom = stored.from;
    } catch {
      // Ignore: storage is only a fallback.
    }

    // The Navigation API knows where we came from and how.
    const activation = 'navigation' in window ? window.navigation.activation : null;
    if (activation) {
      fromUrl = activation.from?.url ?? null;
      info.navigation = activation.navigationType;
    } else {
      fromUrl = storedFrom;
      info.navigation = 'unknown (no Navigation API)';
    }
    info.from = fromUrl ? (LABELS[pageName(fromUrl)] ?? 'A page outside this demo') : '-';

    if (event.viewTransition) {
      // It can still be skipped (for example if the user navigates again straight away).
      event.viewTransition.ready.catch(() => {});
      const type = fromUrl ? typeFor(fromUrl, location.href) : null;
      if (type) event.viewTransition.types.add(type);
      info.transition = 'Yes';
      info.types = [...event.viewTransition.types].join(', ') || '(none)';
    } else {
      info.transition = 'No';
      info.types = '-';
    }
    whenParsed(renderInfo);
  });

  /** Fills in the "How did we get here?" panel. */
  function renderInfo() {
    for (const [key, value] of Object.entries(info)) {
      const cell = document.querySelector(`[data-info="${key}"]`);
      if (cell) cell.textContent = value;
    }
  }

  // pagereveal can fire before the whole body has been parsed.
  function whenParsed(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  // Browsers without pagereveal (for example Firefox) still get the panel.
  if (!('onpagereveal' in window)) {
    info.transition = 'No (cross-document view transitions are not supported here)';
    whenParsed(renderInfo);
  }
})();
