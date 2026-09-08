/// Pure OCR repair helpers, shared by the native scanner and regression harness.
/// Never fuzzy-match a single Chinese glyph as a general name.
abstract final class ScannerOcrNormalizer {
  static String normaliseId(String text) {
    // Full-width Latin letters and digits occupy a contiguous Unicode range.
    final ascii = String.fromCharCodes(
      text.runes.map((r) => r >= 0xFF01 && r <= 0xFF5E ? r - 0xFEE0 : r),
    );
    final cleaned = ascii.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    // Repair only the numeric serial, not SKIN/BETA or a later faction prefix.
    return cleaned.replaceAllMapped(
      RegExp(r'(WEI|SHU|WU|QUN|LE|GOD)([0-9OILZSB]{2,3})(?=SKIN|BETA|$)'),
      (m) =>
          '${m[1]}${m[2]!.replaceAllMapped(RegExp(r'[OILZSB]'), (d) => const {'O': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8'}[d[0]]!)}',
    );
  }

  static List<String> joinVerticalNames(List<OcrNameFragment> fragments) {
    final single =
        fragments
            .where((f) => RegExp(r'^[\u3400-\u9fff]$').hasMatch(f.text))
            .toList()
          ..sort((a, b) => a.y.compareTo(b.y));
    final used = <int>{};
    final names = <String>[];
    for (var i = 0; i < single.length; i++) {
      if (used.contains(i)) continue;
      var last = single[i];
      final group = <int>[i];
      final word = StringBuffer(last.text);
      for (var j = i + 1; j < single.length && group.length < 5; j++) {
        if (used.contains(j)) continue;
        final next = single[j];
        final width = (last.width + next.width) / 2;
        final height = (last.height + next.height) / 2;
        final dx = ((last.x + last.width / 2) - (next.x + next.width / 2))
            .abs();
        final gap = next.y - (last.y + last.height);
        if (dx <= width * 0.6 && gap >= -height * 0.25 && gap <= height * 1.2) {
          word.write(next.text);
          group.add(j);
          last = next;
        }
      }
      if (group.length >= 2) {
        used.addAll(group);
        names.add(word.toString());
      }
    }
    return names;
  }
}

class OcrNameFragment {
  final String text;
  final double x, y, width, height;
  const OcrNameFragment(this.text, this.x, this.y, this.width, this.height);
}
