import { afterEach, describe, expect, it, vi } from "vitest";
import {
  frameQuality,
  qualityHint,
  MatchConsensus,
  startLiveScan,
  type LiveFrame,
} from "./liveScan";
import type { ScanResult } from "./types";
const result = (id = "A", score = 0.9, strong = true): ScanResult => ({
  candidates: [{ id, score, inliers: 30, method: "artwork" }],
  strong,
  guidance: "Compare edition",
});
const quality = {
  brightness: 120,
  contrast: 45,
  sharpness: 450,
  glare: 0.02,
  motion: 0,
};
const sample = (): LiveFrame => ({
  image: "data:image/jpeg;base64,frame",
  pixels: new Uint8ClampedArray(4),
  quality: { ...quality },
});
afterEach(() => vi.useRealTimers());
describe("live camera frame quality", () => {
  it("detects dim, washed-out and moving frames with useful instructions", () => {
    expect(qualityHint({ ...quality, brightness: 20 })).toMatch(/light/);
    expect(qualityHint({ ...quality, glare: 0.4 })).toMatch(/glare/);
    expect(qualityHint({ ...quality, motion: 30 })).toMatch(/steady/);
    expect(qualityHint({ ...quality, sharpness: 15 })).toMatch(/focuses/);
    expect(qualityHint(quality)).toBeUndefined();
  });
  it("does not mistake uniform exposure adjustment for movement", () => {
    const old = Uint8ClampedArray.from(
      { length: 256 },
      (_, i) => 50 + (i % 120),
    );
    const brighter = old.map((x) => x + 25);
    expect(frameQuality(brighter, 16, old).motion).toBe(0);
    expect(frameQuality(old.slice().reverse(), 16, old).motion).toBeGreaterThan(
      14,
    );
  });
});
describe("multi-frame artwork agreement", () => {
  it("requires repeated agreement and keeps the best matching frame", () => {
    const c = new MatchConsensus();
    expect(c.add(result(), "sharp").match).toBeUndefined();
    expect(c.add(result("A", 0.8), "softer").match?.image).toBe("sharp");
  });
  it("does not combine different identities or weak guesses", () => {
    const c = new MatchConsensus();
    c.add(result("A"), "a");
    expect(c.add(result("B"), "b").match).toBeUndefined();
    expect(c.add(result("B", 0.4, false), "weak").progress).toBe(0);
    expect(c.add(result("B"), "b2").match).toBeUndefined();
  });
  it("requires three moderate matches and preserves shared-artwork alternatives", () => {
    const c = new MatchConsensus();
    const shared = {
      ...result(),
      strong: false,
      candidates: [
        ...result().candidates,
        { ...result("edition-B").candidates[0] },
      ],
    };
    expect(c.add(shared, "1").match).toBeUndefined();
    expect(c.add(shared, "2").match).toBeUndefined();
    expect(c.add(shared, "3").match?.result.candidates).toHaveLength(2);
    c.reset();
    for (let i = 0; i < 2; i++)
      expect(c.add(result("A", 0.67, false), "m").match).toBeUndefined();
    expect(c.add(result("A", 0.67, false), "m").match).toBeDefined();
  });
});
describe("continuous scan lifecycle", () => {
  it("finds a card automatically, serializes requests and stops after confirmation", async () => {
    vi.useFakeTimers();
    const match = vi.fn(async () => result()),
      found = vi.fn();
    const stop = startLiveScan({
      frame: sample,
      match,
      found,
      status: vi.fn(),
    });
    await vi.advanceTimersByTimeAsync(4000);
    expect(match).toHaveBeenCalledTimes(2);
    expect(found).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(match).toHaveBeenCalledTimes(2);
    stop();
  });
  it("does not overlap slow requests and aborts on camera close", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const match = vi.fn((_image, s: AbortSignal) => {
      signal = s;
      return new Promise<ScanResult>(() => {});
    });
    const stop = startLiveScan({
      frame: sample,
      match,
      found: vi.fn(),
      status: vi.fn(),
    });
    await vi.advanceTimersByTimeAsync(6000);
    expect(match).toHaveBeenCalledTimes(1);
    stop();
    expect(signal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(30000);
    expect(match).toHaveBeenCalledTimes(1);
  });
  it("rejects a stale match when movement happens during a request", async () => {
    vi.useFakeTimers();
    const frame = sample();
    let resolve!: (r: ScanResult) => void;
    const found = vi.fn(),
      match = vi.fn(() => new Promise<ScanResult>((r) => (resolve = r)));
    const stop = startLiveScan({
      frame: () => frame,
      match,
      found,
      status: vi.fn(),
    });
    await vi.advanceTimersByTimeAsync(800);
    frame.quality.motion = 35;
    await vi.advanceTimersByTimeAsync(400);
    resolve(result());
    await vi.advanceTimersByTimeAsync(100);
    expect(found).not.toHaveBeenCalled();
    frame.quality.motion = 0;
    await vi.advanceTimersByTimeAsync(1700);
    resolve(result());
    await vi.advanceTimersByTimeAsync(100);
    expect(found).not.toHaveBeenCalled();
    stop();
  });
  it("skips unusable frames and resumes when lighting improves", async () => {
    vi.useFakeTimers();
    const frame = sample();
    frame.quality.brightness = 10;
    const match = vi.fn(async () => result()),
      status = vi.fn();
    const stop = startLiveScan({
      frame: () => frame,
      match,
      status,
      found: vi.fn(),
    });
    await vi.advanceTimersByTimeAsync(3000);
    expect(match).not.toHaveBeenCalled();
    expect(status.mock.lastCall?.[0].message).toMatch(/light/);
    frame.quality.brightness = 120;
    await vi.advanceTimersByTimeAsync(3000);
    expect(match).toHaveBeenCalledTimes(2);
    stop();
  });
  it("retries service errors with backoff and ignores late results after stop", async () => {
    vi.useFakeTimers();
    const found = vi.fn(),
      status = vi.fn();
    let resolve!: (r: ScanResult) => void;
    const match = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementation(() => new Promise<ScanResult>((r) => (resolve = r)));
    const stop = startLiveScan({ frame: sample, match, status, found });
    await vi.advanceTimersByTimeAsync(2500);
    expect(match).toHaveBeenCalledTimes(1);
    expect(status.mock.lastCall?.[0].message).toMatch(/Retrying/);
    await vi.advanceTimersByTimeAsync(2000);
    expect(match).toHaveBeenCalledTimes(2);
    stop();
    resolve(result());
    await vi.advanceTimersByTimeAsync(1000);
    expect(found).not.toHaveBeenCalled();
  });
});

