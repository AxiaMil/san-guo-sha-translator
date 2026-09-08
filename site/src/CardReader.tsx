import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Check,
  Copy,
  Heart,
  X,
} from "lucide-react";
import type { Card } from "./types";
import VersionCompare from "./VersionCompare";
import CardArt from "./CardArt";
import { preference, savePreference, terms, type ReadingMode } from "./reading";
import { normalize } from "./matching";

export default function CardReader({
  card,
  cards,
  saved,
  onSave,
  onClose,
  onOpen,
}: {
  card: Card | null;
  cards: Card[];
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
  onOpen: (card: Card) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<ReadingMode>(() =>
    preference("sha-reading", ["English", "Bilingual", "中文"], "English"),
  );
  const [size, setSize] = useState(() =>
    preference("sha-text-size", ["Standard", "Large"], "Standard"),
  );
  const [glossary, setGlossary] = useState(false),
    [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState(false);
  useEffect(() => {
    if (card) {
      dialog.current?.showModal();
      dialog.current?.scrollTo(0, 0);
      setGlossary(false);
      setCopied(false);
      setCopyError(false);
    } else dialog.current?.close();
  }, [card]);
  useEffect(() => {
    if (!card) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [card]);
  function richText(text: string) {
    return text.split(/(\[[^\]]+\]|【[^】]+】)/g).map((part, i) => {
      if (!/^[\[【]/.test(part)) return part;
      const target = cards.find(
        (c) =>
          c.kind === "card" &&
          [c.name_en, c.name_cn].some((n) => normalize(n) === normalize(part)),
      );
      return target && target.id !== card?.id ? (
        <button className="inline-card" key={i} onClick={() => onOpen(target)}>
          {part}
        </button>
      ) : (
        <strong key={i}>{part}</strong>
      );
    });
  }
  async function copyLink() {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }
  const variants = card
    ? cards.filter(
        (c) =>
          c.kind === card.kind &&
          (c.standard_id && card.standard_id
            ? c.standard_id === card.standard_id
            : c.name_cn === card.name_cn),
      )
    : [];
  return (
    <dialog
      ref={dialog}
      className={`detail-dialog reader-${size.toLowerCase()}`}
      aria-label={card ? `${card.name_en} details` : "Card details"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {card && (
        <div className="detail-inner">
          <div className="detail-toolbar">
            <button
              className="icon-btn"
              onClick={onClose}
              aria-label="Back from card details"
            >
              <ArrowLeft size={21} />
            </button>
            <span />
            <div className="toolbar-actions">
              <button
                className="icon-btn"
                onClick={() => void copyLink()}
                aria-label="Copy card link"
              >
                {copied ? <Check size={20} /> : <Copy size={19} />}
              </button>
              <button
                className={`icon-btn ${saved ? "is-saved" : ""}`}
                aria-label={saved ? "Unsave card" : "Save card"}
                aria-pressed={saved}
                onClick={onSave}
              >
                <Bookmark size={21} fill={saved ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
          {copyError && (
            <p className="notice" role="alert">
              Couldn’t copy the link. You can copy this card’s address from your
              browser.
            </p>
          )}
          {copied && (
            <p role="status" className="copy-status">
              Card link copied
            </p>
          )}
          <div className="detail-hero">
            <CardArt card={card} />
            <div>
              <div className="card-label">
                {card.faction || card.category_en} ·{" "}
                {card.expansion || "Playing card"}
              </div>
              <h1>{card.name_en}</h1>
              <p className="chinese-name" lang="zh">
                {card.name_cn}
              </p>
              <div className="card-facts">
                {!!card.health && (
                  <span className="health">
                    <Heart size={15} fill="currentColor" />
                    {card.health} HP
                  </span>
                )}
                <span className="printed-id">
                  Library ID: {card.printed_id}
                </span>
              </div>
            </div>
          </div>
          {variants.length > 1 && (
            <label className="variant-select">
              Rules version
              <select
                aria-label="Rules version"
                value={card.id}
                onChange={(e) => {
                  const next = cards.find((c) => c.id === e.target.value);
                  if (next) onOpen(next);
                }}
              >
                {variants.map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.expansion || v.category_en} · {v.faction} ·{" "}
                    {v.printed_id}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(card.source_reference || card.artwork_source) && (
            <details className="reader-source">
              <summary>
                {card.artwork_source ? "Sources" : card.source_reference?.label}
              </summary>
              {card.source_reference && (
                <>
                  <p>{card.source_reference.note}</p>
                  <a
                    href={card.source_reference.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chinese source ↗
                  </a>
                </>
              )}
              {card.artwork_source && (
                <>
                  <p>
                    Artwork · {card.artwork_source.dimensions.join(" × ")} ·
                    Original resolution
                  </p>
                  <a
                    href={card.artwork_source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {card.artwork_source.label} ↗
                  </a>
                  <p>
                    <a
                      href={card.artwork_source.verification_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View this card in the deck ↗
                    </a>
                  </p>
                </>
              )}
            </details>
          )}
          <VersionCompare card={card} cards={cards} onOpen={onOpen} />
          <div className="reader-controls">
            <div
              className="segmented"
              role="group"
              aria-label="Translation language"
            >
              {(["English", "Bilingual", "中文"] as const).map((m) => (
                <button
                  aria-pressed={mode === m}
                  className={mode === m ? "selected" : ""}
                  key={m}
                  onClick={() => {
                    setMode(m);
                    savePreference("sha-reading", m);
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              className="text-size"
              aria-label="Larger text"
              aria-pressed={size === "Large"}
              onClick={() => {
                const next = size === "Large" ? "Standard" : "Large";
                setSize(next);
                savePreference("sha-text-size", next);
              }}
            >
              A<span>A</span>
            </button>
          </div>
          <div className="translation-heading">
            <h2>
              {card.skills.length
                ? "Skills & abilities"
                : "How to use this card"}
            </h2>
            <button
              className="text-link"
              onClick={() => setGlossary(!glossary)}
              aria-expanded={glossary}
            >
              <BookOpen size={16} /> Game terms
            </button>
          </div>
          {glossary && (
            <aside className="reader-glossary" aria-label="Game terms">
              <div className="section-title">
                <h3>A little clarity</h3>
                <button
                  className="icon-btn"
                  aria-label="Close game terms"
                  onClick={() => setGlossary(false)}
                >
                  <X size={18} />
                </button>
              </div>
              {terms.map((t) => (
                <details key={t.name}>
                  <summary>
                    {t.name} <small lang="zh">{t.cn}</small>
                  </summary>
                  <p>{t.text}</p>
                </details>
              ))}
            </aside>
          )}
          {card.skills.map((s, i) => (
            <section
              className={`skill ${s.translation_missing ? "missing-skill" : ""}`}
              key={i}
            >
              <div className="skill-title">
                <h3>{mode === "中文" ? s.name_cn : s.name_en}</h3>
                {mode !== "中文" && <span lang="zh">{s.name_cn}</span>}
              </div>
              <div className="skill-tags">
                {[s.skill_type, s.skill_type_secondary]
                  .filter(Boolean)
                  .map((t) => (
                    <span key={t} className="skill-type">
                      {t} skill
                    </span>
                  ))}
                {s.translation_missing && (
                  <span className="source-gap">Source text missing</span>
                )}
              </div>
              {mode !== "中文" && (
                <p className="rules-prose">{richText(s.description_en)}</p>
              )}
              {mode !== "English" && (
                <p className="chinese-text" lang="zh">
                  {s.description_cn}
                </p>
              )}
            </section>
          ))}
          {card.effect_en?.map((text, i) => (
            <section className="skill" key={i}>
              {mode !== "中文" && (
                <p className="rules-prose">{richText(text)}</p>
              )}
              {mode !== "English" && (
                <p className="chinese-text" lang="zh">
                  {card.effect_cn?.[i]}
                </p>
              )}
            </section>
          ))}
          {!card.skills.length && !card.effect_en?.length && (
            <p className="notice">
              The source library has no effect text for this card.
            </p>
          )}
          {!!card.faq?.length && (
            <section className="faq">
              <h2>Questions at the table</h2>
              {card.faq.map((f, i) => (
                <details key={i}>
                  <summary>{mode === "中文" ? f.q_cn : f.q_en}</summary>
                  {mode !== "中文" && <p>{richText(f.a_en)}</p>}
                  {mode !== "English" && (
                    <p className="chinese-text" lang="zh">
                      {mode === "Bilingual" && (
                        <>
                          {f.q_cn}
                          <br />
                        </>
                      )}
                      {f.a_cn}
                    </p>
                  )}
                </details>
              ))}
            </section>
          )}
          <div className="detail-foot">
            <BookOpen size={17} />
            <p>
              Community translations. Match the edition to your printed card.
              {(card.translation_reviewed ||
                card.skills.some((s) => s.translation_reviewed)) && (
                <span>
                  {" "}
                  Wording reviewed in this update; Chinese source retained for
                  comparison.
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </dialog>
  );
}
