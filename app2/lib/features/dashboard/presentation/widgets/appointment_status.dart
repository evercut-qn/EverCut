// lib/features/dashboard/presentation/widgets/appointment_status.dart

import 'package:flutter/material.dart';

import '../../../../shared/extensions/context/device_metrics_extension.dart';

class AppointmentStatusWidget extends StatelessWidget {
  final Color color;
  final String label;

  const AppointmentStatusWidget({
    super.key,
    required this.color,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      borderRadius: BorderRadius.circular(29.4),
      clipBehavior: Clip.hardEdge,
      color: color.withAlpha(31),
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: context.scale(16),
          vertical: context.scale(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          spacing: context.scale(8),
          children: [
            Material(
              color: color,
              shape: const CircleBorder(),
              child: SizedBox.square(
                dimension: context.scale(6),
              ),
            ),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: context.scale(12),
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
