"""Bounded card-outline proposals using OpenCV, without model weights.

An outline is only a crop proposal. Artwork must still pass feature matching
and geometric verification; a rectangular object is never a card identity.
"""
import cv2
import numpy as np


def card_crops(image):
    height, width = image.shape[:2]
    scale = min(1, 1000 / max(height, width))
    small = cv2.resize(image, (round(width * scale), round(height * scale)))
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(gray, 35, 110)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    proposals = []
    frame_area = small.shape[0] * small.shape[1]
    # Examine the largest contours first and bound work on textured tables.
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:80]:
        area = cv2.contourArea(contour)
        if not 0.08 * frame_area < area < 0.94 * frame_area:
            continue
        quad = cv2.approxPolyDP(contour, 0.025 * cv2.arcLength(contour, True), True)
        if len(quad) != 4 or not cv2.isContourConvex(quad):
            continue
        points = quad.reshape(4, 2).astype(np.float32)
        center = points.mean(axis=0)
        points = points[np.argsort(np.arctan2(points[:, 1] - center[1], points[:, 0] - center[0]))]
        points = np.roll(points, -np.argmin(points.sum(axis=1)), axis=0)
        lengths = np.linalg.norm(points - np.roll(points, -1, axis=0), axis=1)
        if lengths.min() < 60 or lengths.max() / lengths.min() > 3:
            continue
        w, h = (lengths[0] + lengths[2]) / 2, (lengths[1] + lengths[3]) / 2
        if not 0.43 <= min(w, h) / max(w, h) <= 0.88:
            continue
        # Suppress nested outlines of the same card; keep at most two proposals.
        if any(cv2.intersectConvexConvex(points, previous)[0] / min(area, cv2.contourArea(previous)) > 0.75 for previous in proposals):
            continue
        proposals.append(points)
        if len(proposals) == 2:
            break
    crops = []
    for points in proposals:
        source = points / scale
        lengths = np.linalg.norm(source - np.roll(source, -1, axis=0), axis=1)
        w, h = max(lengths[0], lengths[2]), max(lengths[1], lengths[3])
        resize = min(1, 1200 / max(w, h))
        w, h = max(60, round(w * resize)), max(60, round(h * resize))
        destination = np.float32([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]])
        matrix = cv2.getPerspectiveTransform(source, destination)
        crop = cv2.warpPerspective(image, matrix, (w, h))
        if crop.shape[1] > crop.shape[0]:
            crop = cv2.rotate(crop, cv2.ROTATE_90_CLOCKWISE)
        crops.append((crop, (source / [width, height]).round(4).tolist()))
    return crops
