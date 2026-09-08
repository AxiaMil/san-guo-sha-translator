import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  ScanLine,
  RotateCw,
  X,
  ArrowRight,
  LoaderCircle,
  TextSearch,
  Focus,
  Sun,
} from "lucide-react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import type { Card, ScanResult } from "./types";
import { canvasOf, loadImage } from "./imaging";
import { matchText } from "./matching";
import {
  familyCards,
  rankVersions,
  suggestedVersion,
  versionLabel,
} from "./versions";
import VersionCompare from "./VersionCompare";
import CardArt from "./CardArt";
import { recognizeCard } from "./recognition";
import {
  cameraFrame,
  matchArtwork,
  startLiveScan,
  type LiveStatus,
} from "./liveScan";
import { deckCardIds, type Deck } from "./decks";
export default function Scanner({
  cards,
  deck,
  onOpen,
  onBrowse,
}: {
  cards: Card[];
  deck?: Deck;
  onOpen: (c: Card) => void;
  onBrowse: () => void;
}) {
  const [photo, setPhoto] = useState(""),
    [live, setLive] = useState(false),
    [openingCamera, setOpeningCamera] = useState(false),
    [cameraReady, setCameraReady] = useState(false),
    [liveStatus, setLiveStatus] = useState<LiveStatus>({
      message: "Keep one card in view. Scanning automatically…",
      progress: 0,
    }),
    [crop, setCrop] = useState<Crop>(),
    [pixelCrop, setPixelCrop] = useState<PixelCrop>(),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [result, setResult] = useState<ScanResult | null>(null),
    [ocrText, setOcrText] = useState(""),
    [versionText, setVersionText] = useState("");
  const primaryMatch = cards.find((c) => c.id === result?.candidates[0]?.id);
  const deckIds = useMemo(() => deckCardIds(cards, deck), [cards, deck]);
  const versionPool = useMemo(() => {
    const family = primaryMatch ? familyCards(cards, primaryMatch) : [];
    return [...family].sort(
      (a, b) => Number(deckIds.has(b.id)) - Number(deckIds.has(a.id)),
    );
  }, [cards, primaryMatch, deckIds]);
  const versionRanks = useMemo(
    () => rankVersions(versionPool, versionText),
    [versionPool, versionText],
  );
  const suggestion = suggestedVersion(versionRanks);
  const camera = useRef<HTMLInputElement>(null),
    upload = useRef<HTMLInputElement>(null),
    video = useRef<HTMLVideoElement>(null),
    img = useRef<HTMLImageElement>(null),
    stream = useRef<MediaStream | null>(null),
    request = useRef<AbortController | null>(null),
    mounted = useRef(true),
    cameraGeneration = useRef(0),
    autoScan = useRef(false);
  const stopLive = useRef<(() => void) | undefined>(undefined);
  const autoText = useRef(false);
  const photoGeneration = useRef(0);
  const resultsRef = useRef<HTMLElement>(null);
  const versionResultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result) {
      resultsRef.current?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
      resultsRef.current?.focus({ preventScroll: true });
    }
  }, [result]);
  function stopCamera() {
    stopLive.current?.();
    stopLive.current = undefined;
    cameraGeneration.current++;
    setOpeningCamera(false);
    setCameraReady(false);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setLive(false);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cameraGeneration.current++;
      stopLive.current?.();
      stream.current?.getTracks().forEach((t) => t.stop());
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) {
        stopCamera();
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);
  useEffect(() => {
    if (live && video.current && stream.current) {
      video.current.srcObject = stream.current;
      video.current.parentElement?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
      const activeStream = stream.current;
      void video.current.play().catch(() => {
        if (stream.current !== activeStream || !mounted.current) return;
        stopCamera();
        setError("Camera preview unavailable. Use Take a photo below.");
      });
    }
  }, [live]);
  useEffect(() => {
    if (!live) return;
    let frameTime = -1;
    const stop = startLiveScan({
      frame: (previous) => {
        const current = video.current;
        if (!current || current.currentTime === frameTime) return;
        frameTime = current.currentTime;
        return cameraFrame(current, previous);
      },
      status: (next) =>
        setLiveStatus((previous) =>
          previous.message === next.message &&
          previous.progress === next.progress &&
          previous.warning === next.warning
            ? previous
            : next,
        ),
      found: (match, image) => {
        if (!mounted.current) return;
        autoScan.current = false;
        stopCamera();
        setPhoto(image);
        setResult(match);
      },
    });
    stopLive.current = stop;
    return stop;
  }, [live]);
  function reset() {
    photoGeneration.current++;
    autoScan.current = false;
    autoText.current = false;
    request.current?.abort();
    setBusy(false);
    setPhoto("");
    setResult(null);
    setCrop(undefined);
    setPixelCrop(undefined);
    setError("");
    setOcrText("");
    setVersionText("");
  }
  async function openCamera() {
    if (openingCamera || live) return;
    reset();
    setLiveStatus({
      message: "Keep one card in view. Scanning automatically…",
      progress: 0,
    });
    if (!navigator.mediaDevices?.getUserMedia) {
      camera.current?.click();
      return;
    }
    const generation = ++cameraGeneration.current;
    setOpeningCamera(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      });
      if (!mounted.current || generation !== cameraGeneration.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const track = media.getVideoTracks()[0];
      track?.addEventListener(
        "ended",
        () => {
          if (stream.current !== media || !mounted.current) return;
          stopCamera();
          setError("Camera disconnected. Open it again to resume scanning.");
        },
        { once: true },
      );
      try {
        const capabilities = track?.getCapabilities?.() as
          (MediaTrackCapabilities & { focusMode?: string[] }) | undefined;
        if (capabilities?.focusMode?.includes("continuous")) {
          void track
            .applyConstraints({
              advanced: [
                { focusMode: "continuous" } as MediaTrackConstraintSet,
              ],
            })
            .catch(() => {});
        }
      } catch {
        // Optional focus controls must not prevent a usable camera from opening.
      }
      setLive(true);
    } catch {
      if (mounted.current && generation === cameraGeneration.current)
        setError(
          "Camera access is unavailable. Use “Take a photo” or choose an existing image.",
        );
    } finally {
      if (mounted.current && generation === cameraGeneration.current)
        setOpeningCamera(false);
    }
  }
  async function choose(file?: File, identify = false) {
    if (!file) return;
    reset();
    stopCamera();
    const generation = photoGeneration.current;
    if (file.size > 25 * 1024 * 1024) {
      setError("Choose a photo smaller than 25 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      if (!mounted.current || photoGeneration.current !== generation) return;
      const resized = canvasOf(image, undefined, 0, 1800);
      autoScan.current = identify;
      setPhoto(resized.toDataURL("image/jpeg", 0.92));
    } catch {
      if (!mounted.current || photoGeneration.current !== generation) return;
      setError(
        "This image format could not be opened. Try a JPEG, PNG, or WebP photo.",
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function capture() {
    const v = video.current;
    if (!cameraReady || !v?.videoWidth || !v.videoHeight) return;
    const frame = cameraFrame(v);
    if (!frame) return;
    autoScan.current = true;
    autoText.current = true;
    setPhoto(frame.image);
    setCrop(undefined);
    setPixelCrop(undefined);
    stopCamera();
  }
  function rotate() {
    if (!img.current) return;
    const canvas = canvasOf(img.current, undefined, 90, 1800);
    setPhoto(canvas.toDataURL("image/jpeg", 0.92));
    setCrop(undefined);
    setPixelCrop(undefined);
    setResult(null);
  }
  async function scan(textOnly = false) {
    if (!img.current || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    setOcrText("");
    setVersionText("");
    const controller = new AbortController();
    request.current = controller;
    const canvas = canvasOf(
      img.current,
      pixelCrop && pixelCrop.width > 20 ? pixelCrop : undefined,
      0,
      1400,
    );
    let timer = window.setTimeout(
      () => controller.abort("timeout"),
      textOnly ? 150000 : 65000,
    );
    try {
      const next = await recognizeCard({
        signal: controller.signal,
        textOnly,
        text: async () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => controller.abort("timeout"), 150000);
          setStatus("Reading card text…");
          const { readCard } = await import("./ocr");
          const text = await readCard(
            canvas,
            (s) => {
              if (!controller.signal.aborted) setStatus(s);
            },
            controller.signal,
          );
          controller.signal.throwIfAborted();
          setOcrText(text);
          setVersionText(text);
          return {
            candidates: matchText(cards, text),
            guidance:
              "Compare the printed name and skills to confirm the match.",
          };
        },
        artwork: async () => {
          setStatus("Matching card artwork…");
          return matchArtwork(
            canvas.toDataURL("image/jpeg", 0.88),
            controller.signal,
          );
        },
      });
      if (!controller.signal.aborted && mounted.current) setResult(next);
    } catch (e) {
      if (mounted.current) {
        if (controller.signal.reason === "timeout")
          setError(
            "Recognition took too long. Try a closer crop, text recognition, or search.",
          );
        else if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "Could not scan this photo. Try text recognition or search.",
          );
      }
    } finally {
      window.clearTimeout(timer);
      if (request.current === controller) {
        request.current = null;
        if (mounted.current) setBusy(false);
      }
    }
  }
  async function checkVersion() {
    if (!img.current || busy || !primaryMatch) return;
    setBusy(true);
    setError("");
    setVersionText("");
    const controller = new AbortController();
    request.current = controller;
    const timer = window.setTimeout(() => controller.abort("timeout"), 150000);
    try {
      const { readCard } = await import("./ocr");
      // Read the entire photo: an artwork crop can remove the edition's text.
      const text = await readCard(
        canvasOf(img.current, undefined, 0, 1800),
        setStatus,
        controller.signal,
      );
      if (!controller.signal.aborted && mounted.current) {
        setVersionText(text);
        window.requestAnimationFrame(() =>
          versionResultRef.current?.scrollIntoView({
            block: "start",
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
          }),
        );
      }
    } catch (e) {
      if (!controller.signal.aborted && mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "Couldn’t read the printed version. Compare the skill text below.",
        );
      if (controller.signal.reason === "timeout" && mounted.current)
        setError(
          "Reading the version took too long. Try a clearer photo of the full card or enter its skill text below.",
        );
    } finally {
      window.clearTimeout(timer);
      if (request.current === controller) {
        request.current = null;
        if (mounted.current) setBusy(false);
      }
    }
  }
  return (
    <section
      className={`scanner ${photo ? "has-photo" : live ? "is-live" : "is-ready"}`}
    >
      <input
        ref={upload}
        type="file"
        accept="image/*"
        aria-label="Upload card photo"
        className="sr-only"
        onChange={(e) => {
          void choose(e.target.files?.[0], true);
          e.target.value = "";
        }}
      />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Take a card photo"
        className="sr-only"
        onChange={(e) => {
          void choose(e.target.files?.[0], true);
          e.target.value = "";
        }}
      />
      <h1 className="sr-only">Scan a card</h1>
      {live && (
        <div className="camera-stage">
          <video
            ref={video}
            playsInline
            muted
            autoPlay
            onCanPlay={() => setCameraReady(true)}
            onWaiting={() => setCameraReady(false)}
            onError={() => {
              stopCamera();
              setError("Camera preview unavailable. Use Take a photo below.");
            }}
          />
          <div
            className={`viewfinder ${liveStatus.progress ? "has-match" : ""}`}
          />
          <span className="live-badge">
            <ScanLine size={16} /> Auto scan
          </span>
          <div
            className="live-guidance"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p>{cameraReady ? liveStatus.message : "Starting camera…"}</p>
            <div className="live-confirmation" aria-hidden="true">
              <span style={{ width: `${liveStatus.progress * 100}%` }} />
            </div>
          </div>
          <button
            className="icon-btn camera-close"
            aria-label="Close camera"
            onClick={stopCamera}
          >
            <X />
          </button>
          <button
            className="camera-text-fallback"
            disabled={!cameraReady}
            onClick={capture}
          >
            <TextSearch size={16} /> Read text instead
          </button>
        </div>
      )}
      {photo && (
        <div className="photo-workspace">
          <div className="photo-toolbar">
            <span>
              <Focus size={16} /> Drag to crop the card
            </span>
            <div>
              <button
                className="icon-btn"
                aria-label="Rotate photo"
                disabled={busy}
                onClick={rotate}
              >
                <RotateCw size={19} />
              </button>
              <button
                className="icon-btn"
                aria-label="Remove photo"
                onClick={reset}
              >
                <X size={19} />
              </button>
            </div>
          </div>
          <div className="crop-surface">
            <ReactCrop
              crop={crop}
              onChange={(c) => {
                setCrop(c);
                setResult(null);
              }}
              onComplete={setPixelCrop}
              disabled={busy}
              minWidth={30}
              minHeight={30}
            >
              <img
                ref={img}
                src={photo}
                onLoad={() => {
                  if (autoScan.current) {
                    autoScan.current = false;
                    const textOnly = autoText.current;
                    autoText.current = false;
                    void scan(textOnly);
                  }
                }}
                alt="Your card photo, drag to select a crop"
              />
            </ReactCrop>
          </div>
        </div>
      )}
      {!live && (
        <div className="scan-actions">
          {photo ? (
            <>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void scan()}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={20} />
                ) : (
                  <ScanLine size={20} />
                )}{" "}
                {busy ? "Recognizing…" : "Identify card"}
                {!busy && <ArrowRight size={19} />}
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void scan(true)}
              >
                <TextSearch size={20} /> Read text
              </button>
              {!result && (
                <button
                  className="button secondary scan-next"
                  onClick={() => void openCamera()}
                >
                  <Camera size={20} /> Scan next card
                </button>
              )}
            </>
          ) : (
            <>
              <button
                className="button primary"
                disabled={openingCamera}
                onClick={() => void openCamera()}
              >
                <Camera size={21} />{" "}
                {openingCamera ? "Opening…" : "Start scanning"}
              </button>
              <button
                className="button secondary"
                onClick={() => upload.current?.click()}
              >
                <ImagePlus size={20} /> Upload photo
              </button>
            </>
          )}
        </div>
      )}
      {openingCamera && (
        <div className="progress" role="status">
          <span>Allow camera access to continue.</span>
          <button onClick={stopCamera}>Cancel</button>
        </div>
      )}
      {busy && (
        <div className="progress" role="status">
          <span>{status}</span>
          <button
            onClick={() => {
              request.current?.abort();
              setBusy(false);
            }}
          >
            Cancel
          </button>
          <div className="progress-track" />
        </div>
      )}
      {error && (
        <div className="notice" role="alert">
          {error}
          {!photo && (
            <button onClick={() => camera.current?.click()}>
              Take a photo
            </button>
          )}
        </div>
      )}
      {result && (
        <section
          className="results"
          aria-live="polite"
          ref={resultsRef}
          tabIndex={-1}
        >
          <div className="section-title">
            <h2>
              {result.candidates.length ? "Possible matches" : "No match found"}
            </h2>
            <button
              className="text-link"
              aria-label="Scan next card"
              onClick={() => void openCamera()}
            >
              <Camera size={17} /> Scan next
            </button>
          </div>
          <p>{result.guidance}</p>
          {result.candidates[0]?.card_outline && (
            <p className="lighting-note">
              <Focus size={16} /> Card isolated · artwork matched
            </p>
          )}
          {result.quality && result.quality.brightness < 45 && (
            <p className="lighting-note">
              <Sun size={16} /> This photo is quite dark. More light may help.
            </p>
          )}
          {result.candidates.map((match, i) => {
            const card = cards.find((c) => c.id === match.id);
            return card ? (
              <button
                className="match-row"
                key={match.id}
                onClick={() => onOpen(card)}
              >
                <CardArt card={card} />
                <span>
                  <small>
                    {i === 0 && result.strong
                      ? "STRONG ARTWORK MATCH"
                      : match.method === "text"
                        ? "TEXT MATCH"
                        : "ARTWORK MATCH"}
                  </small>
                  <strong>
                    {card.name_en} <b>{card.name_cn}</b>
                  </strong>
                  <em>
                    {card.expansion || card.category_en} · {card.printed_id}
                    {deck && deckIds.has(card.id) ? " · In this deck" : ""}
                  </em>
                </span>
                <ArrowRight size={19} />
              </button>
            ) : null;
          })}
          {primaryMatch && (
            <div className="version-check">
              <h3>Which rules version?</h3>
              <p>
                {deck ? `${deck.name_en} references appear first. ` : ""}Compare
                the printed skills to confirm your version.
              </p>
              {versionPool.length > 1 && (
                <>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void checkVersion()}
                  >
                    <TextSearch size={18} />
                    {busy ? "Reading…" : "Read text to check version"}
                  </button>
                  <p className="guide-note">
                    Reads the full photo, including the printed skills.
                  </p>
                  <details className="manual-version">
                    <summary>Enter or correct the printed text</summary>
                    <textarea
                      aria-label="Printed card text"
                      placeholder="Paste Chinese skill text from your card"
                      value={versionText}
                      onChange={(e) => setVersionText(e.target.value)}
                      rows={4}
                    />
                  </details>
                  {versionText && (
                    <div
                      className="version-evidence"
                      role="status"
                      ref={versionResultRef}
                    >
                      <strong>
                        {suggestion
                          ? `Best text-supported match: ${suggestion.card.name_cn} · ${versionLabel(suggestion.card)}`
                          : "Not enough distinctive text to select a version."}
                      </strong>
                      <p>
                        {suggestion
                          ? "Compare the wording below before choosing. A physical print year is still unverified."
                          : "A shared name, skill title, or card number is not enough. Compare the available versions manually."}
                      </p>
                      {versionRanks
                        .filter((r) => r.score > 0)
                        .slice(0, 3)
                        .map((r) => (
                          <button
                            key={r.card.id}
                            onClick={() => onOpen(r.card)}
                          >
                            <span>
                              <strong>
                                {r.card.name_cn} · {versionLabel(r.card)}
                              </strong>
                              <small>{r.evidence.join(" · ")}</small>
                            </span>
                            <ArrowRight size={17} />
                          </button>
                        ))}
                    </div>
                  )}
                </>
              )}
              <VersionCompare
                card={primaryMatch}
                cards={cards}
                onOpen={onOpen}
              />
            </div>
          )}
          {!result.candidates.length && (
            <button className="text-link" onClick={onBrowse}>
              Search the library <ArrowRight size={16} />
            </button>
          )}
          {ocrText && (
            <details className="ocr-debug">
              <summary>Recognized text</summary>
              <p>{ocrText || "No readable text found."}</p>
            </details>
          )}
        </section>
      )}
      {!photo && !live && (
        <p className="scan-hint">
          Keep one card in frame and tilt it to avoid glare.
        </p>
      )}
    </section>
  );
}
