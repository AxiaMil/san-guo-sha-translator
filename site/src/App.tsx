import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScanLine,
  BookOpen,
  Bookmark,
  Search,
  ArrowRight,
  X,
  WifiOff,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Check,
  Library,
  SlidersHorizontal,
} from "lucide-react";
import Scanner from "./Scanner";
import DeckView from "./DeckView";
import CardArt from "./CardArt";
import BrandMark from "./BrandMark";
import { decks, findDeck, type Deck } from "./decks";
import { useOfflineUpdate } from "./offline";
import CardReader from "./CardReader";
import Rulebook from "./Rulebook";
import VersionSources from "./VersionSources";
import { searchCards } from "./matching";
import { preference, savePreference } from "./reading";
import type { Card } from "./types";
type Tab = "scan" | "library" | "saved" | "rules";
const navigation = [
  { id: "scan", name: "Scan", icon: ScanLine },
  { id: "library", name: "Library", icon: Library },
  { id: "saved", name: "Saved", icon: Bookmark },
  { id: "rules", name: "Rules", icon: BookOpen },
] as const;
function stored(key: string): string[] {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
export default function App() {
  const themePicker = useRef<HTMLDetailsElement>(null);
  const installUpdate = useOfflineUpdate();
  const [cards, setCards] = useState<Card[]>([]),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(false),
    [tab, setTab] = useState<Tab>("scan"),
    [deckOpen, setDeckOpen] = useState<Deck | undefined>(),
    [pinnedDeckId, setPinnedDeckId] = useState(() =>
      preference("sha-my-deck", [...decks.map((d) => d.id), ""], ""),
    ),
    [scanDeckId, setScanDeckId] = useState(() =>
      preference(
        "sha-scan-deck",
        [...decks.map((d) => d.id), ""],
        preference("sha-my-deck", [...decks.map((d) => d.id), ""], ""),
      ),
    ),
    [query, setQuery] = useState(""),
    [quickQuery, setQuickQuery] = useState(""),
    [kind, setKind] = useState("All cards"),
    [faction, setFaction] = useState("All factions"),
    [expansion, setExpansion] = useState("All editions"),
    [sort, setSort] = useState("Recommended"),
    [filtersOpen, setFiltersOpen] = useState(false),
    [limit, setLimit] = useState(36),
    [selected, setSelected] = useState<Card | null>(null),
    [saved, setSaved] = useState(() => stored("sha-saved")),
    [recent, setRecent] = useState(() => stored("sha-recent")),
    [offline, setOffline] = useState(!navigator.onLine),
    [toast, setToast] = useState<{ text: string; previous: string[] } | null>(
      null,
    ),
    [theme, setTheme] = useState(() =>
      preference("sha-theme", ["Light", "Dark", "System"], "System"),
    );
  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const r = await fetch("/catalog.json");
      if (!r.ok) throw Error();
      setCards(await r.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const changed = () => setOffline(!navigator.onLine);
    window.addEventListener("online", changed);
    window.addEventListener("offline", changed);
    return () => {
      window.removeEventListener("online", changed);
      window.removeEventListener("offline", changed);
    };
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "System"
          ? media.matches
            ? "dark"
            : "light"
          : theme.toLowerCase();
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          "content",
          document.documentElement.dataset.theme === "dark"
            ? "#141416"
            : "#fafafa",
        );
    };
    apply();
    savePreference("sha-theme", theme);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    const changed = () => {
      const p = new URLSearchParams(location.hash.slice(1));
      setSelected(cards.find((c) => c.id === p.get("card")) || null);
      const next = p.get("tab");
      setDeckOpen(next === "library" ? findDeck(p.get("deck")) : undefined);
      setTab(navigation.some((n) => n.id === next) ? (next as Tab) : "scan");
    };
    changed();
    window.addEventListener("popstate", changed);
    window.addEventListener("hashchange", changed);
    return () => {
      window.removeEventListener("popstate", changed);
      window.removeEventListener("hashchange", changed);
    };
  }, [cards]);
  useEffect(() => {
    setLimit(36);
  }, [query, kind, faction, expansion, sort, tab]);
  useEffect(() => {
    const dismiss = (event: Event) => {
      if (
        event.target instanceof Node &&
        !themePicker.current?.contains(event.target)
      ) {
        themePicker.current?.removeAttribute("open");
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  function openCard(card: Card) {
    if (selected?.id === card.id) return;
    history.pushState(
      { shaCard: true },
      "",
      `#${new URLSearchParams({ tab, ...(deckOpen ? { deck: deckOpen.id } : {}), card: card.id })}`,
    );
    setSelected(card);
    const next = [card.id, ...recent.filter((id) => id !== card.id)].slice(
      0,
      8,
    );
    setRecent(next);
    savePreference("sha-recent", JSON.stringify(next));
  }
  function closeCard() {
    if (history.state?.shaCard) history.back();
    else {
      history.replaceState(
        null,
        "",
        `#${new URLSearchParams({ tab, ...(deckOpen ? { deck: deckOpen.id } : {}) })}`,
      );
      setSelected(null);
    }
  }
  function toggleSaved(id: string) {
    const next = saved.includes(id)
      ? saved.filter((x) => x !== id)
      : [id, ...saved];
    setToast({
      text: next.includes(id)
        ? "Card saved to your collection"
        : "Card removed from saved",
      previous: saved,
    });
    setSaved(next);
    savePreference("sha-saved", JSON.stringify(next));
  }
  function navigate(next: Tab) {
    if (next !== tab || deckOpen) history.pushState(null, "", `#tab=${next}`);
    setDeckOpen(undefined);
    setTab(next);
    setSelected(null);
    window.scrollTo({
      top: 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  const pinnedDeck = findDeck(pinnedDeckId);
  function openDeck(deck: Deck) {
    history.pushState(null, "", `#tab=library&deck=${deck.id}`);
    setTab("library");
    setDeckOpen(deck);
    setSelected(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function pinDeck(deck: Deck) {
    const id = pinnedDeckId === deck.id ? "" : deck.id;
    setPinnedDeckId(id);
    savePreference("sha-my-deck", id);
  }
  function selectScanDeck(id: string) {
    setScanDeckId(id);
    savePreference("sha-scan-deck", id);
  }
  function clearFilters() {
    setQuery("");
    setKind("All cards");
    setFaction("All factions");
    setExpansion("All editions");
  }
  const filtered = useMemo(() => {
    const result = searchCards(
      cards.filter(
        (c) =>
          (tab !== "saved" || saved.includes(c.id)) &&
          (kind === "All cards" ||
            c.kind === (kind === "Generals" ? "general" : "card")) &&
          (faction === "All factions" || c.faction === faction) &&
          (expansion === "All editions" ||
            (c.expansion || "Playing cards") === expansion),
      ),
      query,
    );
    if (sort === "Name A–Z")
      result.sort((a, b) => a.name_en.localeCompare(b.name_en));
    if (sort === "Card ID")
      result.sort((a, b) => a.printed_id.localeCompare(b.printed_id));
    if (!query && sort === "Recommended")
      result.sort(
        (a, b) =>
          Number(b.expansion === "Standard") -
          Number(a.expansion === "Standard"),
      );
    return result;
  }, [cards, tab, saved, kind, faction, expansion, sort, query]);
  const recentCards = recent
    .map((id) => cards.find((c) => c.id === id))
    .filter((c): c is Card => !!c);
  const hasFilters =
    !!query ||
    kind !== "All cards" ||
    faction !== "All factions" ||
    expansion !== "All editions";
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
          document.getElementById("main")?.scrollIntoView();
        }}
      >
        Skip to content
      </a>
      <header className="app-header">
        <button
          className="brand"
          onClick={() => navigate("scan")}
          aria-label="SHA home"
        >
          <BrandMark />
          <span className="brand-wordmark">SHA</span>
        </button>
        <details
          ref={themePicker}
          className="theme-picker"
          onKeyDown={(e) => {
            if (e.key === "Escape") e.currentTarget.open = false;
          }}
        >
          <summary aria-label="Appearance">
            <Sun size={19} className="light-icon" />
            <Moon size={19} className="dark-icon" />
            <span>Appearance</span>
          </summary>
          <div className="theme-menu">
            {(
              [
                { value: "Light", icon: Sun },
                { value: "Dark", icon: Moon },
                { value: "System", icon: Monitor },
              ] as const
            ).map(({ value, icon: Icon }) => (
              <button
                key={value}
                aria-pressed={theme === value}
                onClick={(e) => {
                  setTheme(value);
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                <Icon size={18} />
                {value}
                {theme === value && <Check size={16} />}
              </button>
            ))}
          </div>
        </details>
      </header>
      <main className="app-layout" id="main" tabIndex={-1}>
        <aside className="desktop-nav">
          {navigation.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              aria-current={tab === id ? "page" : undefined}
              className={tab === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>
                {name === "Scan"
                  ? "Scan a card"
                  : name === "Library"
                    ? "Card library"
                    : name === "Saved"
                      ? "Saved cards"
                      : "How to play"}
              </span>
              {id === "saved" && !!saved.length && (
                <small>{saved.length}</small>
              )}
            </button>
          ))}
        </aside>
        <div className="main-content">
          {installUpdate && (
            <div className="update-notice" role="status">
              <span>Update available.</span>
              <button onClick={installUpdate}>
                Update & reload <RefreshCw size={15} />
              </button>
            </div>
          )}
          {offline && (
            <div className="notice">
              <WifiOff size={18} />
              <span>
                You’re offline. Cached cards and rules are available. Photo
                matching needs a connection.
              </span>
            </div>
          )}
          {loading ? (
            <div className="loading-state" role="status">
              <BrandMark />
              <p>Loading cards…</p>
            </div>
          ) : loadError ? (
            <div className="empty-state">
              <h1>Couldn’t load the cards</h1>
              <p>Check your connection and try again.</p>
              <button className="button primary" onClick={() => void load()}>
                <RefreshCw size={18} /> Try again
              </button>
            </div>
          ) : (
            <>
              <div hidden={tab !== "scan"}>
                {tab === "scan" && (
                  <>
                    <label className="scan-deck-picker">
                      <span>Deck</span>
                      <select
                        aria-label="Scanner deck"
                        value={scanDeckId}
                        onChange={(e) => selectScanDeck(e.target.value)}
                      >
                        <option value="">All decks</option>
                        {decks.map((deck) => (
                          <option key={deck.id} value={deck.id}>
                            {deck.name_en} · {deck.name_cn}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Scanner
                      cards={cards}
                      deck={findDeck(scanDeckId)}
                      onOpen={openCard}
                      onBrowse={() => {
                        clearFilters();
                        navigate("library");
                      }}
                    />
                    {pinnedDeck && (
                      <button
                        className="my-deck-shortcut"
                        onClick={() => openDeck(pinnedDeck)}
                      >
                        <BookOpen size={18} />
                        <span>
                          My deck{" "}
                          <strong>{pinnedDeck.name_cn} · E series</strong>
                        </span>
                        <ArrowRight size={18} />
                      </button>
                    )}
                    <form
                      className="quick-search"
                      onSubmit={(e) => {
                        e.preventDefault();
                        clearFilters();
                        setQuery(quickQuery);
                        navigate("library");
                      }}
                    >
                      <label htmlFor="quick-search">Search cards</label>
                      <div className="search-field">
                        <Search size={19} />
                        <input
                          id="quick-search"
                          type="search"
                          enterKeyHint="search"
                          autoCapitalize="none"
                          autoCorrect="off"
                          placeholder="Name, Chinese text, skill, or card ID"
                          value={quickQuery}
                          onChange={(e) => setQuickQuery(e.target.value)}
                        />
                        <button aria-label="Find a card" type="submit">
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </form>
                    {recentCards.length > 0 && (
                      <section className="quick-library">
                        <div className="section-title">
                          <h2>Recent</h2>
                          <button
                            className="text-link"
                            onClick={() => navigate("library")}
                          >
                            View all <ArrowRight size={16} />
                          </button>
                        </div>
                        <div className="recent-list">
                          {recentCards.slice(0, 3).map((c) => (
                            <button
                              key={c.id}
                              className="recent-card"
                              onClick={() => openCard(c)}
                            >
                              <CardArt card={c} />
                              <span>
                                <strong>{c.name_en}</strong>
                                <small>
                                  {c.name_cn} · {c.faction || c.category_en}
                                </small>
                              </span>
                              <ArrowRight size={17} />
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
              {tab === "rules" && <Rulebook />}
              {tab === "library" && deckOpen && (
                <DeckView
                  key={deckOpen.id}
                  deck={deckOpen}
                  cards={cards}
                  onOpen={openCard}
                  onLibrary={() => navigate("library")}
                  onScan={() => {
                    selectScanDeck(deckOpen.id);
                    navigate("scan");
                  }}
                  pinned={pinnedDeckId === deckOpen.id}
                  onPin={() => pinDeck(deckOpen)}
                />
              )}
              {((tab === "library" && !deckOpen) || tab === "saved") && (
                <section className="library">
                  <h1 className="sr-only">
                    {tab === "saved" ? "Saved cards" : "Card library"}
                  </h1>
                  <div className="search-field">
                    <Search size={20} />
                    <input
                      aria-label="Search cards"
                      type="search"
                      enterKeyHint="search"
                      autoCapitalize="none"
                      autoCorrect="off"
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
                  {tab === "library" && (
                    <div className="deck-library-list">
                      {decks.map((deck) => (
                        <button
                          key={deck.id}
                          className="deck-library-link"
                          onClick={() => openDeck(deck)}
                        >
                          <BookOpen size={19} />
                          <span>
                            <strong>{deck.name_en}</strong>
                            <small>
                              {deck.name_cn} · {deck.counts.generals} generals
                              {pinnedDeckId === deck.id ? " · My deck" : ""}
                            </small>
                          </span>
                          <ArrowRight size={18} />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="library-filters">
                    <div className="segmented">
                      {["All cards", "Generals", "Playing cards"].map((k) => (
                        <button
                          key={k}
                          aria-pressed={kind === k}
                          className={kind === k ? "selected" : ""}
                          onClick={() => {
                            setKind(k);
                            if (k === "Playing cards")
                              setFaction("All factions");
                          }}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                    <button
                      className="filter-toggle"
                      onClick={() => setFiltersOpen(!filtersOpen)}
                      aria-expanded={filtersOpen}
                    >
                      <SlidersHorizontal size={18} /> Filters
                      {(faction !== "All factions" ||
                        expansion !== "All editions") && <i />}
                    </button>
                  </div>
                  {filtersOpen && (
                    <div className="filter-panel">
                      <label>
                        Faction
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
                      </label>
                      <label>
                        Edition
                        <select
                          aria-label="Filter by edition"
                          value={expansion}
                          onChange={(e) => setExpansion(e.target.value)}
                        >
                          {[
                            "All editions",
                            ...new Set(
                              cards.map((c) => c.expansion || "Playing cards"),
                            ),
                          ].map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Order
                        <select
                          aria-label="Sort cards"
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                        >
                          {["Recommended", "Name A–Z", "Card ID"].map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                  {tab === "library" && <VersionSources />}
                  <div className="result-line">
                    <p className="result-count" role="status">
                      {filtered.length}{" "}
                      {filtered.length === 1 ? "card" : "cards"}
                      {query && ` matching “${query}”`}
                    </p>
                    {hasFilters && (
                      <button className="text-link" onClick={clearFilters}>
                        Reset <X size={14} />
                      </button>
                    )}
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
                                <CardArt card={c} />
                              </div>
                              <div className="catalog-caption">
                                <small>
                                  {c.faction || c.category_en} ·{" "}
                                  {c.expansion || "Playing card"}
                                </small>
                                <h2>{c.name_en}</h2>
                                <p>
                                  {c.name_cn}
                                  <span>{c.printed_id}</span>
                                </p>
                              </div>
                            </button>
                            <button
                              className={`save-small ${saved.includes(c.id) ? "is-saved" : ""}`}
                              aria-label={`${saved.includes(c.id) ? "Unsave" : "Save"} ${c.name_en}`}
                              aria-pressed={saved.includes(c.id)}
                              onClick={() => toggleSaved(c.id)}
                            >
                              <Bookmark
                                size={18}
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
                          Show more cards <ArrowRight size={18} />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="empty-state">
                      <Bookmark size={32} />
                      <h2>
                        {tab === "saved" && !saved.length
                          ? "No saved cards"
                          : "No cards found"}
                      </h2>
                      <p>
                        {tab === "saved" && !saved.length
                          ? "Tap the bookmark on a card to build your collection."
                          : "Try a shorter name or clear your filters."}
                      </p>
                      <button
                        className="button secondary"
                        onClick={() => {
                          clearFilters();
                          if (tab === "saved") navigate("library");
                        }}
                      >
                        {tab === "saved" ? "Browse cards" : "Clear filters"}
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
          <footer>
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
        {navigation.map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            className={tab === id ? "active" : ""}
            onClick={() => navigate(id)}
          >
            <span className="nav-icon">
              <Icon size={21} />
              {id === "saved" && saved.length > 0 && <i />}
            </span>
            <span>{name}</span>
          </button>
        ))}
      </nav>
      {toast && !selected && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast.text}</span>
          <button
            onClick={() => {
              setSaved(toast.previous);
              savePreference("sha-saved", JSON.stringify(toast.previous));
              setToast(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
      <CardReader
        card={selected}
        cards={cards}
        saved={!!selected && saved.includes(selected.id)}
        onSave={() => selected && toggleSaved(selected.id)}
        onClose={closeCard}
        onOpen={openCard}
      />
    </>
  );
}
