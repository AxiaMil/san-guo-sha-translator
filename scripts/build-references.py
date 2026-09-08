"""Regenerate ORB reference bundle; identical art retains all faction variants."""

import sys, json, hashlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import cv2
import numpy as np
from recognition.engine import features

root = Path(__file__).resolve().parents[1]
cards = json.loads((root / "site/public/catalog.json").read_text())
skins = json.loads((root / "assets/data/generals/skin.json").read_text())
lookup = {c["id"]: c for c in cards}
refs = [
    (c["id"], c["id"], root / "assets" / c["image"].lstrip("/"), None)
    for c in cards
    if c["image"]
]
refs += [
    (s["base_id"], s["id"], root / "assets/images/generals" / f"{s['id']}.webp", None)
    for s in skins
    if s["base_id"] in lookup
]
# Alternate portrait framing is cropped from the same native original. It
# improves recognition when the printed card shows only part of a full scene.
artworks = [art for file in ["deck-artwork.json", "shenmo-artwork.json"]
            for art in json.loads((root / "assets/data" / file).read_text())["artworks"]]
for art in artworks:
    for i, crop in enumerate(art["reference_crops"]):
        refs.append((art["card_id"], f"{art['card_id']}:portrait-{i + 1}",
                     root / "assets/images/generals" / f"{art['card_id']}.webp", crop))
    # Smaller native views cover cards whose artwork occupies few camera pixels.
    # Keep the same geometric acceptance thresholds; never manufacture detail.
    for scale in art.get("reference_scales", []):
        if not 0 < scale < 1:
            raise ValueError(f"Invalid reference scale: {art['card_id']}")
        refs.append((art["card_id"], f"{art['card_id']}:scale-{scale}",
                     root / "assets/images/generals" / f"{art['card_id']}.webp", {"scale": scale}))
ids = []
names = []
descriptors = []
points = []
shapes = []
owners = []
offsets = [0]
variants = []
seen = {}
for logical, name, file, crop in refs:
    if not file.exists():
        continue
    im = cv2.imread(str(file))
    if isinstance(crop, dict):
        im = cv2.resize(im, None, fx=crop["scale"], fy=crop["scale"], interpolation=cv2.INTER_AREA)
    elif crop:
        x, y, width, height = crop
        if x < 0 or y < 0 or width < 60 or height < 60 or x + width > im.shape[1] or y + height > im.shape[0]:
            raise ValueError(f"Invalid reference crop: {name}")
        im = im[y:y + height, x:x + width]
    digest = hashlib.sha256(im.tobytes()).hexdigest()
    if digest in seen:
        group = variants[seen[digest]]
        if logical not in group:
            group.append(logical)
        continue
    pts, desc, shape = features(im, 450)
    if desc is None or len(desc) < 10:
        continue
    seen[digest] = len(ids)
    variants.append([logical])
    owners.extend([len(ids)] * len(desc))
    ids.append(logical)
    names.append(name)
    descriptors.append(desc)
    points.append(pts)
    shapes.append(shape)
    offsets.append(offsets[-1] + len(desc))
np.savez_compressed(
    root / "recognition/references.npz",
    ids=ids,
    references=names,
    variants=[json.dumps(v) for v in variants],
    descriptors=np.concatenate(descriptors),
    points=np.concatenate(points),
    shapes=shapes,
    owners=np.array(owners, dtype=np.int32),
    offsets=offsets,
)
print(f"{len(refs)} artworks, {len(ids)} unique references, {offsets[-1]} features")
