// lib/shared/widgets/common/section/section_header.dart

import 'package:flutter/material.dart';

import '../../../extensions/context/app_colors_extension.dart';
import '../../../extensions/context/device_metrics_extension.dart';

class SectionHeader extends StatelessWidget {
  final String title;
  final String description;

  const SectionHeader({
    super.key,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: context.scale(4),
      children: [
        Text(
          title,
          style: TextStyle(
            color: context.appColors.neutralShade850,
            fontSize: context.scale(14.5),
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          description,
          style: TextStyle(
            color: context.appColors.neutralShade650,
            fontSize: context.scale(12),
          ),
        ),
      ],
    );
  }
}
