// lib/features/appointments/presentation/views/appointments_screen.dart

import 'package:flutter/material.dart';

import '../../../../core/constants/navigation/route_segments.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/extensions/context/go_router_extension.dart';
import '../widgets/employee.dart';
import '../widgets/pending_appointment.dart';
import '../widgets/todays_pulse.dart';

class AppointmentsScreen extends StatelessWidget {
  const AppointmentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(context.scale(24)).copyWith(bottom: context.scale(8)),
              child: TodaysPulseWidget(),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(context.scale(24)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: context.scale(24),
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    spacing: context.scale(24),
                    children: [
                      Expanded(
                        child: Text(
                          'Team Activity',
                          style: TextStyle(
                            color: context.appColors.neutralShade850,
                            fontSize: context.scale(18),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => context.pushNested(RouteSegments.teamActivity),
                        child: Text(
                          'VIEW ALL',
                          style: TextStyle(
                            color: context.appColors.greenShade100,
                            fontSize: context.scale(12),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  ListView.separated(
                    itemBuilder: (BuildContext context, int index) {
                      return EmployeeWidget(
                        isHighlighted: true,
                      );
                    },
                    itemCount: 2,
                    padding: EdgeInsets.zero,
                    physics: const NeverScrollableScrollPhysics(),
                    separatorBuilder: (BuildContext context, int index) {
                      return SizedBox(
                        height: context.scale(16),
                      );
                    },
                    shrinkWrap: true,
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Divider(
              color: context.appColors.backgroundShade200,
              height: 1.0,
            ),
          ),
          PinnedHeaderSliver(
            child: Material(
              color: context.appColors.backgroundShade50,
              shape: Border(
                bottom: BorderSide(
                  color: context.appColors.backgroundShade200,
                ),
              ),
              child: Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: context.scale(4),
                  children: [
                    Text(
                      'Pending Appointments',
                      style: TextStyle(
                        color: context.appColors.neutralShade850,
                        fontSize: context.scale(18),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      'Manage and review upcoming appointments, confirm schedules, or decline bookings quickly.',
                      style: TextStyle(
                        color: context.appColors.neutralShade650,
                        fontSize: context.scale(12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(context.scale(24)),
              child: Row(
                spacing: context.scale(16),
                children: List.generate(4, (int index) {
                  final isSelected = index == 0;
                  return Expanded(
                    child: Material(
                      borderRadius: BorderRadius.circular(context.scale(12)),
                      clipBehavior: Clip.hardEdge,
                      color: isSelected ? context.appColors.greenShade100 : context.appColors.backgroundShade100,
                      child: Padding(
                        padding: EdgeInsets.all(context.scale(12)),
                        child: Column(
                          spacing: context.scale(4),
                          children: [
                            Text(
                              'MON',
                              style: TextStyle(
                                color: isSelected ? context.appColors.neutralShade75 : context.appColors.neutralShade650,
                                fontSize: context.scale(12),
                              ),
                            ),
                            Text(
                              '16',
                              style: TextStyle(
                                color: isSelected ? context.appColors.neutralShade50 : context.appColors.neutralShade850,
                                fontSize: context.scale(18),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Divider(
              color: context.appColors.backgroundShade200,
              height: 1.0,
            ),
          ),
          PinnedHeaderSliver(
            child: Material(
              color: context.appColors.backgroundShade50,
              shape: Border(
                bottom: BorderSide(
                  color: context.appColors.backgroundShade200,
                ),
              ),
              child: Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Row(
                  spacing: context.scale(24),
                  children: [
                    Expanded(
                      child: Text(
                        'Today, 12 November',
                        style: TextStyle(
                          color: context.appColors.neutralShade850,
                          fontSize: context.scale(14),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    RichText(
                      text: TextSpan(
                        text: 'Total: ',
                        style: TextStyle(
                          color: context.appColors.neutralShade850,
                          fontFamily: 'DMSans',
                          fontSize: context.scale(14),
                          fontWeight: FontWeight.w600,
                        ),
                        children: <TextSpan>[
                          TextSpan(
                            text: '12',
                            style: TextStyle(
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          DecoratedSliver(
            decoration: BoxDecoration(color: context.appColors.backgroundShade75),
            sliver: SliverPadding(
              padding: EdgeInsets.all(context.scale(24)),
              sliver: SliverList.separated(
                itemBuilder: (BuildContext context, int index) {
                  return PendingAppointmentWidget();
                },
                itemCount: 7,
                separatorBuilder: (BuildContext context, int index) {
                  return SizedBox(
                    height: context.scale(16),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
