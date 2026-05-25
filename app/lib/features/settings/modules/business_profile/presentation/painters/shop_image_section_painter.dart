// lib/features/settings/modules/business_profile/presentation/painters/shop_image_section.dart

import 'package:flutter/material.dart';

import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../utils/shop_image_section_path.dart';

class ShopImageSectionPainter extends CustomPainter {
  final BuildContext context;

  const ShopImageSectionPainter(
    this.context, {
    super.repaint,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final Path path = shopImageSectionPath(context, size);

    final fillPaint = Paint();

    fillPaint.color = context.appColors.backgroundShade75;
    fillPaint.style = PaintingStyle.fill;

    canvas.drawPath(path, fillPaint);

    final paint = Paint();

    paint.color = context.appColors.backgroundShade200;
    paint.style = PaintingStyle.stroke;
    paint.strokeWidth = context.scale(2);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return false;
  }
}
