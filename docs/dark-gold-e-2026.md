# E-series Dark Gold Collector’s Edition

The user's box photo reads `三国杀 · 暗金典藏版 · E系列`, with God Jiang Wei on the cover. The matching publisher presentation is [游卡有话说, 16 June 2026](https://www.bilibili.com/video/BV1Ehj36zEny/). Its description lists 139 General Cards, 162 Game Cards, and 23 accessory cards (324 total).

The publisher's pinned comment contains the [full general checklist](https://i2.hdslb.com/bfs/new_dyn/9f4528ac45d5dc63227a7cc42dd0a69c3546983841139165.png), also visible around 00:42 in the video. This was read directly, retaining the column order and repeated names across groups:

| Group | Entries |
| --- | ---: |
| 界限突破 | 29 |
| 界神话 | 29 |
| 阴雷 | 16 |
| 神将 | 14 |
| 星河璀璨 | 14 |
| OL界一将 | 21 |
| 祈福 | 15 |
| 线下专属 | 1 |

`assets/data/decks/dark-gold-e-2026.json` records all 139 entries, source links, and counts. The source's `毋丘俭` spelling is retained for display, with `毌丘俭` used for lookup. The Star column reads `荀彧`, checked against the original image at enlarged display size. The Myth Returns entry for 诸葛亮 is matched to Sleeping Dragon; it must not resolve to the Standard version.

## Reference coverage and limits

Every entry has at least one bilingual rules reference. Twenty-one missing references were added in `assets/data/generals/deck-references.json`: the two featured E-series generals, 14 Star generals, Guan Suo, Yuan Tan & Yuan Shang, and three Limit Break generals. The catalog now has 725 entries, including 553 generals; 704 existing artwork images remain. No new artwork or recognition descriptors were imported.

Chinese text comes from literal strings in Noname at commit `2e15429571d27ecf108fa51ab8684cff24ff7413`, using the character's named skills plus granted/upgraded skills. English translations were written for this application with the project's terminology guide. Template references were resolved to skill names without evaluating third-party code. Each card links its source and clearly identifies the text as a community reference. Noname's license is retained in `licenses/noname-GPL-3.0.txt`; see `THIRD_PARTY_NOTICES.md`.

The publisher's checklist verifies roster membership and grouping, **not** every line of the physical cards. Existing catalog revisions and community revisions can differ from the box's printed wording. Therefore the interface calls matches references, presents Chinese wording, and lets the user remember their chosen version. It never silently marks a reference as a verified physical printing. It does not treat Star Sun Jian as Limit Break Sun Jian, mix God and ordinary generals, or substitute a Standard card for a missing Limit Break entry.

The 162 Game Cards contain multiple copies. Their per-name/suit/rank distribution is not in the general checklist and is not invented. General references are searchable offline through the existing catalog and shell cache. The full physical artwork set has not been collected, so no new box-wide scanner accuracy claim is made.

## App behavior

- Direct route: `#tab=library&deck=dark-gold-e-2026`.
- Library entry opens the deck. “Use this deck” adds a shortcut on Scan.
- Search by English/Chinese name or skill; filter by eight source groups.
- Open an entry, read the bilingual reference, and mark the version that matches the printed card.
- Deck pin and choices are saved locally; remembered IDs are revalidated against the entry's allowed rules family.
- Opening a reader retains the deck route. Back returns to the checklist.
- Missing artwork has an explicit text-reference placeholder.

## Verification

- Production build and TypeScript passed; 42 JavaScript tests passed, including nine deck regressions.
- Phone viewport 390 × 844: all 139 entries have references; no horizontal overflow.
- Xiahou Lan search → reference → English reader with all four skills → Back retained the deck route. Pin and chosen version survived reload.
- The new reader's Axe audit had zero violations and no incomplete checks.
- Recognition code and its reference index were unchanged by this task.
