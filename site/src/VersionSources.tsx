import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { normalize } from "./matching";
import { sourceFamily } from "./versions";
import type { Card } from "./types";
type Record = {
  id: string;
  family: string;
  name_cn: string;
  prefix_cn: string;
  pack: string;
  pack_en: string;
  group_cn: string;
  source: string;
};
type Collection = {
  revision: string;
  records: Record[];
  packs: { id: string; name: string }[];
};
let collection: Promise<Collection> | undefined;
function loadCollection() {
  return (collection ||= fetch("/version-sources.json")
    .then((r) => {
      if (!r.ok) throw Error();
      return r.json();
    })
    .catch((e) => {
      collection = undefined;
      throw e;
    }));
}
export default function VersionSources({ card }: { card?: Card }) {
  const [data, setData] = useState<Collection>(),
    [error, setError] = useState(false),
    [query, setQuery] = useState(""),
    [pack, setPack] = useState("all"),
    [limit, setLimit] = useState(20);
  async function load() {
    setError(false);
    try {
      setData(await loadCollection());
    } catch {
      setError(true);
    }
  }
  const family = card ? sourceFamily(card) : "";
  const records =
    data?.records.filter(
      (r) =>
        (!card ||
          (family &&
            r.family.replace(/^shen_/, "").replaceAll("_", "") === family)) &&
        (pack === "all" || r.pack === pack) &&
        normalize(
          [r.name_cn, r.prefix_cn, r.id, r.pack_en, r.group_cn].join(" "),
        ).includes(normalize(query)),
    ) || [];
  return (
    <details
      className="version-sources"
      onToggle={(e) => {
        if (e.currentTarget.open && !data && !error) void load();
      }}
    >
      <summary>
        <ExternalLink size={16} />
        {card
          ? "More versions documented by the community"
          : "Browse the version source collection"}
      </summary>
      <div className="source-content">
        <p>
          Community records are useful for finding variants across Standard,
          Limit Break, historical, Online, Mobile, and other packs. They are{" "}
          <strong>source references</strong>; a source listing does not mean its
          artwork is indexed or its rules are translated. Some related
          translations are available in the library.
        </p>
        <div className="source-links">
          <a
            href="https://www.sanguosha.com/news/20140307_4955_5126"
            target="_blank"
            rel="noreferrer"
          >
            Official release example ↗
          </a>
          <a
            href="https://wiki.biligame.com/sgs/武将图鉴"
            target="_blank"
            rel="noreferrer"
          >
            BWIKI card database ↗
          </a>
          <a
            href="https://github.com/libnoname/noname"
            target="_blank"
            rel="noreferrer"
          >
            Noname source packs ↗
          </a>
        </div>
        {error ? (
          <button className="text-link" onClick={() => void load()}>
            Couldn’t load references. Try again
          </button>
        ) : !data ? (
          <p role="status">Loading the version collection…</p>
        ) : (
          <>
            <p className="source-count">
              {data.records.length.toLocaleString()} records collected from{" "}
              {data.packs.length} packs. Physical print years and completeness
              are unverified.
            </p>
            <div className="search-field">
              <Search size={17} />
              <input
                aria-label="Search source versions"
                placeholder="Chinese name, pinyin ID, or pack"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(20);
                }}
              />
            </div>
            <label className="source-pack-label">
              Source pack
              <select
                aria-label="Source pack"
                value={pack}
                onChange={(e) => {
                  setPack(e.target.value);
                  setLimit(20);
                }}
              >
                <option value="all">All source packs</option>
                {data.packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="result-count" role="status">
              {records.length} matching references
              {card ? ` for ${card.name_en}` : ""}
            </p>
            {records.slice(0, limit).map((r) => (
              <a
                className="source-record"
                href={r.source}
                target="_blank"
                rel="noreferrer"
                key={r.id}
              >
                <span>
                  <strong>
                    {r.prefix_cn &&
                    !r.name_cn.startsWith(r.prefix_cn.split("|")[0])
                      ? r.prefix_cn.split("|")[0]
                      : ""}
                    {r.name_cn}
                  </strong>
                  <small>
                    {r.pack_en} · {r.group_cn}
                  </small>
                  <code>{r.id}</code>
                </span>
                <ExternalLink size={16} />
              </a>
            ))}
            {!records.length && (
              <p className="guide-note">
                No source records match this selection. This does not establish
                that other versions do not exist.
              </p>
            )}
            {limit < records.length && (
              <button
                className="text-link"
                onClick={() => setLimit((n) => n + 20)}
              >
                Show more source records
              </button>
            )}
            <p className="guide-note">
              Snapshot: Noname{" "}
              <a
                href={`https://github.com/libnoname/noname/tree/${data.revision}`}
                target="_blank"
                rel="noreferrer"
              >
                {data.revision.slice(0, 7)}
              </a>
              . Source repository: GPL-3.0. Metadata only; no images or rules
              code imported.
            </p>
          </>
        )}
      </div>
    </details>
  );
}
