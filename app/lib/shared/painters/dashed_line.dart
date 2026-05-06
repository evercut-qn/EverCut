// lib/shared/painters/dashed_line.dart

import 'package:flutter/material.dart';

class _CircularIntervalList<T> {
  List values;
  int index = 0;

  _CircularIntervalList(this.values);

  dynamic get next {
    final currentValue = values[index];
    index = (index + 1) % values.length;
    return currentValue;
  }
}

class DashedLinePainter extends CustomPainter {
  final Color color;
  final List<double>? dashPattern;
  final StrokeCap? strokeCap;
  final double? strokeWidth;
  final bool? isHorizontal;

  const DashedLinePainter({
    required this.color,
    this.dashPattern,
    this.strokeCap,
    this.strokeWidth,
    this.isHorizontal,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint();

    paint.color = color;
    paint.strokeCap = strokeCap ?? StrokeCap.round;
    paint.strokeWidth = strokeWidth ?? 2;
    paint.style = PaintingStyle.stroke;

    final path = _getDashPath(
      path: _getLinePath(size),
      dashArray: _CircularIntervalList(dashPattern ?? [5, 3]),
    );

    canvas.drawPath(path, paint);
  }

  Path _getLinePath(Size size) {
    final path = Path();

    if (isHorizontal != null && isHorizontal == true) {
      path.moveTo(0, size.height / 2);
      path.lineTo(size.width, size.height / 2);
    } else {
      path.moveTo(size.width / 2, 0);
      path.lineTo(size.width / 2, size.height);
    }

    return path;
  }

  Path _getDashPath({
    required Path path,
    required _CircularIntervalList dashArray,
  }) {
    final dashedPath = Path();

    for (final pathMetric in path.computeMetrics()) {
      double distance = 0;
      bool drawSegment = true;

      while (distance < pathMetric.length) {
        final length = dashArray.next;

        if (drawSegment) {
          dashedPath.addPath(
            pathMetric.extractPath(distance, distance + length),
            Offset.zero,
          );
        }

        distance += length;
        drawSegment = !drawSegment;
      }
    }

    return dashedPath;
  }

  @override
  bool shouldRepaint(covariant DashedLinePainter oldDelegate) {
    return (oldDelegate.color != color) ||
        (oldDelegate.dashPattern != dashPattern) ||
        (oldDelegate.strokeCap != strokeCap) ||
        (oldDelegate.strokeWidth != strokeWidth) ||
        (oldDelegate.isHorizontal != isHorizontal);
  }
}
