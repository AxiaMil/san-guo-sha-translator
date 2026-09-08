import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  ScanLine,
  RotateCw,
  X,
  ArrowRight,
  LoaderCircle,
  TextSearch,
  ShieldCheck,
  Focus,
  Sun,
  ZoomIn,
} from "lucide-react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import type { Card, ScanResult } from "./types";
import { canvasOf, loadImage } from "./imaging";
import { matchText } from "./matching";
export default function Scanner({
  cards,
  onOpen,
  onBrowse,
}: {
  cards: Card[];
  onOpen: (c: Card) => void;
  onBrowse: () => void;
}) {
  const [photo, setPhoto] = useState(""),
    [live, setLive] = useState(false),
    [crop, setCrop] = useState<Crop>(),
    [pixelCrop, setPixelCrop] = useState<PixelCrop>(),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [result, setResult] = useState<ScanResult | null>(null),
    [ocrText, setOcrText] = useState("");
  const camera = useRef<HTMLInputElement>(null),
    upload = useRef<HTMLInputElement>(null),
    video = useRef<HTMLVideoElement>(null),
    img = useRef<HTMLImageElement>(null),
    stream = useRef<MediaStream | null>(null),
    request = useRef<AbortController | null>(null),
    mounted = useRef(true),
    cameraPending = useRef(false);
  function stopCamera() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setLive(false);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stream.current?.getTracks().forEach((t) => t.stop());
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) {
        stream.current?.getTracks().forEach((t) => t.stop());
        stream.current = null;
        setLive(false);
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);
  useEffect(() => {
    if (live && video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current.play().catch(() => {
        stopCamera();
        camera.current?.click();
      });
    }
  }, [live]);
  function reset() {
    request.current?.abort();
    setBusy(false);
    setPhoto("");
    setResult(null);
    setCrop(undefined);
    setPixelCrop(undefined);
    setError("");
    setOcrText("");
  }
  async function openCamera() {
    if (cameraPending.current) return;
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      camera.current?.click();
      return;
    }
    cameraPending.current = true;
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      setLive(true);
    } catch {
      if (mounted.current)
        setError(
          "Camera access is unavailable. Use “Take a photo” or choose an existing image.",
        );
    } finally {
      cameraPending.current = false;
    }
  }
  async function choose(file?: File) {
    if (!file) return;
    reset();
    stopCamera();
    if (file.size > 25 * 1024 * 1024) {
      setError("Choose a photo smaller than 25 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      if (!mounted.current) return;
      const resized = canvasOf(image, undefined, 0, 1800);
      setPhoto(resized.toDataURL("image/jpeg", 0.92));
    } catch {
      setError(
        "This image format could not be opened. Try a JPEG, PNG, or WebP photo.",
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function capture() {
    const v = video.current;
    if (!v?.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setPhoto(c.toDataURL("image/jpeg", 0.92));
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
    const controller = new AbortController();
    request.current = controller;
    const canvas = canvasOf(
      img.current,
      pixelCrop && pixelCrop.width > 20 ? pixelCrop : undefined,
      0,
      1400,
    );
    const timer = window.setTimeout(
      () => controller.abort("timeout"),
      textOnly ? 150000 : 65000,
    );
    try {
      let next: ScanResult;
      if (textOnly) {
        setStatus("Preparing text recognition…");
        const { readCard } = await import("./ocr");
        const text = await readCard(
          canvas,
          (s) => {
            if (!controller.signal.aborted) setStatus(s);
          },
          controller.signal,
        );
        next = {
          candidates: matchText(cards, text),
          guidance:
            "Text can match several editions. Compare the artwork and skills.",
        };
        if (!controller.signal.aborted) setOcrText(text);
      } else {
        setStatus("Comparing artwork with the card library…");
        const response = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: canvas.toDataURL("image/jpeg", 0.88).split(",")[1],
          }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error ||
              "Artwork matching is unavailable. Try text recognition.",
          );
        next = data;
      }
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
  return (
    <section className="scanner">
      <input
        ref={upload}
        type="file"
        accept="image/*"
        aria-label="Upload card photo"
        className="sr-only"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
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
          void choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="section-kicker">
        <span className="live-dot" /> YOUR TABLESIDE COMPANION{" "}
        <span className="edition">三国杀</span>
      </div>
      <div className="scan-heading">
        <h1>
          Read the card.
          <br />
          <em>Make your move.</em>
        </h1>
        <p>
          Point your camera at a card. <br />
          Find the general. Understand every skill.
        </p>
      </div>
      {!photo && !live && (
        <div className="scan-stage">
          <div className="stage-top">
            <span>
              <ScanLine size={15} /> CARD RECOGNITION
            </span>
            <span>01 — SCAN</span>
          </div>
          <div className="card-scene" aria-hidden="true">
            <span className="scene-orbit" />
            <img
              className="back-card left-card"
              src="/images/generals/WEI001.webp"
              alt=""
            />
            <img
              className="back-card right-card"
              src="/images/generals/WU001.webp"
              alt=""
            />
            <div className="main-card">
              <img src="/images/generals/SHU002.webp" alt="" />
              <i className="corner tl" />
              <i className="corner tr" />
              <i className="corner bl" />
              <i className="corner br" />
              <span className="scan-beam" />
            </div>
            <span className="recognition-tag">
              <span /> Guan Yu <small>关羽</small>
              <ShieldCheck size={15} />
            </span>
          </div>
          <div className="stage-bottom">
            <span>ARTWORK + CHINESE TEXT</span>
            <span>
              ENGLISH TRANSLATIONS <ArrowRight size={14} />
            </span>
          </div>
        </div>
      )}
      {live && (
        <div className="camera-stage">
          <video ref={video} playsInline muted autoPlay />
          <div className="viewfinder" />
          <p>Fit one card inside the frame</p>
          <button
            className="icon-btn camera-close"
            aria-label="Close camera"
            onClick={stopCamera}
          >
            <X />
          </button>
          <button
            className="shutter"
            aria-label="Capture photo"
            onClick={capture}
          >
            <span />
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
                <TextSearch size={20} /> Read text instead
              </button>
            </>
          ) : (
            <>
              <button
                className="button primary"
                onClick={() => void openCamera()}
              >
                <Camera size={21} /> Open camera <ArrowRight size={19} />
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
        <section className="results" aria-live="polite">
          <div className="section-title">
            <h2>
              {result.candidates.length
                ? "Possible matches"
                : "Let’s try a closer look"}
            </h2>
            <span>
              {result.candidates.length
                ? `${result.candidates.length} found`
                : ""}
            </span>
          </div>
          <p>{result.guidance}</p>
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
                <img src={card.image || ""} alt="" />
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
                  </em>
                </span>
                <ArrowRight size={19} />
              </button>
            ) : null;
          })}
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
        <>
          <div className="privacy">
            <ShieldCheck size={14} />
            <span>No sign-in. Photos processed, never saved.</span>
          </div>
          <div className="tips">
            <div>
              <Sun size={19} />
              <strong>A little light helps</strong>
              <p>Tilt the card to move glare off its artwork.</p>
            </div>
            <div>
              <ZoomIn size={19} />
              <strong>One card at a time</strong>
              <p>Keep the edges in frame and hold steady.</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
