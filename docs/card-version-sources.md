# Card-version sources and coverage

Research and snapshot date: 8 September 2026.

No complete, verified archive of every physical deck, language, print year, foil, promotional printing, and digital revision was established. A character identity, a rules variant, an illustration, and a physical printing are different things. A number or illustration can be shared across releases.

## Sources found

| Source | Useful coverage | Limit |
| --- | --- | --- |
| [Official SGS release archive](https://www.sanguosha.com/news/20140307_4955_5126) | Primary evidence for named products and changed skills/artwork. The 2014 Limit Break announcement describes redesigned generals and deck contents. | Product announcements are not a normalized, complete image dataset. |
| [BWIKI general database](https://wiki.biligame.com/sgs/武将图鉴) | Community card and skill references, artwork, pack browsing, and links to separate Online/Mobile databases. | Client variants must remain distinct; completeness for physical printings is not established. |
| [Noname](https://github.com/libnoname/noname) | Machine-readable character packs and explicit character-family mappings, including Standard, Limit Break, historical, Online, Mobile, overseas, and offline/special releases. | Community simulation records can include special or experimental material. They are not a physical printing checklist or authoritative rules source. |
| [Chinese Rules 3.0 reference](https://gltjk.com/sanguosha/rules/card/hero/shu.html) | Explicit distinctions among old Standard, Standard, Taiwan, 1v1, 3v3 and Kingdom War variants. It shows SHU001 reused across versions of Liu Bei. | Historical mirror, not a current all-client database. |
| [Fandom general list](https://sanguosha.fandom.com/zh/wiki/三国杀武将列表) | Additional physical-card inventory leads. | Its own index states exclusions for several variant series; direct retrieval was unreliable during this pass. |

## What was actually collected

`assets/data/version-sources.json` contains **2,317 records from 23 Noname packs**, pinned to commit `2e15429571d27ecf108fa51ab8684cff24ff7413`:

- Character IDs, Chinese names, pack/subpack labels, family relationships, faction, HP metadata, skill IDs, and immutable source links.
- Metadata only. No illustrations, skill implementations, or new English translations imported.
- The application labels these as source references. They do not appear as recognized cards and do not inflate the count of available translations or indexed artwork.
- Noname's repository license is linked in the collection and UI. Attribution remains attached to the pinned snapshot.
- Refresh with `node scripts/collect-version-sources.mjs`. The script parses literal objects with TypeScript's AST and never evaluates third-party JavaScript. Downloads are pinned and cached in the operating system's temporary directory. Inspect schema/count changes before changing the pinned revision.

Liu Bei alone has 16 records in the base Noname family in this snapshot (God versions form a separate source family). The app's existing library has four related translated versions: Standard, Limit Break, God and its existing SP entry. These are linked for comparison; equivalence between a Noname record and an app translation is not asserted merely from its name.

## Scanner and reader changes

The current 727 unique indexed images are mostly illustrations, not complete printed card faces. Strong artwork evidence therefore does **not** establish an exact physical edition.

After an artwork match, the app lists related translated versions with names, factions, expansion labels, skill titles, and the original Chinese wording. A second action reads the **whole photo**, including the name and skill box even when the user cropped only the art for initial matching. Users can also correct or enter the printed text. Existing OCR results are reused for this comparison rather than being read twice.

Artwork matching is the primary recognition path. A lightweight OpenCV card-outline detector finds convex quadrilaterals, suppresses duplicate outlines, and proposes at most two perspective-corrected crops. It uses the existing OpenCV dependency, with no additional neural-model download. The original photo is retained for borderless, cropped or occluded cards.

When the initial artwork evidence is weak, the matcher checks rectified crops and overlapping illustration windows from either end of the card to reduce competition from dense skill text. If nothing matches, a bounded fallback uses 2,400 query features on the best crop and, if needed, the original photo. Every candidate still passes ORB descriptor matching and RANSAC geometric verification; a rectangular outline alone never establishes identity. The UI reports card isolation only when the leading artwork candidate came from a detected outline. OCR remains supplementary evidence for rules variants with shared artwork.

The version ranker looks for distinctive, non-overlapping Chinese skill phrases that are absent from competing versions. Shared names, shared skill titles, repeated OCR passes, and catalog IDs alone cannot produce a text-supported version suggestion. At least two distinctive phrases and a margin over alternatives are required. Results show the evidence and ask the user to compare; no calibrated probability or print-year claim is made. Identical wording across different printings remains unresolved.

## Extending to full deck scans

A future verified artwork import needs the complete front of each card, its product/printing label, language, source URL and revision, checksum, and the precise rules variant(s) it can represent. Different physical printings with identical rules may share a translation but should retain distinct reference IDs. Identical illustrations with different rules must remain ambiguous until printed text supplies enough evidence. Unseen or obscured printings should fall back to selection rather than inheriting the nearest artwork's rules.

This pass expands source discovery and practical version selection. It does not claim to have collected all physical card faces or achieved universal edition detection.
