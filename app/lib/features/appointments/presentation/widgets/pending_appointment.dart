// lib/features/appointments/presentation/widgets/pending_appointment.dart

import 'package:flutter/material.dart';

import '../../../../core/constants/navigation/route_segments.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/extensions/context/go_router_extension.dart';

class PendingAppointmentWidget extends StatelessWidget {
  const PendingAppointmentWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Material(
      clipBehavior: Clip.hardEdge,
      color: context.appColors.backgroundShade50,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(context.scale(12)),
        side: BorderSide(color: context.appColors.backgroundShade200),
      ),
      child: Column(
        children: [
          InkWell(
            highlightColor: context.appColors.backgroundShade200.withAlpha(31),
            onTap: () => context.pushNested(RouteSegments.appointmentDetails),
            splashColor: context.appColors.backgroundShade200.withAlpha(63),
            child: Padding(
              padding: EdgeInsets.all(context.scale(20)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: context.scale(20),
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Row(
                          spacing: context.scale(16),
                          children: [
                            Material(
                              borderRadius: BorderRadius.circular(context.scale(12)),
                              color: context.appColors.backgroundShade100,
                              child: SizedBox.square(
                                dimension: context.scale(56),
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              spacing: context.scale(4),
                              children: [
                                Text(
                                  'Julian Thorne',
                                  style: TextStyle(
                                    color: context.appColors.neutralShade850,
                                    fontSize: context.scale(14),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Row(
                                  spacing: context.scale(6),
                                  children: [
                                    Icon(
                                      AppIcons.solidRoundedUserAccount,
                                      color: context.appColors.neutralShade650,
                                      size: context.scale(16),
                                    ),
                                    Text(
                                      'Ram Goswami',
                                      style: TextStyle(
                                        color: context.appColors.neutralShade650,
                                        fontSize: context.scale(12),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '11:30 AM',
                        style: TextStyle(
                          color: context.appColors.neutralShade650,
                          fontSize: context.scale(12),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Divider(
            color: context.appColors.backgroundShade200,
            height: 1.0,
          ),
          IntrinsicHeight(
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    highlightColor: context.appColors.backgroundShade200.withAlpha(31),
                    onTap: () {},
                    splashColor: context.appColors.backgroundShade200.withAlpha(63),
                    child: Padding(
                      padding: EdgeInsets.all(context.scale(18)),
                      child: Center(
                        child: Text(
                          'Reject',
                          style: TextStyle(
                            color: context.appColors.redShade100,
                            fontSize: context.scale(12.75),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.symmetric(vertical: context.scale(12)),
                  child: VerticalDivider(
                    color: context.appColors.backgroundShade200,
                    width: 1.0,
                  ),
                ),
                Expanded(
                  child: InkWell(
                    highlightColor: context.appColors.backgroundShade200.withAlpha(31),
                    onTap: () {},
                    splashColor: context.appColors.backgroundShade200.withAlpha(63),
                    child: Padding(
                      padding: EdgeInsets.all(context.scale(18)),
                      child: Center(
                        child: Text(
                          'Accept',
                          style: TextStyle(
                            color: context.appColors.neutralShade650,
                            fontSize: context.scale(12.75),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
