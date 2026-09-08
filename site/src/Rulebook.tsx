import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, RefreshCw, Search, X } from "lucide-react";
import type { Rule } from "./types";
import { ruleText, searchRules, terms } from "./reading";
const phases = [
  ["Preparation", "Resolve skills that trigger at the start of your turn."],
  ["Judgment", "Resolve cards in your Judgment Zone."],
  ["Draw", "Normally draw 2 cards. Skills may change this."],
  ["Play", "Use cards and activate skills. Normally, use Kill once."],
  ["Discard", "Discard excess hand cards down to your Hand Limit."],
  ["End", "Resolve skills and effects that trigger at the end of your turn."],
];
export default function Rulebook() {
  const [rules, setRules] = useState<Rule[]>([]),
    [error, setError] = useState(false),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [limit, setLimit] = useState(30),
    [bilingual, setBilingual] = useState(false);
  async function load() {
    setError(false);
    try {
      const r = await fetch("/rules.json");
      if (!r.ok) throw Error();
      setRules(await r.json());
    } catch {
      setError(true);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    setLimit(30);
  }, [query, category]);
  const matches = useMemo(
    () => searchRules(rules, query, category),
    [rules, query, category],
  );
  return (
    <section className="rulebook">
      <h1 className="sr-only">Rules</h1>
      <div className="section-title rule-search-title">
        <h2>Rules</h2>
        <label className="check-label">
          <input
            type="checkbox"
            checked={bilingual}
            onChange={(e) => setBilingual(e.target.checked)}
          />{" "}
          中文
        </label>
      </div>
      <div className="search-field">
        <Search size={20} />
        <input
          aria-label="Search rules"
          placeholder="Search a term, timing, or example"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button aria-label="Clear rules search" onClick={() => setQuery("")}>
            <X size={18} />
          </button>
        )}
      </div>
      <div className="filter-chips" role="group" aria-label="Rule categories">
        {[
          ["All", "Everything"],
          ["setup", "Setup"],
          ["flow", "Turn & events"],
          ["glossary", "Game terms"],
          ["rules", "Rules"],
        ].map(([id, title]) => (
          <button
            key={id}
            aria-pressed={category === id}
            onClick={() => setCategory(id)}
          >
            {title}
          </button>
        ))}
      </div>
      {!query && category === "All" && (
        <details className="rules-guide">
          <summary>Turn order & key terms</summary>
          <section className="turn-guide">
            <div className="section-title">
              <h2>Turn order</h2>
              <BookOpen size={19} />
            </div>
            <ol>
              {phases.map(([name, description], i) => (
                <li key={name}>
                  <span>{i + 1}</span>
                  <div>
                    <strong>{name}</strong>
                    <p>{description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="guide-note">
              A standard-turn guide. Skills, card effects, and game modes can
              change these rules.
            </p>
          </section>
          <div className="section-title">
            <h2>Key terms</h2>
          </div>
          <div className="terms-grid">
            {terms.slice(0, 3).map((t) => (
              <details key={t.name}>
                <summary>
                  {t.name}
                  <span lang="zh">{t.cn}</span>
                </summary>
                <p>{t.text}</p>
              </details>
            ))}
          </div>
        </details>
      )}
      {error ? (
        <div className="empty-state">
          <h2>Couldn’t open the rulebook</h2>
          <button className="button secondary" onClick={() => void load()}>
            <RefreshCw size={18} /> Try again
          </button>
        </div>
      ) : !rules.length ? (
        <p role="status">Loading rules…</p>
      ) : (
        <>
          <p className="result-count" role="status">
            {matches.length} entries
          </p>
          {matches.slice(0, limit).map((r) => (
            <details className="rule-entry" key={r.id}>
              <summary>
                <span>{r.term_en}</span>
                <small lang="zh">{r.term_cn}</small>
              </summary>
              <div className="rule-content">
                <span className="card-label">{r.section_title_en}</span>
                <p>{r.definition_en}</p>
                {bilingual && (
                  <p className="chinese-text" lang="zh">
                    {r.definition_cn}
                  </p>
                )}
                {(r.rules || []).map((b, i) => (
                  <div className="rule-block" key={i}>
                    {ruleText(b, "en").map((t, j) => (
                      <p key={j}>{t}</p>
                    ))}
                    {bilingual && (
                      <div className="chinese-text" lang="zh">
                        {ruleText(b, "cn").map((t, j) => (
                          <p key={j}>{t}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          ))}
          {!matches.length && (
            <div className="empty-state">
              <Search size={28} />
              <h2>No matching rules</h2>
              <p>Try a shorter phrase or a different category.</p>
              <button
                className="text-link"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                }}
              >
                Clear filters <ArrowRight size={16} />
              </button>
            </div>
          )}
          {limit < matches.length && (
            <button
              className="button secondary load-more"
              onClick={() => setLimit((l) => l + 30)}
            >
              Show more entries <ArrowRight size={17} />
            </button>
          )}
        </>
      )}
      <p className="guide-note">
        Community reference. Check the printed card and the rules for your
        game’s edition when they differ.
      </p>
    </section>
  );
}
