// lib/features/settings/modules/manage_account/presentation/widgets/profile_info_tile.dart

import 'package:flutter/material.dart';

import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';

class ProfileInfoTileWidget extends StatelessWidget {
  final IconData icon;
  final String text;

  const ProfileInfoTileWidget({
    super.key,
    required this.icon,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      spacing: context.scale(16),
      children: [
        Icon(
          icon,
          color: context.appColors.neutralShade650,
          size: context.scale(18),
        ),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            style: TextStyle(
              color: context.appColors.neutralShade650,
              fontSize: context.scale(14),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ),
      ],
    );
  }
}
