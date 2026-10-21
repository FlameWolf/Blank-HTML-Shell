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

  /** ".../mars.html" -> "mars". Anything else (such as ".../cross-document/") -> "index". */
  function pageName(url) {
    const match = /([\w-]+)\.html$/.exec(new URL(url, location.href).pathname);
    return match && PAGES.includes(match[1]) ? match[1] : 'index';
  }

  /** The transition type for a navigation, or null if it stays on one page. */
  function typeFor(fromUrl, toUrl) {
    const from = pageName(fromUrl);
    const to = pageName(toUrl);
    if (from === to) return null;
    if (from === 'index') return 'drill-in';
    if (to === 'index') return 'drill-out';
    return PAGES.indexOf(to) > PAGES.indexOf(from) ? 'forwards' : 'backwards';
  }

  // ---------------------------------------------------------------------------
  // The OLD page: `pageswap` fires just before this document is replaced.
  // Types added here apply while the old page's snapshots are captured.
  // ---------------------------------------------------------------------------
  window.addEventListener('pageswap', (event) => {
    // Fallback for browsers without navigation.activation: remember where the
    // user is coming from, for the next page's pagereveal handler.
    try {
      sessionStorage.setItem(STORAGE_KEY, location.href);
    } catch {
      // Storage can be unavailable (for example in some private modes).
    }

    // event.activation describes the navigation; entry.url is the destination.
    // It is null for cross-origin navigations, which never transition anyway.
    if (!event.viewTransition || !event.activation?.entry?.url) return;
    const type = typeFor(location.href, event.activation.entry.url);
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
      storedFrom = sessionStorage.getItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
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
    info.from = fromUrl ? LABELS[pageName(fromUrl)] : '-';

    if (event.viewTransition) {
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
