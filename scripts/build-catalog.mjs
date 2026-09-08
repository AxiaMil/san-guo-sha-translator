import fs from "node:fs";
const read = (p) =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
const skills = read("assets/data/skills.json");
const review = read("assets/data/translation-review.json");
const artwork = new Map(
  ["assets/data/deck-artwork.json", "assets/data/shenmo-artwork.json"].flatMap(
    (file) => read(file).artworks.map((a) => [a.card_id, a]),
  ),
);
const cards = [];
const missing = [];
function resolveSkill(skill, cardId) {
  if (typeof skill !== "string") return skill;
  if (skills[skill])
    return {
      ...skills[skill],
      translation_reviewed: review.skills.includes(skill),
    };
  if (!review.unresolved[skill])
    throw new Error(
      `Unknown skill ${skill} on ${cardId}; do not silently omit it.`,
    );
  missing.push({ card: cardId, skill });
  return {
    ...review.unresolved[skill],
    description_en:
      "This edition’s skill text is missing from the source library. Check the printed card before playing; another edition may work differently.",
    description_cn: "源资料缺少此版本的技能文本，请以实体卡牌为准。",
    translation_missing: true,
  };
}
for (const file of fs
  .readdirSync("assets/data/generals")
  .filter((f) => f.endsWith(".json") && f !== "skin.json")) {
  for (const card of read(`assets/data/generals/${file}`))
    cards.push({
      ...card,
      kind: "general",
      skills: (card.skills || []).map((s) => resolveSkill(s, card.id)),
      image: `/images/generals/${card.id}.webp`,
    });
}
for (const file of fs
  .readdirSync("assets/data/library")
  .filter((f) => f.endsWith(".json"))) {
  for (const card of read(`assets/data/library/${file}`))
    cards.push({
      ...card,
      kind: "card",
      translation_reviewed: review.cards.includes(card.id),
      skills: [],
      image: `/images/library/${card.id}.webp`,
    });
}
const aliases = {
  basic_kill: ["sha", "slash"],
  basic_dodge: ["shan", "jink"],
  basic_peach: ["tao"],
  basic_wine: ["jiu", "analeptic"],
  basic_fire_kill: ["huo sha", "fire slash"],
  basic_thunder_kill: ["lei sha", "thunder slash"],
};
const ids = new Set();
for (const card of cards) {
  card.aliases = [...(card.aliases || []), ...(aliases[card.id] || [])];
  card.printed_id = card.id;
  if (ids.has(card.id)) card.id = `${card.id}--${card.faction || ids.size}`;
  ids.add(card.id);
  if (!fs.existsSync(`assets${card.image}`)) card.image = null;
  if (card.image) {
    for (const [field, folder] of [
      ["thumbnail", "thumbnails"],
      ["preview", "previews"],
    ]) {
      const path = card.image.replace("/images/", `/images/${folder}/`);
      if (fs.existsSync(`assets${path}`)) card[field] = path;
    }
  }
  const art = artwork.get(card.id);
  if (art && card.image)
    card.artwork_source = {
      label: art.source_label,
      url: art.source_page,
      dimensions: art.source_dimensions,
      deck_id: art.verification.deck_id,
      verification_url:
        art.verification.time_seconds !== undefined
          ? `${art.verification.url}?t=${art.verification.time_seconds}`
          : art.verification.url,
      verification_label:
        art.verification.label || "View this card in the deck",
    };
}
fs.mkdirSync("site/public", { recursive: true });
console.log(`Source gaps displayed explicitly: ${missing.length}`);
fs.writeFileSync("site/public/catalog.json", JSON.stringify(cards));
fs.writeFileSync(
  "site/public/version-sources.json",
  JSON.stringify(read("assets/data/version-sources.json")),
);
fs.writeFileSync(
  "site/public/rules.json",
  JSON.stringify(
    fs
      .readdirSync("assets/data/ruleset")
      .flatMap((f) => read(`assets/data/ruleset/${f}`)),
  ),
);
fs.cpSync("assets/images", "site/public/images", { recursive: true });
const pairs = [
  ...fs
    .readFileSync("lib/core/services/text_normaliser.dart", "utf8")
    .matchAll(/'([^']+)': '([^']+)'/g),
].map((m) => [m[1], m[2]]);
fs.writeFileSync(
  "site/src/traditional.json",
  JSON.stringify(Object.fromEntries(pairs)),
);
console.log(
  `Built ${cards.length} cards (${cards.filter((c) => c.kind === "general").length} generals), ${cards.filter((c) => c.image).length} images`,
);
