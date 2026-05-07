// lib/features/settings/modules/notifications/presentation/widgets/notification_preferences.dart

import 'package:flutter/material.dart';

import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';

part 'notification_tile.dart';

class NotificationPreferencesWidget extends StatelessWidget {
  final String title;
  final String description;
  final List<NotificationTileWidget> tiles;

  const NotificationPreferencesWidget({
    super.key,
    required this.title,
    required this.description,
    required this.tiles,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: context.scale(18),
      children: [
        SectionHeader(
          title: title,
          description: description,
        ),
        Material(
          clipBehavior: Clip.hardEdge,
          color: context.appColors.backgroundShade75,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(context.scale(12)),
            side: BorderSide(color: context.appColors.backgroundShade200),
          ),
          child: Padding(
            padding: EdgeInsets.all(context.scale(12)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: context.scale(8),
              children: tiles.asMap().entries.expand((entry) {
                final List<Widget> widgets = [entry.value];
                if (entry.key < tiles.length - 1) {
                  widgets.add(
                    Divider(
                      color: context.appColors.backgroundShade200,
                      height: 1.0,
                      indent: context.scale(52),
                    ),
                  );
                }
                return widgets;
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }
}
