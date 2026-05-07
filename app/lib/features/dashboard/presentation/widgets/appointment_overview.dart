// lib/features/dashboard/presentation/widgets/appointment_overview.dart

import 'package:flutter/material.dart';

import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';

import 'appointment_status.dart';

class AppointmentOverviewWidget extends StatelessWidget {
  final List<int> appointments;
  final VoidCallback onRefreshButtonTap;

  const AppointmentOverviewWidget({
    super.key,
    required this.appointments,
    required this.onRefreshButtonTap,
  }) : assert(appointments.length == 3, 'appointments list must have exactly 3 items');

  @override
  Widget build(BuildContext context) {
    return Material(
      clipBehavior: Clip.hardEdge,
      color: context.appColors.backgroundShade75,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(context.scale(12)),
        side: BorderSide(color: context.appColors.backgroundShade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.all(context.scale(24)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              spacing: context.scale(24),
              children: [
                Expanded(
                  child: Text(
                    'Appointment Overview',
                    maxLines: 1,
                    style: TextStyle(
                      color: context.appColors.neutralShade850,
                      fontSize: context.scale(14),
                      fontWeight: FontWeight.w700,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: onRefreshButtonTap,
                  child: Icon(
                    Icons.refresh,
                    color: context.appColors.neutralShade850,
                    size: context.scale(20),
                  ),
                ),
              ],
            ),
          ),
          Divider(
            color: context.appColors.backgroundShade200,
            height: 1.0,
          ),
          Padding(
            padding: EdgeInsets.all(context.scale(24)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: context.scale(32),
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: context.scale(12),
                    children: [
                      Text(
                        'TOTAL TODAY',
                        style: TextStyle(
                          color: context.appColors.neutralShade850,
                          fontSize: context.scale(12),
                          fontWeight: FontWeight.w700,
                          height: 1.0,
                        ),
                      ),
                      Text(
                        '${appointments.reduce((a, b) => a + b)}',
                        style: TextStyle(
                          fontSize: context.scale(36),
                          fontWeight: FontWeight.w700,
                          height: 1.0,
                        ),
                      ),
                    ],
                  ),
                ),
                Wrap(
                  runSpacing: context.scale(12),
                  spacing: context.scale(12),
                  children: [
                    AppointmentStatusWidget(
                      color: context.appColors.orangeShade100,
                      label: '${appointments.elementAt(0)} PENDING',
                    ),
                    AppointmentStatusWidget(
                      color: context.appColors.greenShade100,
                      label: '${appointments.elementAt(1)} COMPLETED',
                    ),
                    AppointmentStatusWidget(
                      color: context.appColors.redShade100,
                      label: '${appointments.elementAt(2)} CANCELLED',
                    ),
                  ],
                ),
              ],
            ),
          ),
          Row(
            children: [
              Expanded(
                flex: appointments.elementAt(0),
                child: ColoredBox(
                  color: context.appColors.orangeShade100.withAlpha(175),
                  child: SizedBox(
                    height: context.scale(24),
                  ),
                ),
              ),
              Expanded(
                flex: appointments.elementAt(1),
                child: ColoredBox(
                  color: context.appColors.greenShade100.withAlpha(175),
                  child: SizedBox(
                    height: context.scale(24),
                  ),
                ),
              ),
              Expanded(
                flex: appointments.elementAt(2),
                child: ColoredBox(
                  color: context.appColors.redShade100.withAlpha(175),
                  child: SizedBox(
                    height: context.scale(24),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
