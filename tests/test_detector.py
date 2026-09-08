"""Synthetic camera geometry regressions, not a real-phone accuracy benchmark."""
from pathlib import Path
import cv2
import numpy as np
import pytest
from recognition.detector import card_crops
from recognition.engine import match_image


def scene():
    image = cv2.imread(str(Path(__file__).parent / 'fixtures/limit-break-liu-bei.webp'))
    h, w = image.shape[:2]
    source = np.float32([[0, 0], [w-1, 0], [w-1, h-1], [0, h-1]])
    target = np.float32([[310, 130], [1040, 260], [930, 1490], [130, 1330]])
    return cv2.warpPerspective(image, cv2.getPerspectiveTransform(source, target), (1300, 1700), borderValue=(55, 62, 70)), target


@pytest.mark.parametrize('condition', ['normal', 'dim', 'rotated', 'upside_down', 'shadow'])
def test_detected_card_matches_artwork_without_ocr(condition):
    image, expected = scene()
    if condition == 'dim':
        image = np.clip(image * .24 + 4, 0, 255).astype('uint8')
    if condition == 'rotated':
        image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    if condition == 'upside_down':
        image = cv2.rotate(image, cv2.ROTATE_180)
    if condition == 'shadow':
        image = np.clip(image * np.linspace(.25, 1, image.shape[1])[None, :, None], 0, 255).astype('uint8')
    crops = card_crops(image)
    assert 1 <= len(crops) <= 2
    assert max(crops[0][0].shape[:2]) <= 1200
    if condition == 'normal':
        found = np.float32(crops[0][1]) * [1300, 1700]
        assert np.linalg.norm(found - expected, axis=1).max() < 15
    result = match_image(image)
    assert result['candidates'], result
    assert result['candidates'][0]['id'] == 'JX_SHU001', result
    assert result['candidates'][0]['method'] == 'artwork'
    assert result['candidates'][0].get('card_outline'), result


def test_rectangle_is_not_identity():
    image = np.full((1000, 800, 3), 40, np.uint8)
    cv2.rectangle(image, (170, 100), (640, 850), (225, 225, 225), -1)
    assert card_crops(image)
    assert match_image(image)['candidates'] == []
