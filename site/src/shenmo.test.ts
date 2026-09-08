import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  shenmoDeck,
  darkGoldDeck,
  decks,
  findDeck,
  deckCandidates,
  deckCardIds,
  deckChoicesKey,
  validDeckChoices,
  deckSearch,
} from "./decks";
import type { Card } from "./types";
const cards: Card[] = JSON.parse(
  readFileSync(new URL("../public/catalog.json", import.meta.url), "utf8"),
);
const entry = (group: string, name: string) => {
  const g = shenmoDeck.groups.find((g) => g.id === group)!;
  return { g, e: g.entries.find((e) => e.name_cn === name)! };
};
describe("Shenmo physical deck", () => {
  it("resolves both deck routes and keeps choices isolated while retaining old storage", () => {
    expect(decks).toHaveLength(2);
    expect(findDeck("shenmo-e-2026")).toBe(shenmoDeck);
    expect(findDeck("unknown")).toBeUndefined();
    expect(deckChoicesKey(darkGoldDeck)).toBe("sha-dark-gold-choices");
    expect(deckChoicesKey(shenmoDeck)).not.toBe(deckChoicesKey(darkGoldDeck));
    const { e } = entry("shenmo-exclusive", "神姜维");
    expect(validDeckChoices(cards, { [e.id]: "LE030" }, shenmoDeck)).toEqual(
      {},
    );
    expect(
      validDeckChoices(cards, { [e.id]: "SM_ps_shen_jiangwei" }, shenmoDeck),
    ).toEqual({ [e.id]: "SM_ps_shen_jiangwei" });
  });
  it("covers all 314 publisher entries without losing repeated names", () => {
    const entries = shenmoDeck.groups.flatMap((g) => g.entries);
    expect(entries).toHaveLength(314);
    expect(new Set(entries.map((e) => e.id)).size).toBe(314);
    expect(shenmoDeck.groups.map((g) => g.entries.length)).toEqual([
      28, 28, 29, 27, 7, 40, 28, 21, 28, 10, 14, 52, 2,
    ]);
    for (const g of shenmoDeck.groups)
      for (const e of g.entries) {
        expect(e.candidate_ids?.length, e.id).toBeGreaterThan(0);
        const refs = deckCandidates(cards, g, e);
        expect(refs.length, e.id).toBe(e.candidate_ids!.length);
        expect(
          refs.every(
            (c) =>
              c.image &&
              c.skills.length &&
              c.skills.every(
                (s) =>
                  s.description_cn &&
                  s.description_en &&
                  !s.translation_missing,
              ),
          ),
          e.id,
        ).toBe(true);
      }
  });
  it("separates exclusive God and Demon Jiang Wei from the regular God variant", () => {
    const god = entry("shenmo-exclusive", "神姜维"),
      demon = entry("shenmo-exclusive", "魔神姜维");
    const a = deckCandidates(cards, god.g, god.e),
      b = deckCandidates(cards, demon.g, demon.e);
    expect(a.map((c) => c.id)).toEqual(["SM_ps_shen_jiangwei"]);
    expect(b.map((c) => c.id)).toEqual(["SM_ps_devil_jiangwei"]);
    expect(a[0].skills.map((s) => s.name_cn)).toEqual(["焚志", "九乘", "燃尽"]);
    expect(b[0].skills.map((s) => s.name_cn)).toEqual(["魔魇", "九牲", "魂尽"]);
    expect(
      deckCandidates(
        cards.filter((c) => c.id !== a[0].id),
        god.g,
        god.e,
      ),
    ).toEqual([]);
    expect(deckSearch(cards, demon.g, demon.e, "Demon God Jiang Wei")).toBe(
      true,
    );
    expect(deckSearch(cards, demon.g, demon.e, "魔魇")).toBe(true);
  });
  it("does not mix Clan, OL Strategy, and Mobile Strategy rules", () => {
    const clan = entry("clans", "钟会");
    expect(deckCandidates(cards, clan.g, clan.e).map((c) => c.id)).toEqual([
      "SM_clan_zhonghui",
    ]);
    const ol = entry("ol-strategy", "关羽"),
      mobile = entry("mobile-strategy", "关羽");
    expect(deckCandidates(cards, ol.g, ol.e)[0].id).toBe("SM_ol_sb_guanyu");
    expect(deckCandidates(cards, mobile.g, mobile.e)[0].id).toBe(
      "SM_sb_guanyu",
    );
    expect(deckCardIds(cards, shenmoDeck).has("SM_ps_devil_jiangwei")).toBe(
      true,
    );
    expect(deckCardIds(cards, darkGoldDeck).has("SM_ps_devil_jiangwei")).toBe(
      false,
    );
  });
  it("includes linked and upgraded skills, original sources, and no template debris", () => {
    const added = cards.filter((c) => c.id.startsWith("SM_"));
    expect(added).toHaveLength(160);
    for (const c of added) {
      expect(c.source_reference?.url).toContain(
        "2e15429571d27ecf108fa51ab8684cff24ff7413",
      );
      expect(c.artwork_source?.deck_id).toBe(shenmoDeck.id);
      expect(c.thumbnail || c.image).toBeTruthy();
      for (const s of c.skills) {
        expect(s.description_en).not.toMatch(
          /undefined|\$\{|get\.poptip|rule_/,
        );
        expect(s.description_cn).not.toMatch(
          /undefined|\$\{|get\.poptip|rule_/,
        );
      }
    }
    expect(
      added
        .find((c) => c.id === "SM_dc_sb_jiaxu")
        ?.skills.some((s) => s.name_cn === "入世"),
    ).toBe(true);
    expect(
      added
        .find((c) => c.id === "SM_sb_pangtong")
        ?.skills.some((s) => s.name_cn === "连环·改"),
    ).toBe(true);
  });
});
