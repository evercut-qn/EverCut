// lib/features/settings/presentation/widgets/settings_section.dart

import 'package:flutter/material.dart';

import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';

part 'settings_tile.dart';

class SettingsSectionWidget extends StatelessWidget {
  final String title;
  final List<SettingsTileWidget> tiles;

  const SettingsSectionWidget({
    super.key,
    required this.title,
    required this.tiles,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: context.scale(12),
      children: [
        Text(
          title,
          style: TextStyle(
            color: context.appColors.neutralShade650,
            fontSize: context.scale(14),
            fontWeight: FontWeight.w600,
          ),
        ),
        Column(
          spacing: context.scale(2),
          children: tiles,
        ),
      ],
    );
  }
}
