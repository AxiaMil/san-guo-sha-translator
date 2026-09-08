import type { ScanResult } from "./types";

// Artwork is the first source of identity. OCR also covers text-only references
// and keeps lookup usable if the matching service is unavailable.
export async function recognizeCard({
  artwork,
  text,
  signal,
  textOnly = false,
}: {
  artwork: () => Promise<ScanResult>;
  text: () => Promise<ScanResult>;
  signal: AbortSignal;
  textOnly?: boolean;
}): Promise<ScanResult> {
  signal.throwIfAborted();
  if (textOnly) return text();
  let visual: ScanResult | undefined;
  try {
    visual = await artwork();
  } catch {
    signal.throwIfAborted();
  }
  signal.throwIfAborted();
  if (visual?.candidates.length) return visual;
  const result = await text();
  signal.throwIfAborted();
  return { ...result, quality: visual?.quality };
}
