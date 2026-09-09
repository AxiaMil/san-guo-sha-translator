# Preset translation audit — 10 September 2026

The English in both presets has been reviewed against its stored Chinese, including every selectable edition, skill, linked skill, and FAQ. This is a translation audit, **not certification that every digital reference matches the wording of every physical printing**. Eight source questions remain visible beside the affected text.

| Scope | Roster entries | Selectable general references |
| --- | ---: | ---: |
| Dark Gold E 2026 | 139 | 159 |
| Shenmo E 2026 | 314 | 328 |
| Both, deduplicated | — | 373 |

The review covered 816 distinct skill records, the names and FAQs of those 373 general references, and all 172 shared playing-card records: 1,361 review units. The general rosters do not establish a complete per-card inventory of the boxes' playing cards, so the entire shared playing-card library was reviewed as a superset. Special-mode rulebooks and the rest of the general library are outside this audit.

## Method and evidence

Five `gpt-5.6-luna` reviewers handled eight bounded batches to reduce inference cost. Every batch's reviewed-ID list was checked against the actual input inventory. The parent reviewed proposed changes, checked exact original field values, corrected mislocated edits, and rejected suggestions that changed a correct rule. Examples include preserving Sudden Raid's one card from each of the chosen characters, retaining per-point HP-loss triggers, and keeping Dying State separate from Dying Event.

Ambiguous rules were compared with the Chinese descriptions and, when helpful, implementation at [Noname revision 2e15429571d27ecf108fa51ab8684cff24ff7413](https://github.com/libnoname/noname/tree/2e15429571d27ecf108fa51ab8684cff24ff7413). A newer same-name skill was not treated as proof of an older printing. For example, newer Pang De and Fei Yi rules differ materially from these stored references; they were not substituted.

The project [terminology guide](../.claude/skills/sgs-ruleset-terminology/references/canonical-terms.md) governs names and operations. The [Chinese Rules 3.0 card-operation reference](https://gltjk.com/sanguosha/rules/glossary/gamecard.html) supports the Use/Play and Substitute/Replace-and-keep distinctions; edition-specific text takes precedence over an older general reference.

[Machine-readable coverage](../assets/data/preset-translation-audit.json) fingerprints 1,384 source records, including duplicate occurrences and two added keyword explanations. Tests fail if a covered translation changes, a preset gains an unreviewed edition or skill, or a Chinese FAQ lacks English. These checks preserve review coverage; they do not prove linguistic correctness by themselves.

[Correction and adjudication log](preset-translation-audit-findings.json) records 184 field corrections and the separate glossary normalization targets. Some corrections are clarity or terminology changes rather than changes to mechanics.

## Material corrections

- **Exile:** restrict which card types may be Used from the hand; do not imply that hand cards transform into those types.
- **Golden Comb:** draw up to a hand size of five, not five additional cards. Brilliant Schemes retains its different cap of five cards drawn.
- **Heavenly Fragrance:** the selected character Takes damage and draws; the owner does not draw those cards.
- **Ghost Path:** a black card is not restricted to the hand; explicitly keep the replaced Judgment Card.
- **Eliminate the Evil:** check card types in the opponent's hand, and preserve non-win outcomes including ties.
- **Posthumous Plan:** preserve per-point triggers, optional giving, and permission to give both cards to one recipient.
- **Imperial Clan:** its once-per-faction prevention has no per-round reset in this source.
- **Pledge Herself:** remove unsupported recovery to 1 HP and preserve optional activation.
- **Total Annihilation:** retain the exception for characters in the Verge of Death State.
- **Refined Strategy:** retain first use of each suit during the owner's turn, rather than every card use.
- **Celestial Tide:** choose any number of other characters; do not force all other characters. The omitted 1 HP in Chinese was corroborated.
- **Ominous Signs:** trigger on a changed tens digit, not only an increase; remove corrupted duplicate Chinese text.
- Filled six entirely untranslated FAQs: four for Li Dian, one for Limit Break Guo Jia, and one for Limit Break Huang Gai.
- Standardized Kill, Dodge, Wine, Incendiary, Iron Shackles, Starvation, Point Duel, and Reforge labels. Added Cooperation objectives and Last Resort's written rule to the reader's Game terms and searchable rules.

## Source questions still requiring printed evidence

| Reference | Unconfirmed detail |
| --- | --- |
| Zhang Qiying — 点化 (`SP_QUN073`) | The source omits the number of cards to view. Its token wording differs from the available digital version. |
| Limit Break Pang De — 鞬出 (`JX_QUN008`) | A dangling “+1” has no stated object; newer versions also use different card-type branches. |
| Fei Yi — 晏如 (`SP_SHU018B`) | The odd-hand option omits where cards go. The unsupported Draw Pile destination was removed. |
| God Dian Wei — 神卫 (`LE016-2`) | The Chinese repeats the activation and transfer clauses; the English presents one of each. |
| God Diao Chan — 惑心 (`LE013-2`) | The number of Bewitch tokens is missing. The unsupported “per missing card” interpretation was removed. |
| Mobile Strategy Jiang Wei — 挑衅 (`SM_sb_jiangwei`) | The [written Last Resort keyword rule](https://github.com/libnoname/noname/blob/2e15429571d27ecf108fa51ab8684cff24ff7413/apps/core/noname/library/poptip.js) places the consequence after the options, while [this implementation](https://github.com/libnoname/noname/blob/2e15429571d27ecf108fa51ab8684cff24ff7413/apps/core/character/sb/skill.js) applies the damage boost before the attacks. |
| Siege War Tiger (`tool_siege_war_tiger`) | An incomplete Chinese clause does not establish the reveal/draw operation. |
| Demon God Mask (`armor_demon_god_mask`) | A typo in the damage clause has not been checked against the printing. |

Each has a localized note in the card reader. They are not silently represented as verified physical-card rules. The three pre-existing missing skill definitions elsewhere in the full library are outside both presets.
