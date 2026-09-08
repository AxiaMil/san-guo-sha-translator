import fs from "node:fs";
const read = (p) =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
const skills = read("assets/data/skills.json");
const cards = [];
for (const file of fs
  .readdirSync("assets/data/generals")
  .filter((f) => f.endsWith(".json") && f !== "skin.json")) {
  for (const card of read(`assets/data/generals/${file}`))
    cards.push({
      ...card,
      kind: "general",
      skills: (card.skills || [])
        .map((s) => (typeof s === "string" ? skills[s] : s))
        .filter(Boolean),
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
      skills: [],
      image: `/images/library/${card.id}.webp`,
    });
}
const ids = new Set();
for (const card of cards) {
  card.printed_id = card.id;
  if (ids.has(card.id)) card.id = `${card.id}--${card.faction || ids.size}`;
  ids.add(card.id);
  if (!fs.existsSync(`assets${card.image}`)) card.image = null;
}
fs.mkdirSync("site/public", { recursive: true });
fs.writeFileSync("site/public/catalog.json", JSON.stringify(cards));
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
