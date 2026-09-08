import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { familyCards, rankVersions, suggestedVersion } from "./versions";
import type { Card } from "./types";
const cards: Card[] = JSON.parse(
  readFileSync(new URL("../public/catalog.json", import.meta.url), "utf8"),
);
const liubei = familyCards(
  cards,
  cards.find((c) => c.id === "SHU001")!,
);
describe("Version selection evidence", () => {
  it("groups rules variants by identity, including prefixed Chinese names", () => {
    expect(liubei.map((c) => c.id)).toEqual(
      expect.arrayContaining(["SHU001", "JX_SHU001", "LE009", "SP_SHU001"]),
    );
    expect(liubei.some((c) => c.id === "SHU002")).toBe(false);
  });
  it("does not confirm a version from a shared name and skill titles", () => {
    expect(
      suggestedVersion(rankVersions(liubei, "刘备 仁德 激将")),
    ).toBeUndefined();
  });
  it("does not treat a catalog ID alone as proof of a printed revision", () => {
    expect(suggestedVersion(rankVersions(liubei, "SHU001"))).toBeUndefined();
  });
  it("uses distinct full skill wording to separate Standard from Limit Break", () => {
    for (const id of ["SHU001", "JX_SHU001", "LE009", "SP_SHU001"]) {
      const card = liubei.find((c) => c.id === id)!;
      const text = card.skills.map((s) => s.description_cn).join("\n");
      expect(suggestedVersion(rankVersions(liubei, text))?.card.id).toBe(id);
    }
  });
  it("does not count repeated OCR passes as independent evidence", () => {
    const text = liubei
      .find((c) => c.id === "JX_SHU001")!
      .skills.map((s) => s.description_cn)
      .join("\n");
    expect(
      rankVersions(liubei, text + text + text).map((r) => [
        r.card.id,
        r.phraseHits,
      ]),
    ).toEqual(rankVersions(liubei, text).map((r) => [r.card.id, r.phraseHits]));
  });
  it("avoids matching an ordinary name inside a prefixed God name", () => {
    const matches = rankVersions(liubei, "神刘备");
    expect(matches[0].card.id).toBe("LE009");
    expect(matches.filter((m) => m.nameHit)).toHaveLength(1);
    expect(suggestedVersion(matches)).toBeUndefined();
  });
  it("does not choose between genuinely identical rule texts", () => {
    const card = liubei.find((c) => c.id === "SHU001")!;
    const twins = [
      card,
      { ...card, id: "same-art-reprint", printed_id: "same-art-reprint" },
    ];
    expect(
      suggestedVersion(
        rankVersions(
          twins,
          card.skills.map((s) => s.description_cn).join("\n"),
        ),
      ),
    ).toBeUndefined();
  });
  it("rejects unrelated OCR", () => {
    expect(
      rankVersions(liubei, "咖啡收据 coffee receipt").every(
        (r) => r.score === 0,
      ),
    ).toBe(true);
  });
});
describe("Collected community version references", () => {
  const sources = JSON.parse(
    readFileSync(
      new URL("../../assets/data/version-sources.json", import.meta.url),
      "utf8",
    ),
  );
  it("pins every reference to the audited source commit", () => {
    expect(sources.records.length).toBe(2317);
    expect(sources.packs.length).toBe(23);
    expect(
      sources.records.every((r: { source: string }) =>
        r.source.includes(sources.revision),
      ),
    ).toBe(true);
    expect(new Set(sources.records.map((r: { id: string }) => r.id)).size).toBe(
      sources.records.length,
    );
  });
  it("preserves separate source versions and does not turn them into recognized cards", () => {
    const family = sources.records.filter(
      (r: { family: string }) => r.family === "liubei",
    );
    expect(family.map((r: { id: string }) => r.id)).toEqual(
      expect.arrayContaining(["liubei", "re_liubei"]),
    );
    expect(cards.some((c) => c.id === "re_liubei")).toBe(false);
    expect(
      sources.records.every(
        (r: object) => !("image" in r) && !("description_en" in r),
      ),
    ).toBe(true);
  });
});
