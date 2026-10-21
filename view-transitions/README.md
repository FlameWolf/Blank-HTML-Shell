# View Transition API: a detailed example

An interactive, dependency-free guide to the [View Transition API](https://developer.mozilla.org/docs/Web/API/View_Transition_API). It has no build step, frameworks or images. Every file is plain HTML, CSS and JavaScript with explanatory comments.

## Files

| File | What it is |
| --- | --- |
| [`index.html`](index.html) | A single standalone page explaining the API, with seven live demos. Its CSS and JavaScript are inline, so you can copy this one file anywhere. |
| [`cross-document/`](cross-document/) | A small multi-page site (an overview and four planet pages) that animates between real page loads. |
| `cross-document/styles.css` | The `@view-transition` opt-in, shared names and the animations for each transition type. |
| `cross-document/transitions.js` | `pageswap` and `pagereveal` listeners that choose a transition type for each navigation. |

## What's covered

`index.html`:

1. **How a view transition works**: the capture, update and animate steps, the `::view-transition` pseudo-element tree, and the browser's default animations.
2. **Browser support**: a support table with live feature detection for the browser you're using.
3. **The default cross-fade**: `document.startViewTransition()` with no extra CSS.
4. **Morphing a thumbnail into a detail view**: shared `view-transition-name`s that move from one element to another, and focus management.
5. **Adding, removing and reordering items**: per-item names, `view-transition-class`, and separate enter and exit animations.
6. **Transition types**: one carousel with slide, flip, zoom and cross-fade animations, picked with `startViewTransition({ types })` and `:active-view-transition-type()`, and clipped to the carousel with `overflow: clip` on the group.
7. **A circular theme reveal**: animating `::view-transition-new(root)` from JavaScript with the Web Animations API once `transition.ready` resolves.
8. **The `ViewTransition` object**: a live log of `updateCallbackDone`, `ready` and `finished`, plus `skipTransition()`, interruptions, errors, duplicate names, the update timeout and `waitUntil()`.
9. **Element-scoped view transitions**: `element.startViewTransition()`, with two transitions running at once.
10. **Cross-document view transitions**, plus best practices and further reading.

Every demo has a "Slow motion" switch in the header, works in light and dark mode, and respects `prefers-reduced-motion`. In browsers without the API, the page still updates; it just doesn't animate.

## Running it

**The guide:** open `index.html` directly in a browser. A local server isn't needed.

**The cross-document demo:** cross-document transitions only run between pages on the same origin. Some browsers treat files opened from disk as unique origins, so serve the folder over HTTP:

```sh
cd view-transitions
python3 -m http.server 8000
```

Then open <http://localhost:8000/cross-document/>. Any static file server works. Current versions of Chrome also run these transitions from `file://`.

## Browser support

First version with support, from MDN's browser-compat-data (October 2026). Edge follows Chrome.

| Feature | Chrome / Edge | Safari | Firefox |
| --- | --- | --- | --- |
| `document.startViewTransition()` and the pseudo-elements | 111 | 18 | 144 |
| `:active-view-transition` | 125 | 18 | 144 |
| `view-transition-class` | 125 | 18.2 | 144 |
| Transition types | 125 | 18.2 | 147 |
| `view-transition-name: match-element` | 137 | 18.4 | 144 |
| `document.activeViewTransition` | 142 | 26.2 | 147 |
| Cross-document: `@view-transition { navigation: auto; }` | 126 | 18.2 | No |
| `pagereveal` event | 123 | 18.2 | No |
| `pageswap` event | 124 | 18.2 (partial) | No |
| `<link rel="expect" blocking="render">` | 124 | 18.2 | No |
| `navigation.activation` | 123 | 26.2 | 147 |
| `ViewTransition.waitUntil()` (experimental) | 144 | No | No |
| `view-transition-group` (experimental) | 140 | No | No |
| `element.startViewTransition()` (experimental) | 147 | No | No |

## Notes

- **Experimental features are optional.** Without `element.startViewTransition()`, the flashcards in the scoped demo still flip, just without animation, and say so. Without `waitUntil()`, its scenario button is disabled with a note. The other same-document demos only use features that all major engines support.
- **Names are set explicitly.** The list demo gives each item its own `view-transition-name` rather than using `match-element`, because there's no reliable way to feature-detect `match-element`.
- **The duplicate-name scenario logs an error on purpose.** In the `ViewTransition` demo, "Duplicate names" gives two elements the same name. The transition is skipped, `ready` rejects with an `InvalidStateError`, and the browser reports "Unexpected duplicate view-transition-name" in the console.
