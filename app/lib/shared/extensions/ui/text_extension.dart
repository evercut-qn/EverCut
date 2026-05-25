// lib/shared/extensions/ui/text_extension.dart

import 'package:flutter/widgets.dart';

extension TextExtension on String {
  double width(TextStyle style) {
    final textPainter = TextPainter(
      text: TextSpan(text: this, style: style),
      maxLines: 1,
      textDirection: TextDirection.ltr,
    )..layout();
    return textPainter.width;
  }
}
