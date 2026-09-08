"""Build mobile display copies; recognition continues to use native originals."""
from pathlib import Path
import cv2

root = Path(__file__).resolve().parents[1] / "assets/images"
count = 0
for folder in ["generals", "library"]:
    for source in sorted((root / folder).glob("*.webp")):
        image = cv2.imread(str(source))
        if image is None:
            raise ValueError(f"Invalid artwork: {source}")
        h, w = image.shape[:2]
        for kind, width, height, quality in [("thumbnails", 240, 320, 88), ("previews", 768, 1024, 90)]:
            scale = min(1, width / w, height / h)
            output = root / kind / folder / source.name
            if scale == 1 and source.stat().st_size < 160_000:
                continue
            if output.exists() and output.stat().st_mtime >= source.stat().st_mtime:
                continue
            output.parent.mkdir(parents=True, exist_ok=True)
            resized = cv2.resize(image, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA) if scale < 1 else image
            if not cv2.imwrite(str(output), resized, [cv2.IMWRITE_WEBP_QUALITY, quality]):
                raise RuntimeError(f"Could not write {output}")
            count += 1
print(f"Built {count} mobile artwork copies without upscaling")
