"""Lighting-normalized local artwork matching. Images are never persisted."""

from pathlib import Path
from collections import Counter
from functools import lru_cache
import threading
import json
import cv2
import numpy as np

cv2.setNumThreads(1)
LOCK = threading.Lock()
INDEX = Path(__file__).with_name("references.npz")


def features(image, count=1000):
    h, w = image.shape[:2]
    image = cv2.resize(
        image, (round(w * min(1, 900 / max(h, w))), round(h * min(1, 900 / max(h, w))))
    )
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    orb = cv2.ORB_create(
        nfeatures=count, scaleFactor=1.2, nlevels=8, edgeThreshold=15, fastThreshold=10
    )
    points, descriptors = orb.detectAndCompute(gray, None)
    return np.float32([p.pt for p in points]).reshape(-1, 2), descriptors, gray.shape


@lru_cache(maxsize=1)
def database():
    # Materialize once: NpzFile indexing re-inflates the compressed array on
    # every access, including every keypoint in the geometric verification.
    with np.load(INDEX, allow_pickle=False) as bundle:
        data = {name: bundle[name] for name in bundle.files}
    descriptors = data["descriptors"]
    matcher = cv2.FlannBasedMatcher(
        dict(algorithm=6, table_number=12, key_size=16, multi_probe_level=2), {}
    )
    matcher.add([descriptors])
    matcher.train()
    return data, matcher


def match_image(image):
    if image is None or min(image.shape[:2]) < 60:
        raise ValueError("Image is too small. Use a clear photo of the whole card.")
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    quality = {
        "brightness": round(float(gray.mean()), 1),
        "contrast": round(float(gray.std()), 1),
        "sharpness": round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 1),
    }
    if gray.std() < 4:
        return {
            "candidates": [],
            "quality": quality,
            "guidance": "No card detail found. Add light and bring the card into focus.",
        }
    points, descriptors, shape = features(image)
    if descriptors is None or len(descriptors) < 12:
        return {
            "candidates": [],
            "quality": quality,
            "guidance": "Move closer and hold the phone steady.",
        }
    with LOCK:
        data, matcher = database()
        neighbors = matcher.knnMatch(descriptors, k=2)
    # Global local-feature votes are insensitive to where the card sits in the photo.
    votes = Counter(
        int(data["owners"][m.trainIdx])
        for pair in neighbors
        if len(pair) == 2
        for m, n in [pair]
        if m.distance < 0.83 * n.distance and m.distance < 68
    )
    results = []
    bf = cv2.BFMatcher(cv2.NORM_HAMMING)
    for index, _ in votes.most_common(18):
        start, end = data["offsets"][index : index + 2]
        ref_desc = data["descriptors"][start:end]
        pairs = bf.knnMatch(descriptors, ref_desc, k=2)
        good = [
            m
            for pair in pairs
            if len(pair) == 2
            for m, n in [pair]
            if m.distance < 0.76 * n.distance and m.distance < 64
        ]
        # Unique reference points prevent repeated borders/text from looking like a match.
        unique = {m.trainIdx: m for m in sorted(good, key=lambda m: -m.distance)}
        good = list(unique.values())
        if len(good) < 9:
            continue
        src = np.float32([data["points"][start + m.trainIdx] for m in good])
        dst = np.float32([points[m.queryIdx] for m in good])
        matrix, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
        if matrix is None or mask is None or not np.isfinite(matrix).all():
            continue
        inliers = int(mask.sum())
        ratio = inliers / len(good)
        if inliers < 9 or ratio < 0.38:
            continue
        selected = src[mask.ravel().astype(bool)]
        rh, rw = data["shapes"][index]
        coverage = cv2.contourArea(cv2.convexHull(selected)) / (rw * rh)
        if coverage < 0.035:
            continue
        corners = np.float32([[0, 0], [rw, 0], [rw, rh], [0, rh]]).reshape(-1, 1, 2)
        projected = cv2.perspectiveTransform(corners, matrix)
        area = abs(cv2.contourArea(projected))
        if (
            not cv2.isContourConvex(projected)
            or area < shape[0] * shape[1] * 0.015
            or area > shape[0] * shape[1] * 4
        ):
            continue
        # Ranking evidence, deliberately not presented as a probability of correctness.
        score = min(
            1.0,
            0.45 * min(inliers / 55, 1) + 0.30 * ratio + 0.25 * min(coverage / 0.35, 1),
        )
        for logical_id in json.loads(str(data["variants"][index])):
            results.append(
                {
                    "id": logical_id,
                    "reference": str(data["references"][index]),
                    "score": round(score, 4),
                    "inliers": inliers,
                    "coverage": round(coverage, 3),
                    "method": "artwork",
                }
            )
    results.sort(key=lambda c: (c["score"], c["inliers"]), reverse=True)
    dedup = {}
    for r in results:
        if r["id"] not in dedup:
            dedup[r["id"]] = r
    candidates = list(dedup.values())[:5]
    strong = bool(
        candidates
        and candidates[0]["score"] >= 0.72
        and candidates[0]["inliers"] >= 18
        and (
            len(candidates) == 1
            or candidates[0]["score"] - candidates[1]["score"] >= 0.08
        )
    )
    return {
        "candidates": candidates,
        "strong": strong,
        "quality": quality,
        "guidance": "Check the artwork and edition before opening."
        if candidates
        else "No reliable artwork match. Try text recognition or crop closer to the card.",
    }
