import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import cv2
import numpy as np
import pytest
from recognition.engine import match_image

ROOT = Path(__file__).resolve().parents[1]


def photo(card):
    file = ROOT / "assets/images/generals" / f"{card}.webp"
    return cv2.imread(str(file))


def variant(im, kind):
    h, w = im.shape[:2]
    if kind == "dim":
        return np.clip(im.astype(float) * 0.22 + 4, 0, 255).astype("uint8")
    if kind == "bright":
        return np.clip(im.astype(float) * 1.5 + 15, 0, 255).astype("uint8")
    if kind == "warm":
        return np.clip(im.astype(float) * [0.55, 0.8, 1.2], 0, 255).astype("uint8")
    if kind == "shadow":
        return np.clip(
            im.astype(float) * np.linspace(0.15, 1, w)[None, :, None], 0, 255
        ).astype("uint8")
    if kind == "glare":
        copy = im.copy()
        cv2.ellipse(
            copy, (w // 2, h // 3), (w // 7, h // 7), 30, 0, 360, (255, 255, 255), -1
        )
        return copy
    if kind == "rotate":
        return cv2.rotate(im, cv2.ROTATE_90_CLOCKWISE)
    if kind == "blur":
        return cv2.GaussianBlur(im, (5, 5), 1.2)
    if kind == "perspective":
        src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
        dst = np.float32(
            [
                [w * 0.24, h * 0.13],
                [w * 1.05, h * 0.25],
                [w * 0.98, h * 1.15],
                [w * 0.07, h * 0.98],
            ]
        )
        return cv2.warpPerspective(
            im,
            cv2.getPerspectiveTransform(src, dst),
            (int(w * 1.3), int(h * 1.3)),
            borderValue=(80, 95, 90),
        )
    return im


@pytest.mark.parametrize(
    "card", ["SHU001", "SHU002", "WEI001", "WU001", "LE005", "JX_SHU027"]
)
@pytest.mark.parametrize(
    "kind",
    [
        "original",
        "dim",
        "bright",
        "warm",
        "shadow",
        "glare",
        "rotate",
        "blur",
        "perspective",
    ],
)
def test_artwork_lighting(card, kind):
    result = match_image(variant(photo(card), kind))
    assert result["candidates"], (card, kind, result)
    assert result["candidates"][0]["id"] == card, (card, kind, result)


@pytest.mark.parametrize("kind", ["black", "white", "noise", "gradient"])
def test_noncard_rejected(kind):
    rng = np.random.default_rng(41)
    im = np.zeros((600, 400, 3), np.uint8)
    if kind == "white":
        im[:] = 255
    if kind == "noise":
        im = rng.integers(0, 256, im.shape, dtype=np.uint8)
    if kind == "gradient":
        im[:] = np.arange(400)[None, :, None] % 255
    assert match_image(im)["candidates"] == []


def test_shared_art_preserves_faction_choices():
    result = match_image(photo("WEI&WU074"))
    ids = {c["id"] for c in result["candidates"]}
    assert {"WEI&WU074", "WEI&WU074--Wu"} <= ids
    assert not result["strong"]


def test_skin_resolves_to_base_general():
    result = match_image(photo("LE005_skin1"))
    assert result["candidates"][0]["id"] == "LE005"


def test_playing_card_artwork():
    im = cv2.imread(str(ROOT / "assets/images/library/basic_kill.webp"))
    assert (
        match_image(variant(im, "perspective"))["candidates"][0]["id"] == "basic_kill"
    )


def test_full_card_with_dense_skill_text():
    """Synthetic illustration + name + skill box; not a real-phone benchmark."""
    image = cv2.imread(str(ROOT / "tests/fixtures/limit-break-liu-bei.webp"))
    # Exercise the same resize/JPEG path as a phone upload.
    height, width = image.shape[:2]
    image = cv2.resize(image, (round(width * 1400 / height), 1400))
    _, encoded = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 88])
    result = match_image(cv2.imdecode(encoded, cv2.IMREAD_COLOR))
    assert result["candidates"], result
    assert result["candidates"][0]["id"] == "JX_SHU001", result
