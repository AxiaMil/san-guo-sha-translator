import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decks, deckCardIds } from "./decks";
import type { Card } from "./types";

type ReviewTarget = {
  file: string;
  pointer: string;
  fields: string[];
  sha256: string;
};
const read = (file: string) => JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const audit = read("assets/data/preset-translation-audit.json") as {
  decks: { id: string; general_ids: string[] }[];
  targets: ReviewTarget[];
};
const cards = read("site/public/catalog.json") as Card[];
const targetKey = (file: string, pointer: string) => `${file}#${pointer}`;
const reviewed = new Set(audit.targets.map(t => targetKey(t.file, t.pointer)));
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

describe("preset translation audit coverage", () => {
  it("has English questions and answers for every Chinese FAQ in scope", () => {
    const ids = new Set(audit.decks.flatMap(d => d.general_ids));
    for (const card of cards.filter(c => c.kind === "card" || ids.has(c.id))) {
      for (const [index, faq] of card.faq.entries()) {
        if (faq.q_cn) expect(faq.q_en.trim(), `${card.id} FAQ ${index} question`).not.toBe("");
        if (faq.a_cn) expect(faq.a_en.trim(), `${card.id} FAQ ${index} answer`).not.toBe("");
      }
    }
  });
  it("covers every selectable general edition in both presets", () => {
    expect(audit.decks.map(d => d.id).sort()).toEqual(decks.map(d => d.id).sort());
    for (const deck of decks) {
      expect([...deckCardIds(cards, deck)].sort(), deck.id).toEqual(
        [...audit.decks.find(d => d.id === deck.id)!.general_ids].sort(),
      );
    }
  });

  it("requires a fresh review when audited Chinese or English changes", () => {
    const files = new Map<string, unknown>();
    expect(reviewed.size).toBe(audit.targets.length);
    for (const target of audit.targets) {
      if (!files.has(target.file)) files.set(target.file, read(target.file));
      let record: any = files.get(target.file);
      for (const key of target.pointer.split("/").slice(1)) record = record?.[key];
      expect(record, targetKey(target.file, target.pointer)).toBeTruthy();
      const content = Object.fromEntries(target.fields.map(key => [key, record[key]]));
      const hash = createHash("sha256").update(stable(content)).digest("hex");
      expect(hash, `${target.file}${target.pointer}: translation changed; re-review before refreshing the audit`).toBe(target.sha256);
    }
  });

  it("covers all preset skill definitions, FAQs, and shared playing cards", () => {
    const ids = new Set(audit.decks.flatMap(d => d.general_ids));
    const seen = new Set<string>();
    for (const name of readdirSync("assets/data/generals").filter(n => n.endsWith(".json") && n !== "skin.json")) {
      const file = `assets/data/generals/${name}`;
      for (const [index, card] of read(file).entries()) {
        const id = seen.has(card.id) ? `${card.id}--${card.faction || seen.size}` : card.id;
        seen.add(id);
        if (!ids.has(id)) continue;
        expect(reviewed.has(targetKey(file, `/${index}`)), id).toBe(true);
        for (const [skillIndex, skill] of (card.skills || []).entries()) {
          const key = typeof skill === "string"
            ? targetKey("assets/data/skills.json", `/${skill}`)
            : targetKey(file, `/${index}/skills/${skillIndex}`);
          expect(reviewed.has(key), `${id}: ${key}`).toBe(true);
        }
      }
    }
    for (const name of readdirSync("assets/data/library").filter(n => n.endsWith(".json"))) {
      const file = `assets/data/library/${name}`;
      for (const [index, card] of read(file).entries())
        expect(reviewed.has(targetKey(file, `/${index}`)), card.id).toBe(true);
    }
  });
});
