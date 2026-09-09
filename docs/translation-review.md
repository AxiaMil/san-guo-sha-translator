# Translation and reading update — 8 September 2026

For the later full audit of both presets, see [10 September preset translation audit](preset-translation-audit-2026-09-10.md).

This pass revises 18 shared skills, six basic card effects, the Dodge FAQ, and the two Wen Yang faction names. The Chinese source is retained. This is a targeted editorial/rules correction, not certification of every entry in the 704-card library.

The terminology guide in `.claude/skills/sgs-ruleset-terminology/` defines the project's English names. Kill/Dodge remain the displayed names; Slash/Jink and sha/shan are search aliases. Use and Play, HP loss and damage, Show and Reveal, and Substitute and Replace and keep remain distinct.

## Material corrections

- Benevolence: healing is once per phase after giving at least two cards, not healing after every subsequent card. The Standard SHU001 wording is clarified by the [Chinese Shu general reference](https://gltjk.com/sanguosha/rules/card/hero/shu.html). Other edition-specific skills remain separate.
- Steady Resolve: five is the maximum hand size reached by drawing, not permission to draw five additional cards. Checked against the stored Chinese `至多摸至五张`.
- Wild Boast: using a card from the viewed options is optional, and its cost discards all cards in the first X listed zones, not X individual cards. Checked against the stored Chinese `可以使用` and `前X个区域里的牌`.
- Grand Rise/Demonic Wit: explicitly distinguish keeping the replaced cards from discarding the substituted Judgment Card. See [card operations and terminology](https://gltjk.com/sanguosha/rules/glossary/gamecard.html).
- Kill/Dodge: a target uses Dodge to negate Kill. Playing cards in a Duel is a different action. See [basic card reference](https://gltjk.com/sanguosha/rules/card/basic.html).
- Distance, Hand Limit, recovery, and damage modifiers now use complete sentences rather than ambiguous arithmetic fragments.
- Repair Armor's three independent conditions are separated into readable lines, preserving the Basic/Tool/non-Equipment distinctions.
- 魏文鸯 / 吴文鸯 are Wen Yang, not Wen Yuan. Their separate IDs and faction variants remain intact.

The linked rule reference is an older Rules 3.0 mirror; it does not override edition-specific printed text. In particular, this update preserves the repository's Peach/Wine targeting rules rather than importing a different edition from that reference.

## Explicit source gaps

The source has no definitions for `skill_burn_the_heart`, `skill_sp_loyal_discernment`, and `skill_sp_gifted_insight`. The catalog now displays those named skills with a missing-source notice on Ling Ju and Xin Xianying. Similar names in another edition are not substituted. Newly unresolved IDs fail the build so they cannot silently disappear. The known gaps and reviewed record IDs are tracked in `assets/data/translation-review.json`.

## Reading features

- Persistent English, bilingual, and Chinese modes, plus standard/large text.
- Links from bracketed card names to the relevant card; Back returns to the preceding reader.
- Edition selector and printed IDs.
- Game-term explanations separate from the full skill text.
- Rule search includes nested examples; annotated segments are not repeated as duplicate paragraphs. All matching entries are reachable with pagination.
- A six-phase refresher is labeled as a standard-turn guide, not a replacement for card-specific rules.
