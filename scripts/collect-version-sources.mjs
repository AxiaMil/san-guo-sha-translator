/** Collect factual version metadata without executing third-party JavaScript. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
const revision = "2e15429571d27ecf108fa51ab8684cff24ff7413";
const repo = "https://github.com/libnoname/noname";
const base = `https://raw.githubusercontent.com/libnoname/noname/${revision}/apps/core/character`;
const packs = [
  "standard",
  "refresh",
  "old",
  "shenhua",
  "yijiang",
  "sp",
  "sp2",
  "mobile",
  "onlyOL",
  "offline",
  "tw",
  "extra",
  "clan",
  "huicui",
  "jsrg",
  "newjiang",
  "sb",
  "shiji",
  "sixiang",
  "sxrm",
  "xianding",
  "yingbian",
  "bingshi",
];
const labels = {
  standard: "Standard",
  refresh: "Limit Break",
  old: "Historical variants",
  shenhua: "Myth Returns",
  yijiang: "Fame",
  mobile: "Mobile",
  onlyOL: "Online",
  offline: "Offline / special releases",
  tw: "Overseas",
  extra: "God / extra",
  sb: "Strategic variants",
  sp: "SP",
  sp2: "SP II",
  clan: "Clans",
  huicui: "Gathering Heroes",
  jsrg: "江山如故 · JSRG",
  newjiang: "New generals",
  shiji: "始计篇 · Shiji",
  sixiang: "Four Symbols",
  sxrm: "蚀心入魔 · SXRM",
  xianding: "Limited releases",
  yingbian: "Adaptation",
  bingshi: "兵势篇 · Bingshi",
};
const cache = path.join(os.tmpdir(), "sha-source-collection", revision);
fs.mkdirSync(cache, { recursive: true });
async function get(file) {
  const local = path.join(cache, file.replaceAll("/", "__"));
  if (fs.existsSync(local)) return fs.readFileSync(local, "utf8");
  const response = await fetch(`${base}/${file}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error(`${file}: HTTP ${response.status}`);
  const text = await response.text();
  fs.writeFileSync(local, text);
  return text;
}
function literal(node) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node))
    return Object.fromEntries(
      node.properties
        .filter(ts.isPropertyAssignment)
        .map((p) => [
          p.name.getText().replace(/^["']|["']$/g, ""),
          literal(p.initializer),
        ]),
    );
  return undefined; // Never eval imports, calls, getters, or expressions.
}
function objects(text) {
  const source = ts.createSourceFile(
    "source.js",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const data = {},
    lines = {};
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    )
      data[node.name.getText(source)] = literal(node.initializer);
    if (ts.isBinaryExpression(node) && ts.isObjectLiteralExpression(node.right))
      data.replace = literal(node.right);
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === "characters" &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const property of node.initializer.properties)
        if (ts.isPropertyAssignment(property))
          lines[property.name.getText(source).replace(/^["']|["']$/g, "")] =
            source.getLineAndCharacterOfPosition(property.getStart(source))
              .line + 1;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { data, source, lines };
}
const replacements = objects(await get("replace.js")).data.replace;
if (!replacements || !Array.isArray(replacements.liubei))
  throw Error("Family mapping schema changed.");
const family = new Map(
  Object.entries(replacements).flatMap(([name, ids]) =>
    ids.map((id) => [id, name]),
  ),
);
const collected = [];
const sharedNames = {};
// Modest concurrent batches, pinned to a commit for repeatable reviews.
for (let i = 0; i < packs.length; i += 4) {
  const batch = await Promise.all(
    packs.slice(i, i + 4).map(async (pack) => {
      const [characters, translations, sort] = await Promise.all(
        ["character.js", "translate.js", "sort.js"].map((f) =>
          get(`${pack}/${f}`).then(objects),
        ),
      );
      const chars = characters.data.characters;
      const tr = translations.data.translates || translations.data.translate;
      if (!chars || !tr) throw Error(`Unrecognized schema: ${pack}`);
      Object.assign(sharedNames, tr);
      const groups = sort.data.characterSort || {},
        groupNames = sort.data.characterSortTranslate || {};
      return Object.entries(chars).map(([id, c]) => ({
        id,
        family: family.get(id) || id,
        name_cn: tr[id] || id,
        prefix_cn: tr[`${id}_prefix`] || "",
        pack,
        pack_en: labels[pack],
        group_cn:
          groupNames[
            Object.keys(groups).find((k) => groups[k]?.includes(id))
          ] || "",
        faction: c.group,
        hp: c.hp,
        skill_ids: c.skills || [],
        source: `${repo}/blob/${revision}/apps/core/character/${pack}/character.js#L${characters.lines[id]}`,
      }));
    }),
  );
  collected.push(...batch.flat());
}
for (const record of collected) {
  if (
    record.name_cn === record.id &&
    typeof sharedNames[record.id] === "string"
  )
    record.name_cn = sharedNames[record.id];
}
const result = {
  source: "Noname community version catalog",
  source_url: repo,
  revision,
  retrieved: "2026-09-08",
  license_url: `${repo}/blob/${revision}/LICENSE`,
  scope:
    "Character identities, family relationships and pack metadata only. No artwork, skill implementation or translated rules imported. These are community client records, not a complete physical-printing checklist.",
  packs: packs.map((id) => ({ id, name: labels[id] })),
  records: collected.sort(
    (a, b) => a.family.localeCompare(b.family) || a.id.localeCompare(b.id),
  ),
};
fs.writeFileSync(
  "assets/data/version-sources.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  `Collected ${collected.length} version records across ${packs.length} packs at ${revision}`,
);
