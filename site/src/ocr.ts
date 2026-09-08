import { createWorker, PSM, type Worker } from "tesseract.js";
import { enhance } from "./imaging";
let current: Worker | null = null;
export async function cancelOcr() {
  const worker = current;
  current = null;
  await worker?.terminate();
}
export async function readCard(
  canvas: HTMLCanvasElement,
  progress: (s: string) => void,
  signal: AbortSignal,
): Promise<string> {
  progress("Loading Chinese text recognition…");
  let worker: Worker | undefined;
  const abort = () => {
    void cancelOcr();
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    worker = await createWorker(["chi_tra", "chi_sim", "eng"], 1, {
      logger: (m) => {
        if (!signal.aborted && m.status === "recognizing text")
          progress(`Reading card text · ${Math.round(m.progress * 100)}%`);
      },
    });
    if (signal.aborted) {
      await worker.terminate();
      throw new DOMException("Cancelled", "AbortError");
    }
    current = worker;
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
    });
    const results: string[] = [];
    for (const source of [canvas, enhance(canvas)]) {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const { data } = await worker.recognize(source);
      results.push(data.text);
    }
    // Chinese names often run vertically along the left edge of the card.
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    progress("Reading the vertical name…");
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK_VERT_TEXT,
    });
    const { data } = await worker.recognize(enhance(canvas), {
      rectangle: {
        left: 0,
        top: 0,
        width: Math.round(canvas.width * 0.32),
        height: Math.round(canvas.height * 0.72),
      },
    });
    results.push(data.text);
    return results.join("\n");
  } finally {
    signal.removeEventListener("abort", abort);
    if (worker && current === worker) {
      current = null;
      await worker.terminate();
    }
  }
}
