// lib/shared/painters/dashed_border.dart

import 'package:flutter/material.dart';

import '../models/circular_interval_list.dart';

class DashedBorderPainter extends CustomPainter {
  final Color color;
  final double? borderRadius;
  final List<double>? dashPattern;
  final StrokeCap? strokeCap;
  final double? strokeWidth;

  const DashedBorderPainter({
    this.borderRadius,
    required this.color,
    this.dashPattern,
    this.strokeCap,
    this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint();

    paint.color = color;
    paint.strokeCap = strokeCap ?? StrokeCap.round;
    paint.strokeWidth = strokeWidth ?? 1;
    paint.style = PaintingStyle.stroke;

    final path = _getDashPath(
      path: _getPath(size),
      dashArray: CircularIntervalListModel(dashPattern ?? [3, 1]),
    );

    canvas.drawPath(path, paint);
  }

  Path _getPath(Size size) {
    if (borderRadius != null && borderRadius! > 0) {
      return Path()..addRRect(
        RRect.fromRectAndCorners(
          Rect.fromLTWH(0, 0, size.width, size.height),
          topLeft: Radius.circular(borderRadius!),
          topRight: Radius.circular(borderRadius!),
          bottomLeft: Radius.circular(borderRadius!),
          bottomRight: Radius.circular(borderRadius!),
        ),
      );
    } else {
      return Path()..addRect(
        Rect.fromLTWH(
          0,
          0,
          size.width,
          size.height,
        ),
      );
    }
  }

  Path _getDashPath({
    required Path path,
    required CircularIntervalListModel dashArray,
  }) {
    final dashedPath = Path();

    for (final pathMetric in path.computeMetrics()) {
      double distance = 0;
      bool drawPath = true;

      while (distance < pathMetric.length) {
        final length = dashArray.next;

        if (drawPath) {
          dashedPath.addPath(
            pathMetric.extractPath(
              distance,
              distance + length,
            ),
            Offset.zero,
          );
        }

        distance += length;
        drawPath = !drawPath;
      }
    }

    return dashedPath;
  }

  @override
  bool shouldRepaint(covariant DashedBorderPainter oldDelegate) {
    return (oldDelegate.borderRadius != borderRadius) ||
        (oldDelegate.color != color) ||
        (oldDelegate.dashPattern != dashPattern) ||
        (oldDelegate.strokeCap != strokeCap) ||
        (oldDelegate.strokeWidth != strokeWidth);
  }
}
