import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalize, normalizeId, matchText, searchCards } from "./matching";
import type { Card } from "./types";
const cards: Card[] = JSON.parse(
  readFileSync(new URL("../public/catalog.json", import.meta.url), "utf8"),
);
describe("OCR retrieval regressions", () => {
  it("joins vertical traditional characters", () => {
    expect(matchText(cards, "劉\n備\n仁德")[0].id).toBe("SHU001");
  });
  it("normalizes traditional names and fullwidth IDs", () => {
    expect(normalize("關 羽")).toBe("关羽");
    expect(normalizeId("ＳＨＵ-ＯＯ１")).toBe("SHU001");
  });
  it("preserves skin suffixes", () => {
    expect(normalizeId("LE OO5 skin1")).toBe("LE005SKIN1");
    expect(normalizeId("WEI OO1 beta")).toBe("WEI001BETA");
  });
  it("does not turn card text into a match for the single glyph Kill", () => {
    expect(
      matchText(cards, "你可以使用一张杀造成伤害").find(
        (c) => c.id === "basic_kill",
      ),
    ).toBeUndefined();
  });
  it("rejects unrelated text", () => {
    expect(matchText(cards, "coffee cappuccino receipt 24.50")).toEqual([]);
  });
  it("finds a traditional name, English typo, and printed ID", () => {
    expect(searchCards(cards, "關羽").some((c) => c.id === "SHU002")).toBe(
      true,
    );
    expect(searchCards(cards, "Liu Be").some((c) => c.id === "SHU001")).toBe(
      true,
    );
    expect(searchCards(cards, "SHU001")[0].id).toBe("SHU001");
  });
  it("preserves separate faction variants with a shared printed ID", () => {
    const variants = cards.filter((c) => c.printed_id === "WEI&WU074");
    expect(variants).toHaveLength(2);
    expect(new Set(variants.map((c) => c.id)).size).toBe(2);
    expect(new Set(variants.map((c) => c.faction))).toEqual(
      new Set(["Wei", "Wu"]),
    );
  });
});

it("finds every newly illustrated general by its English and Chinese names", () => {
  const references = cards.filter((card) => card.id.startsWith("REF_"));
  expect(references.length).toBeGreaterThan(0);
  for (const card of references) {
    for (const name of [card.name_en, card.name_cn]) {
      expect(
        searchCards(cards, name).some((match) => match.id === card.id),
        `${card.id}: ${name}`,
      ).toBe(true);
    }
  }
});
