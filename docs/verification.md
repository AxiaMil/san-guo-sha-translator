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
