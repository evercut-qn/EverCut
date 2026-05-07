// lib/features/dashboard/modules/team/presentation/widgets/employee_availability.dart

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';

class EmployeeAvailabilityWidget extends StatelessWidget {
  const EmployeeAvailabilityWidget({super.key});

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
          Padding(
            padding: EdgeInsets.all(context.scale(16)),
            child: Row(
              spacing: context.scale(16),
              children: [
                Material(
                  clipBehavior: Clip.hardEdge,
                  color: context.appColors.backgroundShade100,
                  shape: const CircleBorder(),
                  child: SizedBox.square(
                    dimension: context.scale(56),
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisAlignment: MainAxisAlignment.center,
                    spacing: context.scale(4),
                    children: [
                      Text(
                        'John Doe',
                        style: TextStyle(
                          color: context.appColors.neutralShade850,
                          fontSize: context.scale(14),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      GestureDetector(
                        onTap: () async {
                          final uri = Uri(scheme: 'tel', path: '+919876543210');
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri);
                          }
                        },
                        child: Row(
                          spacing: context.scale(4.75),
                          children: [
                            Text(
                              '+91 98765 43210',
                              style: TextStyle(
                                color: context.appColors.blueShade100,
                                fontSize: context.scale(12),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Icon(
                              AppIcons.solidRoundedArrowUpRight01,
                              color: context.appColors.blueShade100,
                              size: context.scale(12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.more_vert,
                  color: context.appColors.neutralShade850,
                  size: context.scale(20),
                ),
              ],
            ),
          ),
          Divider(
            color: context.appColors.backgroundShade200,
            height: 1.0,
          ),
          Padding(
            padding: EdgeInsets.all(context.scale(16)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: context.scale(16),
              children: [
                Text(
                  'Choose when the employee is available.',
                  style: TextStyle(
                    color: context.appColors.neutralShade650,
                    fontSize: context.scale(12),
                  ),
                ),
                ListView.separated(
                  clipBehavior: Clip.hardEdge,
                  itemBuilder: (BuildContext context, int index) {
                    return Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      spacing: context.scale(16),
                      children: [
                        Expanded(
                          child: Row(
                            spacing: context.scale(12),
                            children: [
                              Icon(
                                AppIcons.solidRoundedCalendar02,
                                color: context.appColors.neutralShade650,
                                size: context.scale(24),
                              ),
                              Expanded(
                                child: Text(
                                  '31st July',
                                  style: TextStyle(
                                    color: context.appColors.neutralShade650,
                                    fontSize: context.scale(13.25),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(
                          width: context.scale(40),
                          height: context.scale(30),
                          child: FittedBox(
                            fit: BoxFit.fill,
                            child: Switch(
                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              onChanged: (value) {},
                              padding: EdgeInsets.zero,
                              value: false,
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                  itemCount: 4,
                  padding: EdgeInsets.zero,
                  physics: const NeverScrollableScrollPhysics(),
                  separatorBuilder: (BuildContext context, int index) {
                    return Padding(
                      padding: EdgeInsets.symmetric(vertical: context.scale(16)),
                      child: Divider(
                        color: context.appColors.backgroundShade200,
                        height: 1.0,
                        indent: context.scale(36),
                      ),
                    );
                  },
                  shrinkWrap: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
