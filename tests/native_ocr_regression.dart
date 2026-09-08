import '../lib/core/services/scanner_ocr_normalizer.dart';

void check(bool value, String description) {
  if (!value) throw StateError(description);
}

void main() {
  check(
    ScannerOcrNormalizer.normaliseId('ＳＨＵ-ＯＯ１') == 'SHU001',
    'Full-width ID',
  );
  check(
    ScannerOcrNormalizer.normaliseId('LE OO5 skin1') == 'LE005SKIN1',
    'Skin suffix must survive',
  );
  check(
    ScannerOcrNormalizer.normaliseId('WEI OO1 beta') == 'WEI001BETA',
    'Beta suffix must survive',
  );
  check(
    ScannerOcrNormalizer.normaliseId('QUN 1O3') == 'QUN103',
    'Numeric OCR confusion',
  );
  final names = ScannerOcrNormalizer.joinVerticalNames(const [
    OcrNameFragment('備', 11, 44, 20, 20),
    OcrNameFragment('劉', 10, 20, 20, 20),
    OcrNameFragment('牌', 100, 44, 20, 20),
    OcrNameFragment('殺', 100, 20, 20, 20),
  ]);
  check(
    names.contains('劉備'),
    'Join top-to-bottom name despite OCR block ordering',
  );
  check(!names.contains('劉殺備牌'), 'Do not merge adjacent columns');
  check(
    ScannerOcrNormalizer.joinVerticalNames(const [
      OcrNameFragment('劉', 10, 20, 20, 20),
      OcrNameFragment('備', 10, 150, 20, 20),
    ]).isEmpty,
    'Do not bridge unrelated distant glyphs',
  );
  check(
    ScannerOcrNormalizer.joinVerticalNames(const [
      OcrNameFragment('殺', 10, 20, 20, 20),
    ]).isEmpty,
    'Reject single glyph',
  );
  print('8 native OCR regression checks passed.');
}
