# Interface update — September 2026

The selected palette is neutral white / charcoal with subtle blue accents. Light mode uses #fafafa canvas, white surfaces, #202024 primary text and #315bd5 accents. Dark mode uses #141416 canvas, #1d1d20 surfaces, #f2f2f4 text and #9ab5ff accents. Primary buttons are neutral; artwork provides the dominant color. Every surface, reader, filter, navigation state, and error panel uses the shared theme tokens.

Appearance offers Light, Dark and System. The preference persists locally and is applied before first paint. System mode responds to operating-system changes. Reader language and text size persist independently.

On phones, camera and upload actions precede the decorative preview. Four navigation destinations keep scanning, the library, saved cards, and the rulebook directly reachable. Search supports English, traditional/simplified Chinese, printed IDs, skill names, and common playing-card aliases. Filters include card type, faction, edition, and sort. Bookmarks persist locally and removals have Undo. Scan results scroll into view; browser Back works through card-reference links.

## Offline behavior

The production build generates a versioned service worker that precaches the app shell, catalog, rulebook, icons, and emitted JS/CSS. It caches up to 120 visited artwork images. Cached card text and rules can be read after an offline reload. Images not previously cached require a connection. Browser storage can be evicted; this is a convenience cache, not a backup.

Photo matching always uses the network and is never cached. Tesseract models are loaded on demand from their existing external sources; offline text recognition is not promised. Updates install into a separate cache and wait for an explicit Update & reload action (or for all old tabs to close). The update action reloads the page and clears any unsaved scan.
