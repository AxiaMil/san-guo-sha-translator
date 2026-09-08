export type Skill = {
  name_cn: string;
  name_en: string;
  description_cn: string;
  description_en: string;
  skill_type?: string;
  skill_type_secondary?: string;
  translation_reviewed?: boolean;
  translation_missing?: boolean;
};
export type Card = {
  id: string;
  printed_id: string;
  standard_id?: string;
  name_cn: string;
  name_en: string;
  kind: "general" | "card";
  faction?: string;
  health?: number;
  expansion?: string;
  category_en?: string;
  skills: Skill[];
  effect_en?: string[];
  effect_cn?: string[];
  faq: { q_en: string; a_en: string; q_cn: string; a_cn: string }[];
  image: string | null;
  aliases?: string[];
  source_reference?: { label: string; url: string; note: string };
  translation_reviewed?: boolean;
};
export type Candidate = {
  id: string;
  score: number;
  method: "artwork" | "text";
  reference?: string;
  inliers?: number;
  coverage?: number;
  card_outline?: [number, number][];
};
export type ScanResult = {
  candidates: Candidate[];
  strong?: boolean;
  detection?: { outlines: number; artwork_verified: boolean };
  quality?: { brightness: number; contrast: number; sharpness: number };
  guidance: string;
};
export type Rule = {
  id: string;
  term_en: string;
  term_cn: string;
  section_title_en: string;
  definition_en: string;
  definition_cn: string;
  rules: Record<string, unknown>[];
};
