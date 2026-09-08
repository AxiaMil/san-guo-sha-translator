import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScanLine,
  BookOpen,
  Bookmark,
  Search,
  ArrowRight,
  ArrowLeft,
  X,
  Heart,
  Shield,
  ChevronDown,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import Scanner from "./Scanner";
import { searchCards, normalize } from "./matching";
import type { Card, Rule } from "./types";
function stored(key: string): string[] {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function persist(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Browsing still works when storage is unavailable. */
  }
}
function RuleBlocks({ blocks }: { blocks: unknown[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (typeof b === "string") return <p key={i}>{b}</p>;
        if (!b || typeof b !== "object") return null;
        const obj = b as Record<string, unknown>;
        return (
          <div className="rule-block" key={i}>
            {typeof obj.en === "string" && <p>{obj.en}</p>}
            {typeof obj.title_en === "string" && (
              <strong>{obj.title_en}</strong>
            )}
            {Object.entries(obj)
              .filter(
                ([key, value]) => Array.isArray(value) && !key.endsWith("_cn"),
              )
              .map(([key, value]) => (
                <RuleBlocks key={key} blocks={value as unknown[]} />
              ))}
          </div>
        );
      })}
    </>
  );
}
export default function App() {
  const [cards, setCards] = useState<Card[]>([]),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(false),
    [tab, setTab] = useState<"scan" | "library" | "saved">("scan"),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState("All cards"),
    [faction, setFaction] = useState("All factions"),
    [limit, setLimit] = useState(36),
    [selected, setSelected] = useState<Card | null>(null),
    [saved, setSaved] = useState(() => stored("sha-saved")),
    [recent, setRecent] = useState(() => stored("sha-recent")),
    [showChinese, setShowChinese] = useState(false),
    [rules, setRules] = useState<Rule[]>([]),
    [rulesOpen, setRulesOpen] = useState(false),
    [ruleQuery, setRuleQuery] = useState(""),
    [ruleError, setRuleError] = useState(false),
    [offline, setOffline] = useState(!navigator.onLine);
  const dialog = useRef<HTMLDialogElement>(null),
    ruleDialog = useRef<HTMLDialogElement>(null);
  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/catalog.json");
      if (!response.ok) throw Error();
      setCards(await response.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
    };
  }, []);
  useEffect(() => {
    const changed = () => {
      const id = new URLSearchParams(location.hash.slice(1)).get("card");
      setSelected(cards.find((c) => c.id === id) || null);
    };
    changed();
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, [cards]);
  useEffect(() => {
    if (selected) {
      dialog.current?.showModal();
      setShowChinese(false);
    } else dialog.current?.close();
  }, [selected]);
  useEffect(() => {
    if (rulesOpen) ruleDialog.current?.showModal();
    else ruleDialog.current?.close();
  }, [rulesOpen]);
  useEffect(() => {
    setLimit(36);
  }, [query, kind, faction, tab]);
  function openCard(card: Card) {
    setSelected(card);
    location.hash = new URLSearchParams({ card: card.id }).toString();
    const next = [card.id, ...recent.filter((id) => id !== card.id)].slice(
      0,
      8,
    );
    setRecent(next);
    persist("sha-recent", next);
  }
  function closeCard() {
    setSelected(null);
    history.replaceState(null, "", location.pathname + location.search);
  }
  function toggleSaved(id: string) {
    const next = saved.includes(id)
      ? saved.filter((x) => x !== id)
      : [id, ...saved];
    setSaved(next);
    persist("sha-saved", next);
  }
  function navigate(next: typeof tab) {
    setTab(next);
    setQuery("");
    setKind("All cards");
    setFaction("All factions");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function openRules() {
    setRulesOpen(true);
    if (rules.length) return;
    setRuleError(false);
    try {
      const res = await fetch("/rules.json");
      if (!res.ok) throw Error();
      setRules(await res.json());
    } catch {
      setRuleError(true);
    }
  }
  const filtered = useMemo(
    () =>
      searchCards(
        cards.filter(
          (c) =>
            (tab !== "saved" || saved.includes(c.id)) &&
            (kind === "All cards" ||
              c.kind === (kind === "Generals" ? "general" : "card")) &&
            (faction === "All factions" || c.faction === faction),
        ),
        query,
      ),
    [cards, tab, saved, kind, faction, query],
  );
  const recentCards = recent
    .map((id) => cards.find((c) => c.id === id))
    .filter((c): c is Card => !!c);
  const ruleMatches = rules.filter((r) =>
    normalize(
      [r.term_en, r.term_cn, r.definition_en, r.definition_cn].join(" "),
    ).includes(normalize(ruleQuery)),
  );
  return (
    <>
      <header className="app-header">
        <button
          className="brand"
          onClick={() => navigate("scan")}
          aria-label="SHA home"
        >
          <span className="brand-seal">殺</span>
          <span>
            SHA<small>SAN GUO SHA COMPANION</small>
          </span>
        </button>
        <button className="rules-button" onClick={() => void openRules()}>
          <BookOpen size={17} />
          <span>How to play</span>
          <ArrowRight size={15} />
        </button>
      </header>
      <main className="app-layout">
        <aside className="desktop-nav">
          <div className="nav-caption">AT THE TABLE</div>
          {(["scan", "library", "saved"] as const).map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => navigate(item)}
            >
              {item === "scan" ? (
                <ScanLine size={20} />
              ) : item === "library" ? (
                <BookOpen size={20} />
              ) : (
                <Bookmark size={20} />
              )}
              <span>
                {item === "scan"
                  ? "Scan a card"
                  : item === "library"
                    ? "Card library"
                    : "Saved cards"}
              </span>
              {item === "saved" && saved.length > 0 && (
                <small>{saved.length}</small>
              )}
            </button>
          ))}
          <div className="sidebar-note">
            <span>知己知彼</span>
            <p>
              Know your cards.
              <br />
              Know your next move.
            </p>
            <small>A fan-made companion.</small>
          </div>
        </aside>
        <div className="main-content">
          {offline && (
            <div className="notice">
              <WifiOff size={17} /> You’re offline. Loaded cards are available;
              photo matching needs a connection.
            </div>
          )}
          {loading ? (
            <div className="loading-state">
              <span className="brand-seal">殺</span>
              <p>Opening the card library…</p>
            </div>
          ) : loadError ? (
            <div className="empty-state">
              <h1>Couldn’t load the cards</h1>
              <p>Check your connection and try again.</p>
              <button className="button primary" onClick={() => void load()}>
                <RefreshCw size={18} /> Try again
              </button>
            </div>
          ) : tab === "scan" ? (
            <>
              <Scanner
                cards={cards}
                onOpen={openCard}
                onBrowse={() => navigate("library")}
              />
              <section className="quick-library">
                <div className="section-title">
                  <h2>
                    {recentCards.length
                      ? "Recently viewed"
                      : "Meet the classics"}
                  </h2>
                  <button
                    className="text-link"
                    onClick={() => navigate("library")}
                  >
                    View library <ArrowRight size={15} />
                  </button>
                </div>
                <div className="recent-list">
                  {(recentCards.length
                    ? recentCards
                    : cards.filter((c) =>
                        ["SHU001", "SHU002", "WEI001"].includes(c.id),
                      )
                  )
                    .slice(0, 3)
                    .map((c) => (
                      <button
                        key={c.id}
                        className="recent-card"
                        onClick={() => openCard(c)}
                      >
                        <img src={c.image || ""} alt="" />
                        <span>
                          <strong>{c.name_en}</strong>
                          <small>
                            {c.name_cn} · {c.faction}
                          </small>
                        </span>
                        <ArrowRight size={16} />
                      </button>
                    ))}
                </div>
              </section>
            </>
          ) : (
            <section className="library">
              <div className="section-kicker">
                {tab === "saved"
                  ? "YOUR PERSONAL DECK"
                  : "THE COMPLETE COLLECTION"}
                <span className="edition">藏</span>
              </div>
              <h1>
                {tab === "saved"
                  ? "Keep your favorites close."
                  : "Find your next move."}
              </h1>
              <p className="library-intro">
                {tab === "saved"
                  ? "Your saved cards, ready for the next game."
                  : `${cards.length} cards. Every faction. English translations at a glance.`}
              </p>
              <div className="search-field">
                <Search size={20} />
                <input
                  aria-label="Search cards"
                  placeholder="Name, Chinese text, skill, or card ID"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <div className="library-filters">
                <div className="segmented">
                  {["All cards", "Generals", "Playing cards"].map((k) => (
                    <button
                      key={k}
                      aria-pressed={kind === k}
                      className={kind === k ? "selected" : ""}
                      onClick={() => setKind(k)}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <label className="faction-select">
                  <select
                    aria-label="Filter by faction"
                    value={faction}
                    onChange={(e) => setFaction(e.target.value)}
                  >
                    {[
                      "All factions",
                      ...new Set(
                        cards
                          .map((c) => c.faction)
                          .filter((f): f is string => !!f),
                      ),
                    ].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </label>
              </div>
              <div className="result-count">
                {filtered.length} {filtered.length === 1 ? "card" : "cards"}
                {query && ` matching “${query}”`}
              </div>
              {filtered.length ? (
                <>
                  <div className="card-grid">
                    {filtered.slice(0, limit).map((c) => (
                      <article key={c.id} className="catalog-card">
                        <button
                          className="card-open"
                          onClick={() => openCard(c)}
                        >
                          <div className="card-art">
                            <img
                              src={c.image || ""}
                              alt={`${c.name_en} card`}
                              loading="lazy"
                            />
                          </div>
                          <small>
                            {c.faction || c.category_en}{" "}
                            <span>· {c.expansion || "Playing card"}</span>
                          </small>
                          <h2>{c.name_en}</h2>
                          <p>{c.name_cn}</p>
                        </button>
                        <button
                          className={`save-small ${saved.includes(c.id) ? "is-saved" : ""}`}
                          aria-label={`${saved.includes(c.id) ? "Unsave" : "Save"} ${c.name_en}`}
                          onClick={() => toggleSaved(c.id)}
                        >
                          <Bookmark
                            size={17}
                            fill={
                              saved.includes(c.id) ? "currentColor" : "none"
                            }
                          />
                        </button>
                      </article>
                    ))}
                  </div>
                  {limit < filtered.length && (
                    <button
                      className="button secondary load-more"
                      onClick={() => setLimit((l) => l + 36)}
                    >
                      Show more cards <ChevronDown size={17} />
                    </button>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <Bookmark size={32} />
                  <h2>
                    {tab === "saved" && !saved.length
                      ? "Your deck starts here"
                      : "No cards found"}
                  </h2>
                  <p>
                    {tab === "saved" && !saved.length
                      ? "Tap the bookmark on any card to keep it here."
                      : "Try a shorter name or choose a different filter."}
                  </p>
                  <button
                    className="text-link"
                    onClick={() => {
                      if (tab === "saved") navigate("library");
                      else {
                        setQuery("");
                        setKind("All cards");
                        setFaction("All factions");
                      }
                    }}
                  >
                    {tab === "saved" ? "Explore the library" : "Clear filters"}{" "}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </section>
          )}
          <footer>
            <span className="footer-seal">殺</span>
            <p>Read before you slash.</p>
            <small>
              Fan-made. Not affiliated with the creators of San Guo Sha.
            </small>
            <a
              href="https://github.com/AxiaMil/san-guo-sha-translator"
              target="_blank"
              rel="noreferrer"
            >
              Open source ↗
            </a>
          </footer>
        </div>
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {(["scan", "library", "saved"] as const).map((item) => (
          <button
            key={item}
            aria-current={tab === item ? "page" : undefined}
            className={tab === item ? "active" : ""}
            onClick={() => navigate(item)}
          >
            {item === "scan" ? (
              <ScanLine size={22} />
            ) : item === "library" ? (
              <BookOpen size={22} />
            ) : (
              <Bookmark size={22} />
            )}
            <span>
              {item === "scan"
                ? "Scan"
                : item === "library"
                  ? "Library"
                  : "Saved"}
            </span>
          </button>
        ))}
      </nav>
      <dialog
        ref={dialog}
        className="detail-dialog"
        onCancel={closeCard}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeCard();
        }}
      >
        {selected && (
          <div className="detail-inner">
            <div className="detail-toolbar">
              <button
                className="icon-btn"
                onClick={closeCard}
                aria-label="Close card details"
              >
                <ArrowLeft size={21} />
              </button>
              <span>CARD DETAILS</span>
              <button
                className={`icon-btn ${saved.includes(selected.id) ? "is-saved" : ""}`}
                aria-label={
                  saved.includes(selected.id) ? "Unsave card" : "Save card"
                }
                onClick={() => toggleSaved(selected.id)}
              >
                <Bookmark
                  size={21}
                  fill={saved.includes(selected.id) ? "currentColor" : "none"}
                />
              </button>
            </div>
            <div className="detail-hero">
              <img
                src={selected.image || ""}
                alt={`${selected.name_en} card artwork`}
              />
              <div>
                <div className="card-label">
                  {selected.faction || selected.category_en} ·{" "}
                  {selected.expansion || "Playing card"}
                </div>
                <h1>{selected.name_en}</h1>
                <p className="chinese-name">{selected.name_cn}</p>
                {selected.health && (
                  <span className="health">
                    <Heart size={16} fill="currentColor" /> {selected.health} HP
                  </span>
                )}
                <small className="printed-id">{selected.printed_id}</small>
              </div>
            </div>
            <div className="translation-heading">
              <h2>
                {selected.skills.length ? "Skills & abilities" : "Card effect"}
              </h2>
              <button
                aria-pressed={showChinese}
                onClick={() => setShowChinese(!showChinese)}
              >
                {showChinese ? "Hide Chinese" : "Show Chinese"}
              </button>
            </div>
            {selected.skills.map((s, i) => (
              <section className="skill" key={i}>
                <div className="skill-title">
                  <h3>{s.name_en}</h3>
                  <span>{s.name_cn}</span>
                </div>
                {s.skill_type && (
                  <small className="skill-type">{s.skill_type}</small>
                )}
                <p>{s.description_en}</p>
                {showChinese && (
                  <p className="chinese-text">{s.description_cn}</p>
                )}
              </section>
            ))}
            {selected.effect_en?.map((text, i) => (
              <section className="skill" key={i}>
                <p>{text}</p>
                {showChinese && (
                  <p className="chinese-text">{selected.effect_cn?.[i]}</p>
                )}
              </section>
            ))}
            {!selected.skills.length && !selected.effect_en?.length && (
              <p className="notice">
                No skill translation is available for this card in the source
                library.
              </p>
            )}
            {selected.faq?.length > 0 && (
              <section className="faq">
                <h2>At the table</h2>
                {selected.faq.map((f, i) => (
                  <details key={i}>
                    <summary>{f.q_en}</summary>
                    <p>{f.a_en}</p>
                    {showChinese && (
                      <p className="chinese-text">
                        {f.q_cn}
                        <br />
                        {f.a_cn}
                      </p>
                    )}
                  </details>
                ))}
              </section>
            )}
            <div className="detail-foot">
              <Shield size={15} /> Translations from the community card library.
            </div>
          </div>
        )}
      </dialog>
      <dialog
        ref={ruleDialog}
        className="rules-dialog"
        onCancel={() => setRulesOpen(false)}
      >
        <div className="detail-toolbar">
          <span>THE RULEBOOK</span>
          <button
            className="icon-btn"
            aria-label="Close rulebook"
            onClick={() => setRulesOpen(false)}
          >
            <X size={21} />
          </button>
        </div>
        <h1>Know the rules.</h1>
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Search rules"
            placeholder="Search a rule or game term"
            value={ruleQuery}
            onChange={(e) => setRuleQuery(e.target.value)}
          />
        </div>
        {ruleError ? (
          <p className="notice">
            Couldn’t load the rulebook.{" "}
            <button onClick={() => void openRules()}>Try again</button>
          </p>
        ) : !rules.length ? (
          <p>Loading the rulebook…</p>
        ) : (
          <>
            <p className="result-count">{ruleMatches.length} entries</p>
            {ruleMatches.slice(0, 60).map((r) => (
              <details className="rule-entry" key={r.id}>
                <summary>
                  <span>{r.term_en}</span>
                  <small>{r.term_cn}</small>
                </summary>
                <p>{r.definition_en}</p>
                <RuleBlocks blocks={r.rules || []} />
              </details>
            ))}
            {ruleMatches.length > 60 && (
              <p className="result-count">
                Search to narrow the remaining entries.
              </p>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
