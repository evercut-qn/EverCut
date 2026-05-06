// lib/features/appointments/presentation/views/appointments_screen.dart

import 'package:flutter/material.dart';
import 'package:merchant/core/theme/foundation/app_icons.dart';

import '../../../../core/constants/navigation/route_segments.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/extensions/context/go_router_extension.dart';

class AppointmentStatus {
  final Color color;
  final String label;
  final VoidCallback onTap;

  const AppointmentStatus({
    required this.color,
    required this.label,
    required this.onTap,
  });
}

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  final Set<AppointmentStatus> _appointmentStatuses = <AppointmentStatus>{};

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_appointmentStatuses.isEmpty) {
      _appointmentStatuses.addAll(<AppointmentStatus>{
        AppointmentStatus(color: context.appColors.neutralShade850, label: 'All', onTap: () {}),
        AppointmentStatus(color: context.appColors.orangeShade100, label: 'Pending', onTap: () {}),
        AppointmentStatus(color: context.appColors.greenShade100, label: 'Done', onTap: () {}),
        AppointmentStatus(color: context.appColors.neutralShade850, label: 'Cancelled', onTap: () {}),
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: context.appColors.backgroundShade75,
      child: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(context.scale(24)).copyWith(bottom: context.scale(8)),
                child: Material(
                  clipBehavior: Clip.hardEdge,
                  color: context.appColors.backgroundShade50,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(context.scale(32)),
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
                            spacing: context.scale(8),
                            children: [
                              Padding(
                                padding: EdgeInsets.all(context.scale(24)).copyWith(left: 0),
                                child: SizedBox.square(
                                  dimension: context.scale(96),
                                  child: Stack(
                                    children: [
                                      Positioned.fill(
                                        child: CircularProgressIndicator(
                                          value: 0.85,
                                          strokeCap: StrokeCap.round,
                                          strokeWidth: context.scale(8),
                                        ),
                                      ),
                                      Center(
                                        child: Text(
                                          '888/888',
                                          textAlign: TextAlign.right,
                                          style: TextStyle(
                                            color: context.appColors.neutralShade850,
                                            fontSize: context.scale(14),
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
                                  padding: EdgeInsets.all(context.scale(24)).copyWith(right: 0),
                                  child: Column(
                                    spacing: context.scale(20),
                                    children: _appointmentStatuses.map((status) {
                                      return Row(
                                        spacing: context.scale(20),
                                        children: [
                                          Expanded(
                                            child: Row(
                                              spacing: context.scale(20),
                                              children: [
                                                Text(
                                                  status.label,
                                                  style: TextStyle(
                                                    color: status.color,
                                                    fontSize: context.scale(12),
                                                  ),
                                                ),
                                                Expanded(
                                                  child: Text(
                                                    '102',
                                                    textAlign: TextAlign.right,
                                                    style: TextStyle(
                                                      color: status.color,
                                                      fontSize: context.scale(12),
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          Icon(
                                            Icons.chevron_right,
                                            color: status.color,
                                            size: context.scale(18),
                                          ),
                                        ],
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
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(context.scale(24)).copyWith(bottom: context.scale(8)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: context.scale(24),
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      spacing: context.scale(24),
                      children: [
                        Text(
                          'Staff Availability',
                          style: TextStyle(
                            color: context.appColors.neutralShade850,
                            fontSize: context.scale(18),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          'VIEW ALL',
                          style: TextStyle(
                            color: context.appColors.greenShade100,
                            fontSize: context.scale(12),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    ListView.separated(
                      itemBuilder: (BuildContext context, int index) {
                        return Material(
                          clipBehavior: Clip.hardEdge,
                          color: context.appColors.backgroundShade50,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(context.scale(12)),
                            side: BorderSide(color: context.appColors.backgroundShade200),
                          ),
                          child: InkWell(
                            highlightColor: context.appColors.backgroundShade200.withAlpha(31),
                            onTap: () {},
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
                                              color: context.appColors.backgroundShade100,
                                              child: SizedBox.square(
                                                dimension: context.scale(48),
                                              ),
                                            ),
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
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
                                          color: context.appColors.neutralShade650.withAlpha(191),
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
            PinnedHeaderSliver(
              child: ColoredBox(
                color: context.appColors.backgroundShade75,
                child: Padding(
                  padding: EdgeInsets.all(context.scale(24)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    spacing: context.scale(24),
                    children: [
                      Text(
                        'Today\'s Queue',
                        style: TextStyle(
                          color: context.appColors.neutralShade850,
                          fontSize: context.scale(18),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Material(
                        borderRadius: BorderRadius.circular(context.scale(8)),
                        color: context.appColors.backgroundShade200.withAlpha(127),
                        child: Padding(
                          padding: EdgeInsets.all(context.scale(8)),
                          child: Row(
                            spacing: context.scale(8),
                            children: [
                              Material(
                                borderRadius: BorderRadius.circular(context.scale(8)),
                                color: context.appColors.greenShade100.withAlpha(191),
                                child: Padding(
                                  padding: EdgeInsets.all(context.scale(8)),
                                  child: Text(
                                    'ACTIVE',
                                    style: TextStyle(
                                      color: context.appColors.backgroundShade100,
                                      fontSize: context.scale(12),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                              Material(
                                borderRadius: BorderRadius.circular(context.scale(8)),
                                color: Colors.transparent,
                                child: Padding(
                                  padding: EdgeInsets.all(context.scale(8)),
                                  child: Text(
                                    'UPCOMING',
                                    style: TextStyle(
                                      color: context.appColors.neutralShade650,
                                      fontSize: context.scale(12),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SliverPadding(
              padding: EdgeInsets.all(context.scale(24)).copyWith(top: 0),
              sliver: SliverList.separated(
                itemBuilder: (BuildContext context, int index) {
                  return Material(
                    clipBehavior: Clip.hardEdge,
                    color: context.appColors.backgroundShade50,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(context.scale(12)),
                      side: BorderSide(color: context.appColors.backgroundShade200),
                    ),
                    child: InkWell(
                      highlightColor: context.appColors.backgroundShade200.withAlpha(31),
                      onTap: () => context.pushNested(RouteSegments.appointmentDetails),
                      splashColor: context.appColors.backgroundShade200.withAlpha(63),
                      child: Padding(
                        padding: EdgeInsets.all(context.scale(20)),
                        child: Row(
                          children: [
                            Expanded(
                              child: Row(
                                spacing: context.scale(16),
                                children: [
                                  Material(
                                    borderRadius: BorderRadius.circular(context.scale(12)),
                                    color: context.appColors.backgroundShade100,
                                    child: SizedBox.square(
                                      dimension: context.scale(48),
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    spacing: context.scale(2),
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
                      ),
                    ),
                  );
                },
                itemCount: 25,
                separatorBuilder: (BuildContext context, int index) {
                  return SizedBox(
                    height: context.scale(16),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
