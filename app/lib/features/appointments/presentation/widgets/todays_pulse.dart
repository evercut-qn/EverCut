// lib/features/appointments/presentation/widgets/todays_pulse.dart

import 'package:flutter/material.dart';

import '../../../../core/constants/navigation/route_segments.dart';
import '../../../../shared/enums/appointment_status.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/extensions/context/go_router_extension.dart';

class TodaysPulseWidget extends StatelessWidget {
  const TodaysPulseWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Material(
      clipBehavior: Clip.hardEdge,
      color: context.appColors.backgroundShade75,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(context.scale(24)),
        side: BorderSide(color: context.appColors.backgroundShade200),
      ),
      child: Padding(
        padding: EdgeInsets.all(context.scale(32)),
        child: Column(
          spacing: context.scale(32),
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: context.scale(18),
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: context.scale(6),
                  children: [
                    Text(
                      'TODAY\'S PULSE',
                      style: TextStyle(
                        color: context.appColors.neutralShade650,
                        fontSize: context.scale(14),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      'Executive Performance',
                      style: TextStyle(
                        color: context.appColors.neutralShade850,
                        fontSize: context.scale(32),
                        fontWeight: FontWeight.w900,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
                Text(
                  'Real-Time occupancy and revenue trajectory for your studio.',
                  style: TextStyle(
                    color: context.appColors.neutralShade850,
                    fontSize: context.scale(16),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            IntrinsicHeight(
              child: Row(
                spacing: context.scale(24),
                children: [
                  Padding(
                    padding: EdgeInsets.symmetric(vertical: context.scale(16)),
                    child: SizedBox.square(
                      dimension: context.scale(90),
                      child: Stack(
                        children: [
                          Positioned.fill(
                            child: CircularProgressIndicator(
                              value: 0.85,
                              strokeCap: StrokeCap.round,
                              strokeWidth: context.scale(6),
                            ),
                          ),
                          Center(
                            child: Text(
                              '888/888',
                              textAlign: TextAlign.right,
                              style: TextStyle(
                                color: context.appColors.neutralShade850,
                                fontSize: context.scale(12.75),
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.25,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  VerticalDivider(
                    color: context.appColors.backgroundShade200,
                    width: 1.0,
                  ),
                  Expanded(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: context.scale(16)),
                      child: Column(
                        spacing: context.scale(16),
                        children: AppointmentStatusEnum.values.where((status) => status != AppointmentStatusEnum.pending).map((status) {
                          return GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: () => context.pushNested(
                              RouteSegments.appointmentsList,
                              extra: {'status': status},
                            ),
                            child: Row(
                              spacing: context.scale(16),
                              children: [
                                Expanded(
                                  child: Row(
                                    spacing: context.scale(16),
                                    children: [
                                      Text(
                                        status.label,
                                        style: TextStyle(
                                          color: status.color(context),
                                          fontSize: context.scale(12),
                                        ),
                                      ),
                                      Expanded(
                                        child: Text(
                                          '888',
                                          textAlign: TextAlign.right,
                                          style: TextStyle(
                                            color: status.color(context),
                                            fontSize: context.scale(12),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(
                                  Icons.chevron_right,
                                  color: status.color(context),
                                  size: context.scale(18),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
