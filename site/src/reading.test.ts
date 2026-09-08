import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ruleText, searchRules } from "./reading";
import { searchCards } from "./matching";
import type { Card, Rule } from "./types";
const read = (path: string) =>
  JSON.parse(
    readFileSync(new URL(path, import.meta.url), "utf8").replace(/^\uFEFF/, ""),
  );
const cards: Card[] = read("../public/catalog.json");
const skills = read("../../assets/data/skills.json");
const rules: Rule[] = read("../public/rules.json");
describe("Readable, faithful translations", () => {
  it("limits Benevolence healing to once per phase", () => {
    expect(skills.skill_benevolence.description_en).toContain(
      "only once per phase",
    );
    expect(skills.skill_benevolence.description_en).not.toContain("Each time");
  });
  it("caps the resulting hand, rather than the number of cards drawn", () => {
    expect(skills.skill_steady_resolve.description_en).toContain(
      "until they have 5 hand cards",
    );
  });
  it("discards the first X zones, not just X individual cards", () => {
    expect(skills.skill_wild_boast.description_en).toContain(
      "discard all cards in the first X",
    );
    expect(skills.skill_wild_boast.description_en).toContain(
      "You may then use",
    );
  });
  it("distinguishes using Dodge from playing cards in a Duel", () => {
    for (const id of ["basic_kill", "basic_fire_kill", "basic_thunder_kill"])
      expect(cards.find((c) => c.id === id)?.effect_en?.[0]).toContain(
        "use [Dodge]",
      );
    expect(skills.skill_peerless.description_en).toContain("play 2 [Kill]");
  });
  it("retains the original card when replacing and keeping, but not substituting", () => {
    expect(skills.skill_grand_rise.description_en).toContain(
      "keep the replaced cards in your hand",
    );
    expect(skills.skill_demonic_wit.description_en).toContain(
      "original Judgment Card is discarded",
    );
  });
  it("shows all unresolved edition-specific skills instead of dropping them", () => {
    const missing = cards.flatMap((c) =>
      c.skills.filter((s) => s.translation_missing),
    );
    expect(missing).toHaveLength(3);
    expect(
      cards.find((c) => c.id === "SP_WEI064")?.skills.map((s) => s.name_cn),
    ).toEqual(["忠鉴", "才识"]);
    expect(missing.every((s) => s.description_en.includes("edition"))).toBe(
      true,
    );
  });
  it("fixes Wen Yang in both faction variants without combining them", () => {
    expect(
      cards.filter((c) => c.printed_id === "WEI&WU074").map((c) => c.name_en),
    ).toEqual(["Wei · Wen Yang", "Wu · Wen Yang"]);
  });
  it.each([
    ["sha", "basic_kill"],
    ["slash", "basic_kill"],
    ["jink", "basic_dodge"],
    ["tao", "basic_peach"],
    ["huo sha", "basic_fire_kill"],
  ])("finds the familiar alias %s", (query, id) => {
    expect(searchCards(cards, query)[0].id).toBe(id);
  });
});
describe("Complete rulebook reading and search", () => {
  it("does not confuse the card Kill with the word skill", () => {
    const skill: Rule = {
      ...rules[0],
      term_en: "Skill",
      term_cn: "",
      definition_en: "A compulsory skill.",
      definition_cn: "",
      rules: [],
    };
    expect(searchRules([skill], "Slash")).toEqual([]);
    expect(searchRules([skill], "Kill")).toEqual([]);
  });
  it.each([
    ["Slash", "Kill"],
    ["Jink", "Dodge"],
  ])("finds the familiar rules alias %s", (alias, printed) => {
    const expected = searchRules(rules, printed);
    expect(expected.length).toBeGreaterThan(0);
    expect(searchRules(rules, alias)).toEqual(expected);
  });
  it("does not repeat annotated sentence segments", () => {
    expect(
      ruleText(
        {
          en: "Draw 2 cards.",
          segments: [{ en: "Draw " }, { en: "2 cards." }],
          examples: [{ en: "A nested example.", cn: "例子" }],
        },
        "en",
      ),
    ).toEqual(["Draw 2 cards.", "A nested example."]);
  });
  it("renders Chinese and segment-only entries", () => {
    expect(
      ruleText({ en: "English", cn: "中文", examples: [{ cn: "例子" }] }, "cn"),
    ).toEqual(["中文", "例子"]);
    expect(ruleText({ segments: [{ en: "Segment" }] }, "en")).toEqual([
      "Segment",
    ]);
  });
  it("finds text inside the rule body and filters by category", () => {
    const turn = rules.find((r) => r.id === "flow_3_1_turn_flow")!;
    expect(searchRules([turn], "Breach the Pass")).toEqual([turn]);
    expect(searchRules([turn], "Breach the Pass", "setup")).toEqual([]);
  });
  it("exposes every rule category and all entries", () => {
    expect(searchRules(rules, "")).toHaveLength(rules.length);
    for (const category of ["setup", "flow", "glossary", "rules"])
      expect(searchRules(rules, "", category).length).toBeGreaterThan(0);
  });
});
