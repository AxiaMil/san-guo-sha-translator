import { normalize } from "./matching";
import type { Rule } from "./types";
export type ReadingMode = "English" | "Bilingual" | "中文";
export function preference<T extends string>(
  key: string,
  choices: readonly T[],
  fallback: T,
): T {
  try {
    const value = localStorage.getItem(key);
    return choices.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}
export function savePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Private browsing can disable storage. */
  }
}
// Segments repeat the enclosing sentence. Render the sentence once, then its examples.
export function ruleText(value: unknown, language: "en" | "cn"): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => ruleText(v, language));
  if (!value || typeof value !== "object") return [];
  const obj = value as Record<string, unknown>;
  const text = [obj[`title_${language}`], obj[language]].filter(
    (v): v is string => typeof v === "string",
  );
  for (const [key, v] of Object.entries(obj)) {
    if (key === "segments" && text.length) continue;
    if (Array.isArray(v) && !key.endsWith(language === "en" ? "_cn" : "_en"))
      text.push(...ruleText(v, language));
  }
  return text;
}
export function searchRules(rules: Rule[], query: string, category = "All") {
  const q = normalize(query);
  return rules.filter(
    (r) =>
      (category === "All" || r.id.startsWith(category)) &&
      normalize(
        [
          r.term_en,
          r.term_cn,
          r.definition_en,
          r.definition_cn,
          ...ruleText(r.rules, "en"),
          ...ruleText(r.rules, "cn"),
        ].join(" "),
      ).includes(q),
  );
}
export const terms = [
  {
    name: "Use / Play",
    cn: "使用 / 打出",
    text: "Use activates a card’s effect. Play supplies a card when a rule or effect requests it. They are different actions: you use Dodge against Kill, but play Kill in a Duel.",
  },
  {
    name: "HP / damage",
    cn: "体力 / 伤害",
    text: "Losing HP is not taking damage. Skills that trigger after damage do not automatically trigger after HP loss. Recovering HP cannot raise your HP Value above your Max HP.",
  },
  {
    name: "Distance / Attack Range",
    cn: "距离 / 攻击范围",
    text: "Distance is measured between characters and can be modified by cards or skills. Attack Range determines which characters you can normally target with Kill.",
  },
  {
    name: "Locked Skill",
    cn: "锁定技",
    text: "A compulsory skill that applies when its conditions are met. Follow its full text; it is not an optional activation.",
  },
  {
    name: "Lord Skill",
    cn: "主公技",
    text: "In the role mode, a Lord Skill is available when its owner is the Lord. Other modes may have different rules.",
  },
  {
    name: "Substitute / Replace and keep",
    cn: "代替 / 替换",
    text: "Substitute sends the original card to the Discard Pile. Replace and keep lets you gain the original card. These outcomes are different.",
  },
  {
    name: "Show / Reveal",
    cn: "展示 / 亮出",
    text: "Show temporarily exposes a card to everyone, then returns it to its prior visibility. Reveal leaves it face-up.",
  },
  {
    name: "Hand Limit",
    cn: "手牌上限",
    text: "Normally equal to your current HP Value. During your Discard Phase, discard excess hand cards down to your Hand Limit. Card and skill effects can change the limit.",
  },
];
