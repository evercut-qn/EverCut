// lib/features/dashboard/presentation/views/dashboard_screen.dart

import 'package:flutter/material.dart';

import '../../../../core/constants/navigation/route_segments.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/extensions/context/go_router_extension.dart';
import '../../../../shared/widgets/common/section/section_header.dart';
import '../../modules/ratings_and_reviews/presentation/widgets/rating_summary.dart';
import '../widgets/appointment_overview.dart';
import '../widgets/quick_action.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        child: Column(
          children: [
            Padding(
              padding: EdgeInsets.all(context.scale(24)),
              child: Material(
                clipBehavior: Clip.hardEdge,
                color: context.appColors.backgroundShade75,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(context.scale(12)),
                  side: BorderSide(color: context.appColors.backgroundShade200),
                ),
                child: AspectRatio(
                  aspectRatio: 1.25,
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: Material(
                          color: Colors.transparent,
                        ),
                      ),
                      Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              colors: const [Colors.transparent, Colors.black54],
                              end: Alignment.bottomCenter,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Expanded(
                                child: Padding(
                                  padding: EdgeInsets.all(context.scale(24)),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.stretch,
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    spacing: context.scale(24),
                                    children: [
                                      Align(
                                        alignment: Alignment.topRight,
                                        child: GestureDetector(
                                          behavior: HitTestBehavior.opaque,
                                          onTap: () => context.pushNested(RouteSegments.notifications),
                                          child: Icon(
                                            AppIcons.solidRoundedNotification02,
                                            color: context.appColors.neutralShade650,
                                            size: context.scale(24),
                                          ),
                                        ),
                                      ),
                                      Text(
                                        'Lorem Ipsum is simply dummy text of the printing industry.',
                                        maxLines: 2,
                                        style: TextStyle(
                                          color: Colors.white.withAlpha(207),
                                          fontSize: context.scale(16),
                                          fontWeight: FontWeight.w700,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              Material(
                                color: Colors.black12,
                                child: Padding(
                                  padding: EdgeInsets.all(context.scale(16)),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    spacing: context.scale(16),
                                    children: [
                                      Expanded(
                                        child: Material(
                                          clipBehavior: Clip.hardEdge,
                                          color: Colors.white.withAlpha(207),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(context.scale(8)),
                                            side: BorderSide(color: Colors.white.withAlpha(207)),
                                          ),
                                          child: InkWell(
                                            highlightColor: Colors.white.withAlpha(223),
                                            onTap: () {},
                                            splashColor: Colors.white.withAlpha(239),
                                            child: Padding(
                                              padding: EdgeInsets.all(context.scale(12)),
                                              child: Row(
                                                mainAxisAlignment: MainAxisAlignment.center,
                                                spacing: context.scale(8),
                                                children: [
                                                  Icon(
                                                    AppIcons.solidRoundedStore03,
                                                    color: context.appColors.greenShade100,
                                                    size: context.scale(18),
                                                  ),
                                                  Text(
                                                    'Open Shop',
                                                    style: TextStyle(
                                                      color: context.appColors.greenShade100,
                                                      fontSize: context.scale(12),
                                                      fontWeight: FontWeight.w600,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                      Expanded(
                                        child: Material(
                                          clipBehavior: Clip.hardEdge,
                                          color: Colors.transparent,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(context.scale(8)),
                                            side: BorderSide(color: Colors.white.withAlpha(207)),
                                          ),
                                          child: InkWell(
                                            highlightColor: Colors.white.withAlpha(31),
                                            onTap: () {},
                                            splashColor: Colors.white.withAlpha(47),
                                            child: Padding(
                                              padding: EdgeInsets.all(context.scale(12)),
                                              child: Row(
                                                mainAxisAlignment: MainAxisAlignment.center,
                                                spacing: context.scale(8),
                                                children: [
                                                  Icon(
                                                    AppIcons.solidRoundedPlusSign,
                                                    color: Colors.white.withAlpha(207),
                                                    size: context.scale(18),
                                                  ),
                                                  Text(
                                                    'Add Service',
                                                    style: TextStyle(
                                                      color: Colors.white.withAlpha(207),
                                                      fontSize: context.scale(12),
                                                      fontWeight: FontWeight.w600,
                                                    ),
                                                  ),
                                                ],
                                              ),
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
                    ],
                  ),
                ),
              ),
            ),
            Divider(
              color: context.appColors.backgroundShade200,
              height: 1.0,
            ),
            Padding(
              padding: EdgeInsets.all(context.scale(24)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: context.scale(16),
                children: [
                  Text(
                    'Quick Actions',
                    style: TextStyle(
                      color: context.appColors.neutralShade650,
                      fontSize: context.scale(14),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: context.scale(16),
                    children: [
                      Row(
                        spacing: context.scale(16),
                        children: [
                          Expanded(
                            child: QuickActionWidget(
                              icon: AppIcons.solidRoundedGift,
                              iconColor: context.appColors.yellowShade100,
                              label: 'Rewards',
                              onTap: () => context.pushNested(RouteSegments.rewards),
                            ),
                          ),
                          Expanded(
                            child: QuickActionWidget(
                              icon: AppIcons.solidRoundedUserGroup,
                              iconColor: context.appColors.purpleShade100,
                              label: 'Team',
                              onTap: () => context.pushNested(RouteSegments.team),
                            ),
                          ),
                        ],
                      ),
                      Row(
                        spacing: context.scale(16),
                        children: [
                          Expanded(
                            child: QuickActionWidget(
                              icon: AppIcons.solidRoundedImage03,
                              iconColor: context.appColors.greenShade100,
                              label: 'Gallery',
                              onTap: () => context.pushNested(RouteSegments.gallery),
                            ),
                          ),
                          Expanded(
                            child: QuickActionWidget(
                              icon: AppIcons.solidRoundedAnalytics01,
                              iconColor: context.appColors.blueShade100,
                              label: 'Analytics',
                              onTap: () => context.pushNested(RouteSegments.analytics),
                            ),
                          ),
                        ],
                      ),
                      AppointmentOverviewWidget(
                        appointments: const [25, 15, 5],
                        onRefreshButtonTap: () {},
                      ),
                    ],
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
                spacing: context.scale(18),
                children: [
                  Row(
                    spacing: context.scale(24),
                    children: [
                      const Expanded(
                        child: SectionHeader(
                          title: 'Shop Ratings',
                          description: 'Overview of ratings from verified clients who booked and visited this shop.',
                        ),
                      ),
                      IconButton(
                        onPressed: () => context.pushNested(RouteSegments.ratingsAndReviews),
                        icon: Icon(
                          Icons.arrow_forward,
                          size: context.scale(20),
                        ),
                      ),
                    ],
                  ),
                  Material(
                    clipBehavior: Clip.hardEdge,
                    color: context.appColors.backgroundShade75,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(context.scale(12)),
                      side: BorderSide(color: context.appColors.backgroundShade200),
                    ),
                    child: Padding(
                      padding: EdgeInsets.all(context.scale(24)),
                      child: RatingSummaryWidget(
                        rating: 3.5,
                        ratingCount: 6417439,
                        ratingDistribution: [0.10, 0.35, 0.5, 0.85, 0.68],
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
