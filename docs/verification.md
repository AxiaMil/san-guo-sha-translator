# Compact interface and camera flow — 2026-09-08

- Removed promotional headings, decorative scan cards, slogans and repeated instructions. Library and rules search now come first; deck details and turn guidance collapse. Neutral white/charcoal themes remain.
- Camera capture and native camera-file input automatically identify the card. Capture waits for video readiness; pending permissions can be cancelled; late streams are stopped; failed previews expose a user-triggered native fallback.
- Artwork matching remains first. Empty artwork results or service errors fall back to browser OCR; cancellation never starts another recognition method. OCR output is reused for version comparison.
- Production build/TypeScript and 48 JavaScript tests passed, including five recognition-flow regressions and English/Chinese lookup for every text-only general.
- Browser camera test used a canvas MediaStream with Guan Yu artwork: capture automatically reached the real local API, returned a strong artwork match, and stopped the camera tracks. Denied permission exposed native capture; cancelling a pending request stopped a late-arriving stream without opening video.
- Native file-capture input with the full-card Liu Bei fixture automatically returned a strong Limit Break artwork match from the real local API. A separately simulated empty artwork response triggered actual browser OCR and ranked Limit Break Liu Bei first.
- At 390 × 844, dark library, light deck and light scanner Axe audits reported zero violations and no incomplete checks. Deck search is visible above the fold; mobile deck/rules and 1440px scanner checks found no horizontal overflow. Rules search for damage returned 19 entries; Xiahou Lan was searchable in the library.
- Camera lifecycle was browser-tested with simulated streams and file input, not physical iOS/Android camera hardware. Existing artwork coverage and arbitrary-lighting limitations still apply; no new illustrations were added in this change.

---

# Dark Gold deck reference — 2026-09-08

The E-series Dark Gold Collector’s Edition now has a dedicated route, the publisher’s full 139-general roster, bilingual reference coverage for all entries, and locally remembered rules-version choices. Twenty-one community references were added, bringing the catalog to 725 cards. See [deck coverage and source notes](dark-gold-e-2026.md) for the distinction between roster verification and exact printed wording.

- Production build and TypeScript passed; 42 JavaScript tests passed.
- Nine deck regressions cover all group counts, rules-family separation, roster spelling, invalid persisted choices, search, reference provenance, and granted/upgraded skills.
- Phone browser: pin deck, search Xiahou Lan, choose a reference, read English, return to deck, reload. Pin and version choice persisted; no horizontal overflow.
- Reader and light-theme deck Axe audits: zero violations and no incomplete checks.
- No changes to artwork recognition code or the reference index.

---

# Card detection and version selection — 2026-09-08

- Production frontend build and TypeScript passed.
- 33 JavaScript tests passed, including ten version-ranking and source-collection regressions.
- 74 Python recognition/API tests passed in 54.61 seconds, including six new detector regressions and a text-heavy full-card fixture. Existing lighting, unknown-image, shared-artwork, skin and API validation checks remain passing.
- Card detection tests cover a tilted full card, dim exposure, 90° and 180° rotation, a lighting gradient, and rejection of a blank rectangular object. These are synthetic transformations, not a measured real-phone accuracy rate.
- The expanded source collection passed its browser Axe audit with zero violations and zero incomplete checks.
- At a 390 × 844 browser viewport, photo upload → production-shaped API request → detected outline → strong Limit Break Liu Bei artwork match → reader worked without OCR. The reader displayed four translated family variants and source references. Source-pack filtering narrowed Liu Bei to one Limit Break reference with a pinned source line; no horizontal overflow was present.
- Actual browser OCR separately read the full-card fixture and supported Limit Break Liu Bei using distinctive printed skill phrases. Already-read OCR text is reused. Shared titles/IDs and repeated OCR passes cannot establish a version.
- The metadata collection has 2,317 records from 23 packs. It is included in the offline shell and clearly separated from the 704 translated cards and 727 indexed illustrations. Physical printing coverage is not established.

Screenshots from local verification: `/tmp/sha-artwork-detector-phone.png`, `/tmp/sha-compare-phone.png`. Real camera captures across devices, obscured cards, extreme lighting, and unknown printings remain outside the automated benchmark.

---

# Interface and translation verification — 2026-09-08

- Production build and TypeScript: passed.
- 23 JavaScript tests passed, including 16 new translation, source-gap, alias, and rulebook regressions.
- 67 Python recognition/API tests passed with the deployed Python 3.14 dependency versions.
- Eight standalone Dart OCR checks passed. Total: 98 automated checks.
- `npm audit --omit=dev`: zero reported vulnerabilities.
- Neutral light/dark palettes checked on a 390 × 844 phone viewport. Theme selection persists after reload. The main text/accent/button contrast pairs range from 5.19:1 to 16.46:1.
- Axe audits: scanner and reader report zero violations and no incomplete checks. Rulebook reports zero violations; the partially clipped final chip in the horizontal filter strip requires manual contrast inspection (its shared text tokens pass).
- Browser flows: upload → strong Guan Yu artwork match; English/bilingual/Chinese controls and larger text; bookmark persistence; linked Kill card → Back to Liu Bei; card editions; rule search inside examples.
- Production-preview service worker activated. With browser networking disabled, reloaded the app and fetched all 704 cached cards and 151 rule entries; an uncached network request failed as expected. Saved cards survived reload.
- A second build installed as a waiting service worker and displayed Update & reload, rather than silently replacing the running application.

Known data gaps and the precise scope of the translation pass are documented in [translation-review.md](translation-review.md). Offline caching is browser-managed and artwork is limited to 120 visited images. Photo recognition requires a connection. Full Flutter device testing and real printed-card lighting accuracy remain outside these checks.

---

# Verification — 2026-09-08

- Production frontend build: passed (`npm run build`).
- JavaScript search/OCR regression tests: 7 passed.
- Pure Dart OCR regression harness: 8 checks passed (standalone Dart). Full Flutter camera integration has not been device-tested.
- Python artwork recognition: 61 passed, including six generals under nine image conditions, four non-card controls, a skin, a playing card, and shared artwork with two faction variants.
- HTTP input handling: 6 passed (malformed JSON/base64, wrong content type, missing image, wrong schema, oversized request header).
- Production dependency audit: no reported npm vulnerabilities.

Browser checks were performed at 390 × 844 and 1440 × 1000. Verified photo upload → server match → Guan Yu translation; bookmark → Saved; English/Chinese toggle; traditional Chinese search; empty search; rulebook search; and camera permission denial fallback. No browser page errors were reported. A generated image containing vertical traditional Chinese 劉備 plus 仁德/激將/SHU001 was read by the actual browser Tesseract worker and ranked Liu Bei first. This is an OCR integration fixture, not a phone-photo accuracy benchmark.

The live Vercel endpoint returned HTTP 200 and correctly matched SHU002. Both the catalog and page returned 200. The database caching fix cut local warm matching from roughly 4–5 seconds to 0.8 seconds while retaining the full retrieval settings; the full Python recognition and HTTP suite then completed in 32.86 seconds. Production latency depends on cold starts, network, image, and deployment resources.

The lighting suite uses transformations of repository artwork. It does not establish an accuracy percentage on real printed cards under arbitrary lighting. Obscured artwork, motion blur, extreme glare/darkness, and unknown skins still need retaking, text recognition, or manual lookup.
