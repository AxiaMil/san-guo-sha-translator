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
    (c["id"], c["id"], root / "assets" / c["image"].lstrip("/"))
    for c in cards
    if c["image"]
]
refs += [
    (s["base_id"], s["id"], root / "assets/images/generals" / f"{s['id']}.webp")
    for s in skins
    if s["base_id"] in lookup
]
ids = []
names = []
descriptors = []
points = []
shapes = []
owners = []
offsets = [0]
variants = []
seen = {}
for logical, name, file in refs:
    if not file.exists():
        continue
    im = cv2.imread(str(file))
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
