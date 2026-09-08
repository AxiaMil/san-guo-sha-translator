import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Search,
  Layers,
  ScanLine,
} from "lucide-react";
import {
  darkGoldDeck as deck,
  deckCandidates,
  deckSearch,
  validDeckChoices,
  type DeckChoices,
} from "./decks";
import { savePreference } from "./reading";
import type { Card } from "./types";
export default function DeckView({
  cards,
  onOpen,
  onLibrary,
  onScan,
  pinned,
  onPin,
}: {
  cards: Card[];
  onOpen: (card: Card) => void;
  onLibrary: () => void;
  onScan: () => void;
  pinned: boolean;
  onPin: () => void;
}) {
  const [query, setQuery] = useState(""),
    [groupId, setGroupId] = useState("all"),
    [onlyMissing, setOnlyMissing] = useState(false);
  const [choices, setChoices] = useState<DeckChoices>(() => {
    try {
      return validDeckChoices(
        cards,
        JSON.parse(localStorage.getItem("sha-dark-gold-choices") || "{}"),
      );
    } catch {
      return {};
    }
  });
  const candidatesByEntry = useMemo(
    () =>
      Object.fromEntries(
        deck.groups.flatMap((group) =>
          group.entries.map((entry) => [
            entry.id,
            deckCandidates(cards, group, entry),
          ]),
        ),
      ),
    [cards],
  );
  const available = Object.values(candidatesByEntry).filter(
    (candidates) => candidates.length,
  ).length;
  const groups = deck.groups
    .filter((g) => groupId === "all" || g.id === groupId)
    .map((g) => ({
      ...g,
      entries: g.entries.filter(
        (e) =>
          deckSearch(cards, g, e, query, candidatesByEntry[e.id]) &&
          (!onlyMissing || !candidatesByEntry[e.id].length),
      ),
    }))
    .filter((g) => g.entries.length);
  function remember(entry: string, card: string) {
    const next = { ...choices };
    if (next[entry] === card) delete next[entry];
    else next[entry] = card;
    setChoices(next);
    savePreference("sha-dark-gold-choices", JSON.stringify(next));
  }
  return (
    <section className="deck-page">
      <button className="text-link deck-back" onClick={onLibrary}>
        <ArrowLeft size={17} /> All cards
      </button>
      <div className="deck-heading">
        <h1>Dark Gold · E series</h1>
        <p lang="zh">暗金典藏版 · 2026 · 139 generals</p>
      </div>
      <div className="deck-actions">
        <button
          className="button primary"
          onClick={onPin}
          aria-pressed={pinned}
          aria-label={pinned ? "Unpin Dark Gold as my deck" : "Use this deck"}
        >
          {pinned ? <Check size={18} /> : <BookOpen size={18} />}{" "}
          {pinned ? "My deck · pinned" : "Use this deck"}
        </button>
        <button className="button secondary" onClick={onScan}>
          <ScanLine size={18} /> Scan a card
        </button>
      </div>
      <details className="deck-info">
        <summary>Deck details · {available}/139 references</summary>
        <p>Box contents: 139 generals, 162 game cards and 23 accessories.</p>
        <p>
          Compare the Chinese skills before marking a version.{" "}
          {Object.keys(choices).length} versions checked on this device.
        </p>
      </details>
      <div className="search-field">
        <Search size={19} />
        <input
          aria-label="Search this deck"
          placeholder="Name in English or Chinese, or a skill"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="deck-filters">
        <label>
          Card group
          <select
            aria-label="Deck card group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="all">All 8 groups</option>
            {deck.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name_en} · {g.count}
              </option>
            ))}
          </select>
        </label>
        <label className="deck-missing">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
          />{" "}
          Needs a translation
        </label>
      </div>
      <p className="result-count" role="status">
        {groups.reduce((n, g) => n + g.entries.length, 0)} generals in this view
      </p>
      {groups.map((group) => (
        <section className="deck-group" key={group.id}>
          <div className="section-title">
            <h2>
              {group.name_en}
              <small lang="zh">{group.name_cn}</small>
            </h2>
            <span>{group.entries.length}</span>
          </div>
          {group.entries.map((entry) => {
            const candidates = candidatesByEntry[entry.id],
              selected = candidates.find((c) => c.id === choices[entry.id]),
              first = selected || candidates[0];
            return (
              <details className="deck-entry" key={entry.id}>
                <summary>
                  <span className="deck-entry-art" aria-hidden="true">
                    {first?.image ? (
                      <img src={first.image} alt="" loading="lazy" />
                    ) : (
                      <Layers size={20} />
                    )}
                  </span>
                  <span className="deck-entry-name">
                    <strong>{first?.name_en || entry.search_name_cn}</strong>
                    <span lang="zh">{entry.name_cn}</span>
                    <small>
                      {selected
                        ? "Version checked"
                        : candidates.length
                          ? `${candidates.length} ${candidates.length === 1 ? "reference" : "references"} · compare skills`
                          : "Translation needed"}
                    </small>
                  </span>
                  {selected ? <Check size={18} /> : <ChevronRight size={18} />}
                </summary>
                <div className="deck-entry-content">
                  {candidates.length ? (
                    <>
                      <p className="deck-help">
                        These are rules references. A matching name or
                        illustration does not confirm the printed revision.
                      </p>
                      {candidates.map((c) => (
                        <div className="deck-reference" key={c.id}>
                          <div>
                            <strong>
                              {c.name_cn} · {c.expansion}
                            </strong>
                            <small>
                              {c.skills.map((s) => s.name_cn).join(" · ")}
                            </small>
                            <p lang="zh">{c.skills[0]?.description_cn}</p>
                          </div>
                          <div className="deck-reference-actions">
                            <button
                              className="button secondary"
                              onClick={() => onOpen(c)}
                            >
                              Read English <ArrowRight size={16} />
                            </button>
                            <button
                              className="text-link"
                              aria-pressed={choices[entry.id] === c.id}
                              onClick={() => remember(entry.id, c.id)}
                            >
                              {choices[entry.id] === c.id ? (
                                <Check size={16} />
                              ) : null}
                              {choices[entry.id] === c.id
                                ? "Matches my card"
                                : "Mark as my version"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p>
                      This specific rules variant still needs a translation. It
                      is kept in your checklist rather than replaced with
                      another version.{" "}
                      <a
                        href={deck.source.url + "?t=42"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        See the publisher’s card list ↗
                      </a>
                    </p>
                  )}
                </div>
              </details>
            );
          })}
        </section>
      ))}
      {!groups.length && (
        <div className="empty-state">
          <Search size={28} />
          <h2>No generals match.</h2>
          <p>Try another name or group.</p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setGroupId("all");
              setOnlyMissing(false);
            }}
          >
            Clear deck filters
          </button>
        </div>
      )}
      <details className="deck-source">
        <summary>About this box &amp; checklist</summary>
        <p>
          The publisher’s checklist contains 139 general entries across these
          eight groups. The 162 game cards include repeated copies; their
          individual quantities are not specified by this general checklist.
        </p>
        <p>
          New references use attributed community Chinese skill text with
          English translations. Compare your printed wording before marking a
          version. The edition’s full artwork set has not been added to the
          scanner.
        </p>
        <div className="source-links">
          <a href={deck.source.url} target="_blank" rel="noreferrer">
            Publisher’s unboxing ↗
          </a>
          <a href={deck.source.roster_url} target="_blank" rel="noreferrer">
            Published general checklist ↗
          </a>
        </div>
      </details>
    </section>
  );
}
