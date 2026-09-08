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
