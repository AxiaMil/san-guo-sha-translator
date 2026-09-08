import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  darkGoldDeck as deck,
  deckCandidates,
  deckSearch,
  validDeckChoices,
} from "./decks";
import type { Card } from "./types";
const cards: Card[] = JSON.parse(
  readFileSync(new URL("../public/catalog.json", import.meta.url), "utf8"),
);
const find = (group: string, name: string) => {
  const g = deck.groups.find((g) => g.id === group)!;
  return { g, e: g.entries.find((e) => e.name_cn === name)! };
};
describe("Dark Gold physical deck", () => {
  it("preserves all 139 publisher entries including repeated names in different groups", () => {
    expect(deck.groups.map((g) => g.entries.length)).toEqual([
      29, 29, 16, 14, 14, 21, 15, 1,
    ]);
    expect(
      new Set(deck.groups.flatMap((g) => g.entries.map((e) => e.id))).size,
    ).toBe(139);
    expect(
      deck.groups.flatMap((g) =>
        g.entries.filter((e) => deckCandidates(cards, g, e).length),
      ),
    ).toHaveLength(139);
    expect(deck.counts).toEqual({
      generals: 139,
      game_cards: 162,
      accessories: 23,
    });
  });
  it("does not substitute Standard Sun Jian for Star Sun Jian", () => {
    const { g, e } = find("stars", "孙坚");
    const candidates = deckCandidates(cards, g, e);
    expect(candidates.map((c) => c.id)).toEqual(["REF_star_sunjian"]);
  });
  it("does not conflate Sleeping Dragon and Standard Zhuge Liang", () => {
    const { g, e } = find("myth-break", "诸葛亮");
    expect(
      deckCandidates(cards, g, e).some((c) =>
        ["SHU004", "JX_SHU004"].includes(c.id),
      ),
    ).toBe(false);
  });
  it("normalizes the publisher checklist typo without rewriting the printed source", () => {
    const { g, e } = find("yin-thunder", "毋丘俭");
    expect(e.search_name_cn).toBe("毌丘俭");
    expect(deckCandidates(cards, g, e).map((c) => c.id)).toContain("WEI068");
  });
  it("preserves two separate Zhang Chunhua entries", () => {
    const star = find("stars", "张春华"),
      ol = find("ol-fame", "张春华");
    expect(deckCandidates(cards, star.g, star.e).map((c) => c.id)).toEqual([
      "REF_star_zhangchunhua",
    ]);
    expect(deckCandidates(cards, ol.g, ol.e).map((c) => c.id)).toContain(
      "JX_WEI027",
    );
    expect(star.e.id).not.toBe(ol.e.id);
  });
  it("rejects stale, malformed and cross-entry remembered versions", () => {
    const { e } = find("stars", "孙坚");
    expect(
      validDeckChoices(cards, { [e.id]: "JX_WU009", fake: "SHU001" }),
    ).toEqual({});
    expect(validDeckChoices(cards, [])).toEqual({});
    expect(validDeckChoices(cards, { [e.id]: "REF_star_sunjian" })).toEqual({
      [e.id]: "REF_star_sunjian",
    });
  });
  it("finds English names and Chinese skills in the owned deck", () => {
    const { g, e } = find("exclusive", "夏侯岚");
    expect(deckSearch(cards, g, e, "Xiahou Lan")).toBe(true);
    expect(deckSearch(cards, g, e, "双锋")).toBe(true);
  });
  it("keeps missing variants visible rather than selecting a same-name substitute", () => {
    const { g, e } = find("stars", "荀彧");
    expect(
      deckCandidates(
        cards.filter((c) => c.id !== "REF_star_xunyu"),
        g,
        e,
      ),
    ).toEqual([]);
  });
  it("includes granted and upgraded skills, provenance, and verified artwork sources", () => {
    const newer = cards.filter((c) => c.id.startsWith("REF_"));
    expect(newer).toHaveLength(21);
    for (const c of newer) {
      expect(c.source_reference?.url).toContain(
        "2e15429571d27ecf108fa51ab8684cff24ff7413",
      );
      expect(c.image).toBe(`/images/generals/${c.id}.webp`);
      expect(c.artwork_source?.deck_id).toBe(deck.id);
      expect(c.artwork_source?.verification_url).toContain("BV1Ehj36zEny");
      expect(Math.min(...c.artwork_source!.dimensions)).toBeGreaterThanOrEqual(
        350,
      );
      for (const s of c.skills) {
        expect(s.description_en.length).toBeGreaterThan(20);
        expect(s.description_cn).not.toMatch(/undefined|\$\{|get\.poptip/);
      }
    }
    expect(
      cards
        .find((c) => c.id === "REF_pe_xiahoulan")
        ?.skills.map((s) => s.name_cn),
    ).toEqual(["迅击", "双锋", "归刃", "义驰"]);
    expect(
      cards.find((c) => c.id === "REF_star_taishici")?.skills,
    ).toHaveLength(3);
  });
});
