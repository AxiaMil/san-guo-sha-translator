# SHA — phone web companion

**Live app: [sha-card-companion.vercel.app](https://sha-card-companion.vercel.app)**

A camera-first San Guo Sha companion with English translations, built on [Akari-light/san-guo-sha-translator](https://github.com/Akari-light/san-guo-sha-translator). The original Flutter app remains in this repository.

- **Scan:** rear camera or photo upload, crop and rotate, artwork recognition, and Chinese OCR fallback.
- **Library:** 704 generals and playing cards; search English, simplified/traditional Chinese, skills, or printed IDs.
- **At the table:** English/bilingual/Chinese reading, larger text, linked card references, edition selection, searchable rules and examples, and bookmarks saved on your device.
- **Appearance:** neutral white and charcoal themes with subtle blue accents; Light, Dark, or System preferences persist locally.
- **Offline reading:** the production app caches card text, rules, and up to 120 viewed artwork images. Photo matching needs a connection.
- **Translation review:** 18 shared skills and six basic card effects revised; known missing source skills are shown explicitly. See [review notes](docs/translation-review.md).
- **Recognition:** 729 source artworks (727 unique), including skins. CLAHE lighting correction, ORB local feature retrieval, and RANSAC perspective checks. Identical artwork with different faction rules returns both choices.
- **Privacy:** photos are resized on the device, processed in memory by the artwork endpoint, and never saved by the application. Text OCR runs in the browser. No account or AI API key is required.

## Run locally

Requires Node.js 22+ and Python 3.14. Use the locked dependencies:

```sh
npm ci
npm run build
uv sync
uv run python scripts/dev-api.py
# In a second terminal:
npm run dev
```

Open http://localhost:5173. The Vite server proxies `/api` to port 8000. Phone camera access requires HTTPS (or localhost); use the deployed site when testing from a phone. Tesseract downloads Chinese/English language models on the first text scan, then caches them in the browser.

## Verify and refresh data

```sh
npm test
uv run --with pytest python -m pytest tests/test_recognition.py tests/test_api.py -q
# Optional: pure native OCR regression checks, requires Dart:
scripts/check-native-ocr.sh
# Rebuild the catalog and artwork index after changing source data:
node scripts/build-catalog.mjs
uv run python scripts/build-references.py
```

`npm run build` regenerates the web catalog, images, rulebook, and Chinese normalization map directly from the Flutter assets, then creates a versioned offline cache. The compressed reference index is committed so Vercel does not need to regenerate it on every deploy. Do not change the OpenCV version without rerunning recognition tests. The selected wheel fits Vercel's Python function size limit.

## Deploy

The root `vercel.json` configures the Vite frontend and `/api/match` Python function. Connect the fork to Vercel and deploy from the repository root:

```sh
vercel link
vercel --prod
```

## Recognition limits

The automated suite covers brightness, warm color casts, uneven shadow, partial glare, rotation, moderate blur, perspective, skins, playing cards, shared artwork, and unrelated inputs. These are synthetic transformations of reference artwork, **not measured accuracy on real phone photographs**. Severe blur, darkness, glare covering the artwork, and unseen artwork can still prevent recognition. The app shows alternatives or asks for a better crop; it never presents a similarity score as a calibrated probability. Compare the edition before choosing a translation.

Native OCR fixes restore spatially separated vertical names and preserve `SKIN`/`BETA` ID suffixes. The pure Dart regression harness is runnable without Flutter; full Android/iOS camera integration still needs testing on devices.

---

# 殺 (SHA) — Stop Hesitating, Attack!

**殺 (SHA)** is the essential translation companion for *San Guo Sha* (SGS). 
Stop losing games to language barriers and start winning with strategy. 

## ⚔️ What is S.H.A.?
**S.H.A.** stands for **S**top **H**esitating, **A**ttack! 

Let’s be honest: squinting at "Traditional Chinese flavor text" mid-turn is a great way to get targeted by your friends. This app is a dedicated bridge for non-Mandarin speakers to parse complex card mechanics instantly. 

The goal is simple: **Read Before You Slash.**

## 🛡️ Why use 殺?
* **Zero Confusion:** Clear English translations for General skills, Gear, and Stratagems.
* **Speed:** Designed for quick lookups so you don't stall the game.
* **Authenticity:** Built for players, by players, using the traditional terminology you see on the cards.

## 📱 Installation
If you are using the Flutter build:
1. Clone this repo: `git clone https://github.com/Akari-light/san-guo-sha-translator.git`
2. Run `flutter pub get`
3. Launch the app and stop guessing your way through the Three Kingdoms.

---
*Disclaimer: This is a fan-made tool and is not affiliated with the official creators of San Guo Sha.*