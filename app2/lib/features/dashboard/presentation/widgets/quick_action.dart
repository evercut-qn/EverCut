// lib/features/dashboard/presentation/widgets/quick_action.dart

import 'package:flutter/material.dart';

import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';

class QuickActionWidget extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final VoidCallback onTap;

  const QuickActionWidget({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      clipBehavior: Clip.hardEdge,
      color: context.appColors.backgroundShade75,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(context.scale(12)),
        side: BorderSide(color: context.appColors.backgroundShade200),
      ),
      child: InkWell(
        highlightColor: context.appColors.backgroundShade200.withAlpha(31),
        onTap: onTap,
        splashColor: context.appColors.backgroundShade200.withAlpha(63),
        child: Padding(
          padding: EdgeInsets.all(context.scale(12)),
          child: Row(
            spacing: context.scale(12),
            children: [
              Material(
                color: iconColor.withAlpha(31),
                shape: const CircleBorder(),
                child: Padding(
                  padding: EdgeInsets.all(context.scale(12)),
                  child: Icon(
                    icon,
                    color: iconColor,
                    size: context.scale(18),
                  ),
                ),
              ),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    color: context.appColors.neutralShade850,
                    fontSize: context.scale(12.75),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: context.appColors.neutralShade650,
                size: context.scale(18),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
