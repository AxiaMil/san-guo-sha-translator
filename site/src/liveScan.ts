import type { ScanResult } from "./types";

export type FrameQuality = {
  brightness: number;
  contrast: number;
  sharpness: number;
  glare: number;
  motion: number;
};
export type LiveFrame = {
  image: string;
  pixels: Uint8ClampedArray;
  quality: FrameQuality;
};
export type LiveStatus = {
  message: string;
  progress: number;
  warning?: boolean;
};

// A small, centered luminance sample is enough for feedback without running OCR
// or shipping every video frame to the server. Thresholds are guidance, not identity.
export function frameQuality(
  pixels: Uint8ClampedArray,
  width: number,
  previous?: Uint8ClampedArray,
): FrameQuality {
  const n = pixels.length,
    height = n / width;
  let mean = 0,
    oldMean = 0,
    clipped = 0;
  for (let i = 0; i < n; i++) {
    mean += pixels[i];
    oldMean += previous?.[i] ?? pixels[i];
    if (pixels[i] > 247) clipped++;
  }
  mean /= n;
  oldMean /= n;
  let variance = 0,
    change = 0,
    lap = 0,
    lap2 = 0,
    count = 0;
  for (let i = 0; i < n; i++) {
    variance += (pixels[i] - mean) ** 2;
    if (previous?.length === n)
      change += Math.abs(pixels[i] - mean - (previous[i] - oldMean));
    const x = i % width,
      y = Math.floor(i / width);
    if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
      const v =
        4 * pixels[i] -
        pixels[i - 1] -
        pixels[i + 1] -
        pixels[i - width] -
        pixels[i + width];
      lap += v;
      lap2 += v * v;
      count++;
    }
  }
  return {
    brightness: mean,
    contrast: Math.sqrt(variance / n),
    sharpness: count ? lap2 / count - (lap / count) ** 2 : 0,
    glare: clipped / n,
    motion: change / n,
  };
}
export function qualityHint(q: FrameQuality): string | undefined {
  if (q.brightness < 42) return "More light needed. Move to a brighter spot.";
  if (q.glare > 0.22 || q.brightness > 223)
    return "Tilt the card away from glare or direct light.";
  if (q.motion > 14) return "Hold your phone steady.";
  if (q.sharpness < 65 || q.contrast < 12)
    return "Move closer and hold still while the camera focuses.";
}

// Consecutive independent frames must agree. A single lucky feature match, a
// change of card, or several weak guesses never confirms an identity.
export class MatchConsensus {
  private key = "";
  private count = 0;
  private best?: { result: ScanResult; image: string };
  reset() {
    this.key = "";
    this.count = 0;
    this.best = undefined;
  }
  add(result: ScanResult, image: string) {
    const top = result.candidates[0];
    if (
      !top ||
      top.method !== "artwork" ||
      top.score < 0.62 ||
      (top.inliers || 0) < 14
    ) {
      this.reset();
      return { progress: 0 };
    }
    const near = result.candidates.filter((c) => top.score - c.score < 0.08);
    const ambiguous = near.length > 1;
    if (ambiguous && (top.score < 0.72 || (top.inliers || 0) < 18)) {
      this.reset();
      return { progress: 0 };
    }
    const key = near
      .map((c) => c.id)
      .sort()
      .join("|");
    if (key !== this.key) {
      this.reset();
      this.key = key;
    }
    this.count++;
    if (!this.best || top.score > this.best.result.candidates[0].score)
      this.best = { result, image };
    const required = result.strong && !ambiguous ? 2 : 3;
    return {
      progress: Math.min(this.count / required, 1),
      match: this.count >= required ? this.best : undefined,
    };
  }
}

export async function matchArtwork(
  image: string,
  signal: AbortSignal,
): Promise<ScanResult> {
  const response = await fetch("/api/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: image.split(",")[1] }),
    signal,
  });
  if (!response.ok) throw new Error("Artwork matching unavailable.");
  const result: ScanResult = await response.json();
  if (!Array.isArray(result.candidates))
    throw new Error("Invalid match response.");
  return result;
}

