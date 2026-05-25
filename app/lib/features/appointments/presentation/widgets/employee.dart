// lib/features/appointments/presentation/widgets/employee.dart

import 'package:flutter/material.dart';

import '../../../../core/constants/navigation/route_segments.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/extensions/context/go_router_extension.dart';

class EmployeeWidget extends StatelessWidget {
  final bool isHighlighted;

  const EmployeeWidget({
    super.key,
    this.isHighlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      clipBehavior: Clip.hardEdge,
      color: isHighlighted ? context.appColors.backgroundShade75 : context.appColors.backgroundShade50,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(context.scale(12)),
        side: BorderSide(color: context.appColors.backgroundShade200),
      ),
      child: InkWell(
        highlightColor: context.appColors.backgroundShade200.withAlpha(31),
        onTap: () => context.pushNested(RouteSegments.employeeAppointments),
        splashColor: context.appColors.backgroundShade200.withAlpha(63),
        child: Padding(
          padding: EdgeInsets.all(context.scale(20)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: context.scale(24),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                spacing: context.scale(16),
                children: [
                  Expanded(
                    child: Row(
                      spacing: context.scale(16),
                      children: [
                        Material(
                          borderRadius: BorderRadius.circular(context.scale(12)),
                          color: isHighlighted ? context.appColors.backgroundShade200 : context.appColors.backgroundShade100,
                          child: SizedBox.square(
                            dimension: context.scale(56),
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          spacing: context.scale(4),
                          children: [
                            Text(
                              'Ram',
                              style: TextStyle(
                                color: context.appColors.neutralShade850,
                                fontSize: context.scale(14),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              'Master Barber',
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
                  Text(
                    '4 / 6 DONE',
                    style: TextStyle(
                      color: context.appColors.neutralShade650,
                      fontSize: context.scale(12),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: context.scale(12),
                children: [
                  const LinearProgressIndicator(value: 0.67),
                  Text(
                    '2 APPOINTMENTS LEFT',
                    textAlign: TextAlign.right,
                    style: TextStyle(
                      color: context.appColors.neutralShade650,
                      fontSize: context.scale(12),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
