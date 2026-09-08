import { describe, expect, it, vi } from "vitest";
import { recognizeCard } from "./recognition";
import type { ScanResult } from "./types";
const visual: ScanResult = {
  candidates: [{ id: "SHU002", score: 0.9, method: "artwork" }],
  strong: true,
  guidance: "",
};
const reference: ScanResult = {
  candidates: [{ id: "REF_pe_xiahoulan", score: 0.8, method: "text" }],
  guidance: "",
};
describe("artwork-first recognition", () => {
  it("keeps artwork identity and skips OCR when a visual match exists", async () => {
    const text = vi.fn();
    expect(
      await recognizeCard({
        artwork: async () => visual,
        text,
        signal: new AbortController().signal,
      }),
    ).toBe(visual);
    expect(text).not.toHaveBeenCalled();
  });
  it("finds text-only references when there is no indexed artwork", async () => {
    expect(
      (
        await recognizeCard({
          artwork: async () => ({ candidates: [], guidance: "" }),
          text: async () => reference,
          signal: new AbortController().signal,
        })
      ).candidates,
    ).toEqual(reference.candidates);
  });
  it("uses browser text lookup when the artwork service fails", async () => {
    expect(
      (
        await recognizeCard({
          artwork: async () => {
            throw new Error("offline");
          },
          text: async () => reference,
          signal: new AbortController().signal,
        })
      ).candidates,
    ).toEqual(reference.candidates);
  });
  it("does not start OCR after the user cancels an artwork request", async () => {
    const controller = new AbortController(),
      text = vi.fn();
    await expect(
      recognizeCard({
        artwork: async () => {
          controller.abort();
          throw new Error();
        },
        text,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(text).not.toHaveBeenCalled();
  });
  it("honors an explicit text-only retry", async () => {
    const artwork = vi.fn();
    expect(
      await recognizeCard({
        artwork,
        text: async () => reference,
        signal: new AbortController().signal,
        textOnly: true,
      }),
    ).toBe(reference);
    expect(artwork).not.toHaveBeenCalled();
  });
});