// Only one request can be in flight. Local sampling continues so movement can
// invalidate an old response, even when the server is still matching that frame.
export function startLiveScan({
  frame,
  match = matchArtwork,
  status,
  found,
}: {
  frame: (previous?: Uint8ClampedArray) => LiveFrame | undefined;
  match?: typeof matchArtwork;
  status: (value: LiveStatus) => void;
  found: (result: ScanResult, image: string) => void;
}) {
  let stopped = false,
    pending = false,
    nextRequest = 0,
    stableSince = 0;
  let epoch = 0,
    failures = 0,
    misses = 0,
    progress = 0;
  let previous: Uint8ClampedArray | undefined;
  let controller: AbortController | undefined;
  let requestTimer: ReturnType<typeof setTimeout> | undefined;
  const consensus = new MatchConsensus();
  let serverHint = "Looking for card artwork…";
  const stop = () => {
    stopped = true;
    clearInterval(timer);
    clearTimeout(requestTimer);
    controller?.abort();
  };
  function tick() {
    if (stopped) return;
    const now = Date.now();
    const sample = frame(previous);
    if (!sample) {
      stableSince = 0;
      epoch++;
      consensus.reset();
      progress = 0;
      return;
    }
    previous = sample.pixels;
    const q = sample.quality,
      hint = qualityHint(q);
    const unusable =
      q.motion > 14 || q.brightness < 22 || q.glare > 0.75 || q.contrast < 5;
    if (unusable) {
      stableSince = 0;
      epoch++;
      consensus.reset();
      progress = 0;
      status({
        message: hint || "Keep one card in view.",
        progress,
        warning: true,
      });
      return;
    }
    if (!stableSince) stableSince = now;
    status({
      message:
        hint ||
        (progress ? "Match spotted. Hold steady to confirm…" : serverHint),
      progress,
      warning: !!hint,
    });
    if (pending || now < nextRequest || now - stableSince < 500) return;
    pending = true;
    const capturedEpoch = epoch,
      capturedImage = sample.image;
    const active = new AbortController();
    controller = active;
    requestTimer = setTimeout(() => active.abort("timeout"), 25000);
    void match(capturedImage, active.signal)
      .then((result) => {
        if (stopped || active.signal.aborted || capturedEpoch !== epoch) return;
        failures = 0;
        const vote = consensus.add(result, capturedImage);
        progress = vote.progress;
        misses = progress ? 0 : misses + 1;
        serverHint =
          misses >= 3
            ? "Bring one card closer, then tilt it slightly to reveal the artwork."
            : "Looking for card artwork…";
        if (vote.match) {
          stop();
          found(vote.match.result, vote.match.image);
        }
      })
      .catch(() => {
        if (stopped) return;
        failures++;
        consensus.reset();
        progress = 0;
        serverHint = "Connection interrupted. Retrying automatically…";
        status({ message: serverHint, progress: 0, warning: true });
      })
      .finally(() => {
        clearTimeout(requestTimer);
        pending = false;
        nextRequest =
          Date.now() + (failures ? Math.min(15000, 1500 * 2 ** failures) : 900);
      });
  }
  const timer = setInterval(tick, 180);
  return stop;
}

export function cameraFrame(
  video: HTMLVideoElement,
  previous?: Uint8ClampedArray,
): LiveFrame | undefined {
  if (
    video.readyState < 2 ||
    video.paused ||
    !video.videoWidth ||
    !video.videoHeight
  )
    return;
  // Match the visible object-fit: cover region, not an invisible area beside it.
  const rect = video.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const aspect = rect.width / rect.height;
  const vw = video.videoWidth,
    vh = video.videoHeight;
  const sw = Math.min(vw, vh * aspect),
    sh = Math.min(vh, vw / aspect);
  const scale = Math.min(1, 1400 / Math.max(sw, sh));
  const sample = document.createElement("canvas");
  sample.width = 96;
  sample.height = 128;
  const ctx = sample.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(
    video,
    (vw - sw) / 2 + sw * 0.12,
    (vh - sh) / 2 + sh * 0.08,
    sw * 0.76,
    sh * 0.78,
    0,
    0,
    96,
    128,
  );
  const rgba = ctx.getImageData(0, 0, 96, 128).data;
  const pixels = new Uint8ClampedArray(96 * 128);
  for (let i = 0; i < pixels.length; i++)
    pixels[i] =
      0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  return {
    get image() {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      canvas
        .getContext("2d")!
        .drawImage(
          video,
          (vw - sw) / 2,
          (vh - sh) / 2,
          sw,
          sh,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      return canvas.toDataURL("image/jpeg", 0.88);
    },
    pixels,
    quality: frameQuality(pixels, 96, previous),
  };
}
