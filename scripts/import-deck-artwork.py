"""Import reviewed original artwork without resizing or adding invented detail.

Sources and byte hashes are pinned in assets/data/deck-artwork.json. The optional
--source-dir reuses downloaded originals after the same hash/dimension checks.
"""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

import cv2
import numpy as np

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--source-dir", type=Path)
args = parser.parse_args()
manifest = json.loads((root / "assets/data/deck-artwork.json").read_text())
for item in manifest["artworks"]:
    cached = args.source_dir / item["source_file"] if args.source_dir else None
    if cached and cached.exists():
        raw = cached.read_bytes()
    else:
        request = Request(item["source_url"], headers={"User-Agent": "SHA card artwork importer"})
        with urlopen(request, timeout=30) as response:
            raw = response.read()
    if hashlib.sha256(raw).hexdigest() != item["source_sha256"]:
        raise ValueError(f"Source changed: {item['card_id']}; review before importing")
    image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if image is None or list(image.shape[1::-1]) != item["source_dimensions"]:
        raise ValueError(f"Invalid source image: {item['card_id']}")
    output = root / "assets/images/generals" / f"{item['card_id']}.webp"
    # OpenCV's >100 WebP quality selects lossless encoding. Keep native pixels.
    if not cv2.imwrite(str(output), image, [cv2.IMWRITE_WEBP_QUALITY, 101]):
        raise RuntimeError(f"Could not write {output}")
    decoded = cv2.imread(str(output))
    if not np.array_equal(decoded, image):
        raise ValueError(f"Lossless verification failed: {item['card_id']}")
    print(f"{item['card_id']}: {image.shape[1]} × {image.shape[0]} (lossless)")
