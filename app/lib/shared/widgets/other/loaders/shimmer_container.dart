// lib/shared/widgets/other/loaders/shimmer_container.dart

import 'package:flutter/material.dart';

import '../../../extensions/context/app_colors_extension.dart';
import '../../../extensions/context/device_metrics_extension.dart';

class ShimmerContainer extends StatelessWidget {
  final double? borderRadius;
  final Color? color;
  final double width;
  final double height;

  const ShimmerContainer({
    super.key,
    this.color,
    this.borderRadius,
    this.width = double.infinity,
    this.height = double.infinity,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      borderRadius: BorderRadius.circular(borderRadius ?? context.scale(4)),
      color: color ?? context.appColors.backgroundShade200,
      child: SizedBox(
        width: width,
        height: height,
      ),
    );
  }
}
