"""Verify original-art coverage and camera-like queries for the Shenmo additions."""
import json
import sys
from pathlib import Path
import cv2
import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from recognition.engine import database, match_image

ART = json.loads((ROOT / "assets/data/shenmo-artwork.json").read_text())["artworks"]
CAT = {c["id"]: c for c in json.loads((ROOT / "site/public/catalog.json").read_text())}


def test_shenmo_sources_and_mobile_images_are_complete():
    data, _ = database()
    indexed = {i for group in data["variants"] for i in json.loads(str(group))}
    assert len(ART) == 160
    assert sum(a["source_label"].startswith("BWIKI") for a in ART) == 134
    for art in ART:
        cid = art["card_id"]
        original = cv2.imread(str(ROOT / "assets/images/generals" / f"{cid}.webp"))
        assert list(original.shape[1::-1]) == art["source_dimensions"]
        assert len(art["source_sha256"]) == 64
        assert cid in indexed
        assert CAT[cid]["artwork_source"]["url"] == art["source_page"]
        thumbnail = ROOT / "assets" / CAT[cid]["thumbnail"].lstrip("/")
        assert thumbnail.stat().st_size < 50_000
        im = cv2.imread(str(thumbnail))
        assert im.shape[0] <= original.shape[0] and im.shape[1] <= original.shape[1]
        assert im.shape[0] <= 320 and im.shape[1] <= 240


@pytest.mark.parametrize("cid", ["SM_ps_shen_jiangwei", "SM_ps_devil_jiangwei", "SM_clan_zhonghui", "SM_ol_sb_zhugeliang", "SM_sb_guanyu", "SM_lx_wenqin"])
@pytest.mark.parametrize("condition", ["shadow", "perspective"])
def test_shenmo_camera_queries(cid, condition):
    im = cv2.imread(str(ROOT / "assets/images/generals" / f"{cid}.webp"))
    h, w = im.shape[:2]
    im = cv2.resize(im, (round(w * 700 / h), 700))
    h, w = im.shape[:2]
    if condition == "shadow":
        shade = np.linspace(.32, .85, w)[None, :, None]
        im = np.clip(im * shade * [.82, .93, 1.04], 0, 255).astype(np.uint8)
    else:
        src = np.float32([[0, 0], [w-1, 0], [w-1, h-1], [0, h-1]])
        dst = np.float32([[40, 30], [w-20, 65], [w-45, h-15], [15, h-70]])
        im = cv2.warpPerspective(im, cv2.getPerspectiveTransform(src, dst), (w, h), borderValue=(85, 80, 75))
    _, jpg = cv2.imencode(".jpg", im, [cv2.IMWRITE_JPEG_QUALITY, 83])
    result = match_image(cv2.imdecode(jpg, cv2.IMREAD_COLOR))
    assert result["candidates"], result
    top = result["candidates"][0]["id"]
    assert CAT[top].get("standard_id") == CAT[cid].get("standard_id"), result
    assert cid in [c["id"] for c in result["candidates"]], result
    if "ps_" in cid:
        assert top == cid, result
