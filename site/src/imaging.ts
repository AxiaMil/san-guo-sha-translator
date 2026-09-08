import type { PixelCrop } from "react-image-crop";
export async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}
export function canvasOf(
  image: HTMLImageElement,
  crop?: PixelCrop,
  rotation = 0,
  max = 1400,
) {
  const factor = image.naturalWidth / image.width;
  const sx = crop ? crop.x * factor : 0,
    sy = crop ? crop.y * factor : 0,
    sw = crop ? crop.width * factor : image.naturalWidth,
    sh = crop ? crop.height * factor : image.naturalHeight;
  const scale = Math.min(1, max / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  const sideways = rotation % 180 !== 0;
  canvas.width = Math.max(1, Math.round((sideways ? sh : sw) * scale));
  canvas.height = Math.max(1, Math.round((sideways ? sw : sh) * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(
    image,
    sx,
    sy,
    sw,
    sh,
    (-sw * scale) / 2,
    (-sh * scale) / 2,
    sw * scale,
    sh * scale,
  );
  return canvas;
}
export function enhance(source: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.data.length; i += 4) {
    hist[
      Math.round(
        0.299 * data.data[i] +
          0.587 * data.data[i + 1] +
          0.114 * data.data[i + 2],
      )
    ]++;
  }
  const total = canvas.width * canvas.height;
  let sum = 0,
    lo = 0,
    hi = 255;
  for (let i = 0; i < 256; i++) {
    sum += hist[i];
    if (sum < total * 0.02) lo = i;
    if (sum < total * 0.98) hi = i;
  }
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.max(
      0,
      Math.min(
        255,
        ((0.299 * data.data[i] +
          0.587 * data.data[i + 1] +
          0.114 * data.data[i + 2] -
          lo) *
          255) /
          Math.max(20, hi - lo),
      ),
    );
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}