describe("interrupted live frames", () => {
  it("recovers from a timed-out request without overlapping a retry", async () => {
    vi.useFakeTimers();
    const status = vi.fn(),
      found = vi.fn();
    const match = vi.fn(
      (_image: string, signal: AbortSignal) =>
        new Promise<ScanResult>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("timeout")), {
            once: true,
          });
        }),
    );
    const stop = startLiveScan({ frame: sample, match, status, found });
    await vi.advanceTimersByTimeAsync(26000);
    expect(match).toHaveBeenCalledTimes(1);
    expect(status.mock.lastCall?.[0].message).toMatch(/Retrying/);
    await vi.advanceTimersByTimeAsync(4000);
    expect(match).toHaveBeenCalledTimes(2);
    expect(found).not.toHaveBeenCalled();
    stop();
  });
  it("does not join agreement across a stalled or hidden video", async () => {
    vi.useFakeTimers();
    let available = true;
    const found = vi.fn(),
      match = vi.fn(async () => result());
    const stop = startLiveScan({
      frame: () => (available ? sample() : undefined),
      match,
      found,
      status: vi.fn(),
    });
    await vi.advanceTimersByTimeAsync(900);
    expect(match).toHaveBeenCalledTimes(1);
    available = false;
    await vi.advanceTimersByTimeAsync(1000);
    available = true;
    await vi.advanceTimersByTimeAsync(800);
    expect(match).toHaveBeenCalledTimes(2);
    expect(found).not.toHaveBeenCalled();
    stop();
  });
});
