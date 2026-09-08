"""Artwork provenance and recognition of the newly illustrated deck references."""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from recognition.engine import match_image, database

ARTWORK = json.loads((ROOT / "assets/data/deck-artwork.json").read_text())["artworks"]


def test_every_import_retains_native_dimensions_and_deck_evidence():
    catalog = {card["id"]: card for card in json.loads((ROOT / "site/public/catalog.json").read_text())}
    data, _ = database()
    indexed = {identity for group in data["variants"] for identity in json.loads(str(group))}
    assert len(ARTWORK) == 21
    for art in ARTWORK:
        image = cv2.imread(str(ROOT / "assets/images/generals" / f"{art['card_id']}.webp"))
        assert list(image.shape[1::-1]) == art["source_dimensions"]
        assert min(art["source_dimensions"]) >= 350
        assert len(art["source_sha256"]) == 64
        assert art["verification"]["deck_id"] == "dark-gold-e-2026"
        assert 0 < art["verification"]["time_seconds"] < 267
        assert art["card_id"] in indexed
        assert catalog[art["card_id"]]["artwork_source"]["url"] == art["source_page"]


@pytest.mark.parametrize("art", ARTWORK, ids=lambda art: art["card_id"])
def test_new_general_after_camera_resize_and_jpeg(art):
    image = cv2.imread(str(ROOT / "assets/images/generals" / f"{art['card_id']}.webp"))
    # Different pixels from the index: phone-sized JPEG with a warm shadow.
    height, width = image.shape[:2]
    image = cv2.resize(image, (round(width * 700 / height), 700))
    shade = np.linspace(.35, .9, image.shape[1])[None, :, None]
    image = np.clip(image * shade * [0.8, 0.9, 1.05], 0, 255).astype(np.uint8)
    _, jpeg = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 85])
    result = match_image(cv2.imdecode(jpeg, cv2.IMREAD_COLOR))
    assert result["candidates"], result
    assert result["candidates"][0]["id"] == art["card_id"], result
