// lib/shared/widgets/other/loaders/shimmer_container.dart

import 'package:flutter/material.dart';

import '../../../extensions/context/app_colors_extension.dart';
import '../../../extensions/context/device_metrics_extension.dart';

class ShimmerContainer extends StatelessWidget {
  final double borderRadius;
  final Color? color;
  final double width;
  final double height;

  const ShimmerContainer({
    super.key,
    this.color,
    this.borderRadius = 4,
    this.width = double.infinity,
    this.height = double.infinity,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: context.scale(width),
      height: context.scale(height),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(context.scale(borderRadius)),
        color: color ?? context.appColors.neutralShade800,
      ),
    );
  }
}
