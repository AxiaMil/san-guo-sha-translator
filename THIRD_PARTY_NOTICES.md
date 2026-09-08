# Third-party source notices

This application builds on [Akari-light/san-guo-sha-translator](https://github.com/Akari-light/san-guo-sha-translator). Existing card illustrations and game content retain their respective owners' rights.

## Noname community references

The source-version metadata and the Chinese rules text in `assets/data/generals/deck-references.json` derive from [libnoname/noname](https://github.com/libnoname/noname), revision `2e15429571d27ecf108fa51ab8684cff24ff7413`. Source URLs remain attached to the records. The English translations of those reference texts were added by this project. No Noname skill implementation was copied. The artwork update additionally uses the clean digital Xiahou Lan illustration from the same pinned revision; its original game-art rights remain with its owners.

Noname is distributed under GNU GPL version 3. A copy is included in [licenses/noname-GPL-3.0.txt](licenses/noname-GPL-3.0.txt). These derived reference texts retain that license. This notice does not assert ownership of the original publisher's game content or relicense unrelated assets.

## Dark Gold roster

Factual box counts and the general roster are transcribed from the publisher account 游卡有话说's [16 June 2026 presentation](https://www.bilibili.com/video/BV1Ehj36zEny/) and its pinned checklist image. The user-provided store photograph is not published by this update.

## Dark Gold artwork references

The 21 imported illustrations and their source/file-page links, SHA-256 hashes, native dimensions, and deck-verification timestamps are listed in `assets/data/deck-artwork.json`. Twenty are sourced from BWIKI's Sanguosha and Sanguosha OL original-image files, and Xiahou Lan is sourced from the pinned Noname repository image. Artwork copyrights remain with the original publisher and illustrators; this project does not claim that community-code licenses relicense those illustrations. Images are converted to lossless WebP without enlargement. Video frames and the user's store photo are not published as artwork references.

### Shenmo E-series references (2026)

The 314-entry 神魔乱斗 checklist is transcribed from the two roster images posted
by 游卡有话说 under <https://www.bilibili.com/video/BV1TWVh6NEf3/> (29 May 2026).
Source URLs, printed repetitions, and normalized lookup names are retained in
`assets/data/decks/shenmo-e-2026.json`. Repeated 华佗, 张角 and 诸葛亮 entries are
not silently deduplicated; the source spelling 王沧 searches the documented 王沦.

The additional 160 rules references use Chinese records from Noname commit
`2e15429571d27ecf108fa51ab8684cff24ff7413`, under GPL-3.0, with English
translations in `assets/data/generals/shenmo-references.json`. Each card links its
source file; each skill retains its source key. The publisher confirms roster
membership, not equivalence to every line of the community's digital revision.
Compare physical skill wording before treating a reference as the printed version.

`assets/data/shenmo-artwork.json` records original artwork URLs, native dimensions,
SHA-256 hashes, and verification scope. 134 larger BWIKI originals were matched to
named community portraits using geometrically consistent features. 26 retain their
native community originals. Both exclusive Jiang Wei illustrations were also
visually compared to the physical cards in the publisher's video. Other entries do
not claim verification of their precise physical printing. All artwork rights
remain with the original artists and respective rights holders; the code license
does not grant ownership of these illustrations. Video frames are research evidence
only, never library or recognition reference pixels. Mobile display copies are
scaled down from these originals, with no enlargement or generated detail.

## Brand mark

The outlined 殺 glyph is rendered from Noto Serif TC Semibold, distributed under
[SIL OFL 1.1](licenses/noto-serif-OFL.txt). The header and app icon use the same
centered vector outline, without loading a system font at runtime.
Source: https://fonts.google.com/noto/specimen/Noto+Serif+TC.
