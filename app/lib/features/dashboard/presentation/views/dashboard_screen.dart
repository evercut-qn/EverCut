// lib/features/dashboard/presentation/views/dashboard_screen.dart

import 'package:flutter/material.dart';

import '../../../../core/constants/navigation/route_segments.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../core/theme/foundation/colors/dark_color_tokens.dart';
import '../../../../core/theme/foundation/colors/light_color_tokens.dart';
import '../../../../core/theme/presentation/widgets/theme_mode_builder.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/extensions/context/go_router_extension.dart';
import '../../../../shared/widgets/common/section/section_header.dart';
import '../../../ratings_and_reviews/presentation/views/ratings_and_reviews/widgets/rating_summary.dart';

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
                borderRadius: BorderRadius.circular(context.scale(12)),
                clipBehavior: Clip.hardEdge,
                color: context.appColors.backgroundShade100,
                child: AspectRatio(
                  aspectRatio: 1.25,
                  child: Stack(
                    children: [
                      Positioned.fill(child: Container()),
                      Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              colors: const [Colors.transparent, Colors.black54],
                              end: Alignment.bottomCenter,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        top: context.scale(24),
                        right: context.scale(24),
                        child: Icon(
                          AppIcons.solidRoundedNotification02,
                          color: context.appColors.neutralShade650,
                          size: context.scale(24),
                        ),
                      ),
                      Positioned(
                        left: 0,
                        bottom: 0,
                        right: 0,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Padding(
                              padding: EdgeInsets.all(context.scale(24)),
                              child: Text(
                                'Lorem Ipsum is simply dummy text of the printing industry.',
                                maxLines: 2,
                                style: TextStyle(
                                  color: LightColorTokens.scaffoldBackgroundColor,
                                  fontSize: context.scale(16),
                                  fontWeight: FontWeight.w700,
                                  overflow: TextOverflow.ellipsis,
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
                                    FilledButton(
                                      onPressed: () {},
                                      style: ButtonStyle(
                                        padding: WidgetStatePropertyAll(EdgeInsets.all(context.scale(20))),
                                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                        visualDensity: VisualDensity.compact,
                                      ),
                                      child: const Text('Open'),
                                    ),
                                    ThemeModeBuilder(
                                      builder: (BuildContext context, bool isDarkMode) {
                                        return OutlinedButton(
                                          onPressed: () {},
                                          style: ButtonStyle(
                                            padding: WidgetStatePropertyAll(
                                              EdgeInsets.all(context.scale(20)).copyWith(
                                                left: context.scale(16),
                                              ),
                                            ),
                                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                            visualDensity: VisualDensity.compact,
                                            side: WidgetStatePropertyAll(
                                              BorderSide(
                                                color: isDarkMode ? DarkColorTokens.neutralShade450 : LightColorTokens.neutralShade250,
                                              ),
                                            ),
                                          ),
                                          child: Row(
                                            spacing: context.scale(6),
                                            children: const [
                                              Icon(Icons.add),
                                              Text('Add Service'),
                                            ],
                                          ),
                                        );
                                      },
                                    ),
                                  ],
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
            const Divider(height: 1.0),
            Padding(
              padding: EdgeInsets.all(context.scale(24)),
              child: Column(
                spacing: context.scale(24),
                children: [
                  // const SectionHeader(
                  //   title: 'At a Glance',
                  //   description: 'Track revenue, manage appointments, and view important business insights at a glance.',
                  // ),
                  Column(
                    spacing: context.scale(24),
                    children: [
                      Row(
                        spacing: context.scale(24),
                        children: [
                          Expanded(
                            child: AspectRatio(
                              aspectRatio: 1.0,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                spacing: context.scale(24),
                                children: [
                                  Expanded(
                                    child: AspectRatio(
                                      aspectRatio: 2.0,
                                      child: Row(
                                        spacing: context.scale(24),
                                        children: [
                                          Expanded(
                                            child: AspectRatio(
                                              aspectRatio: 1.0,
                                              child: Material(
                                                clipBehavior: Clip.hardEdge,
                                                color: context.appColors.backgroundShade100,
                                                shape: CircleBorder(
                                                  side: BorderSide(
                                                    color: context.appColors.backgroundShade200,
                                                  ),
                                                ),
                                                child: InkWell(
                                                  onTap: () => context.pushNested(RouteSegments.rewards),
                                                  overlayColor: WidgetStatePropertyAll(context.appColors.backgroundShade200.withAlpha(127)),
                                                  child: Padding(
                                                    padding: EdgeInsets.all(context.scale(24)),
                                                    child: Center(
                                                      child: Icon(
                                                        AppIcons.solidRoundedStar,
                                                        color: context.appColors.orangeShade100,
                                                        size: context.scale(24),
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ),
                                          Expanded(
                                            child: AspectRatio(
                                              aspectRatio: 1.0,
                                              child: Material(
                                                clipBehavior: Clip.hardEdge,
                                                color: context.appColors.backgroundShade100,
                                                shape: CircleBorder(
                                                  side: BorderSide(
                                                    color: context.appColors.backgroundShade200,
                                                  ),
                                                ),
                                                child: InkWell(
                                                  onTap: () {},
                                                  overlayColor: WidgetStatePropertyAll(context.appColors.backgroundShade200.withAlpha(127)),
                                                  child: Padding(
                                                    padding: EdgeInsets.all(context.scale(24)),
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: AspectRatio(
                                      aspectRatio: 2.0,
                                      child: LayoutBuilder(
                                        builder: (BuildContext context, BoxConstraints constraints) {
                                          return Material(
                                            clipBehavior: Clip.hardEdge,
                                            color: context.appColors.backgroundShade100,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular((constraints.maxWidth - context.scale(24)) / 4),
                                              side: BorderSide(
                                                color: context.appColors.backgroundShade200,
                                              ),
                                            ),
                                            child: InkWell(
                                              onTap: () {},
                                              overlayColor: WidgetStatePropertyAll(context.appColors.backgroundShade200.withAlpha(127)),
                                              child: Padding(
                                                padding: EdgeInsets.all(context.scale(24)),
                                                child: Center(
                                                  child: Row(
                                                    spacing: context.scale(16),
                                                    children: [
                                                      Icon(
                                                        AppIcons.solidRoundedImage03,
                                                        color: context.appColors.greenShade100,
                                                        size: context.scale(24),
                                                      ),
                                                      Expanded(
                                                        child: Text(
                                                          'Gallery',
                                                          style: TextStyle(
                                                            color: context.appColors.neutralShade850,
                                                            fontSize: context.scale(14),
                                                            fontWeight: FontWeight.w700,
                                                          ),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ),
                                            ),
                                          );
                                        },
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          Expanded(
                            child: AspectRatio(
                              aspectRatio: 1.0,
                              child: LayoutBuilder(
                                builder: (BuildContext context, BoxConstraints constraints) {
                                  return Material(
                                    clipBehavior: Clip.hardEdge,
                                    color: context.appColors.backgroundShade100,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular((constraints.maxWidth - context.scale(24)) / 4),
                                      side: BorderSide(
                                        color: context.appColors.backgroundShade200,
                                      ),
                                    ),
                                    child: InkWell(
                                      onTap: () {},
                                      overlayColor: WidgetStatePropertyAll(context.appColors.backgroundShade200.withAlpha(127)),
                                      child: Padding(
                                        padding: EdgeInsets.all(context.scale(24)),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          spacing: context.scale(16),
                                          children: [
                                            Icon(
                                              AppIcons.solidRoundedAnalytics01,
                                              color: context.appColors.blueShade100,
                                              size: context.scale(24),
                                            ),
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              spacing: context.scale(4),
                                              children: [
                                                Text(
                                                  'Analytics',
                                                  style: TextStyle(
                                                    color: context.appColors.neutralShade850,
                                                    fontSize: context.scale(14),
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                                ),
                                                Text(
                                                  'Check revenue and trends quickly.',
                                                  maxLines: 2,
                                                  style: TextStyle(
                                                    color: context.appColors.neutralShade650,
                                                    fontSize: context.scale(12),
                                                    overflow: TextOverflow.ellipsis,
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
                              ),
                            ),
                          ),
                        ],
                      ),
                      LayoutBuilder(
                        builder: (BuildContext context, BoxConstraints constraints) {
                          return Material(
                            clipBehavior: Clip.hardEdge,
                            color: context.appColors.backgroundShade100,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular((constraints.maxWidth - context.scale(24)) / 8),
                              side: BorderSide(
                                color: context.appColors.backgroundShade200,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Padding(
                                  padding: EdgeInsets.all(context.scale(24)),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    spacing: context.scale(16),
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
                                      Icon(
                                        Icons.refresh,
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
                                              '24',
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
                                          Material(
                                            borderRadius: BorderRadius.circular(29.4),
                                            color: context.appColors.orangeShade100.withAlpha(31),
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
                                                    color: context.appColors.orangeShade100,
                                                    shape: const CircleBorder(),
                                                    child: SizedBox.square(
                                                      dimension: context.scale(6),
                                                    ),
                                                  ),
                                                  Text(
                                                    '14 PENDING',
                                                    style: TextStyle(
                                                      color: context.appColors.orangeShade100,
                                                      fontSize: context.scale(12),
                                                      fontWeight: FontWeight.w700,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                          Material(
                                            borderRadius: BorderRadius.circular(29.4),
                                            color: context.appColors.greenShade100.withAlpha(31),
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
                                                    color: context.appColors.greenShade100,
                                                    shape: const CircleBorder(),
                                                    child: SizedBox.square(
                                                      dimension: context.scale(6),
                                                    ),
                                                  ),
                                                  Text(
                                                    '06 DONE',
                                                    style: TextStyle(
                                                      color: context.appColors.greenShade100,
                                                      fontSize: context.scale(12),
                                                      fontWeight: FontWeight.w700,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                          Material(
                                            borderRadius: BorderRadius.circular(29.4),
                                            color: context.appColors.redShade100.withAlpha(31),
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
                                                    color: context.appColors.redShade100,
                                                    shape: const CircleBorder(),
                                                    child: SizedBox.square(
                                                      dimension: context.scale(6),
                                                    ),
                                                  ),
                                                  Text(
                                                    '04 CANCELED',
                                                    style: TextStyle(
                                                      color: context.appColors.redShade100,
                                                      fontSize: context.scale(12),
                                                      fontWeight: FontWeight.w700,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                DecoratedBox(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        context.appColors.orangeShade100.withAlpha(175),
                                        context.appColors.orangeShade100.withAlpha(175),
                                        context.appColors.greenShade100.withAlpha(175),
                                        context.appColors.greenShade100.withAlpha(175),
                                        context.appColors.redShade100.withAlpha(175),
                                        context.appColors.redShade100.withAlpha(175),
                                      ],
                                      stops: () {
                                        final total = 24.0;

                                        final v1 = 14.0;
                                        final v2 = 6.0;

                                        final s1 = v1 / total;
                                        final s2 = (v1 + v2) / total;

                                        return [0.0, s1, s1, s2, s2, 1.0];
                                      }(),
                                    ),
                                  ),
                                  child: Padding(padding: EdgeInsets.all(context.scale(12))),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Divider(height: 1.0),
            Padding(
              padding: EdgeInsets.all(context.scale(24)),
              child: Column(
                spacing: context.scale(18),
                children: [
                  Row(
                    spacing: context.scale(24),
                    children: [
                      Expanded(
                        child: const SectionHeader(
                          title: 'Shop Ratings',
                          description: 'Overview of ratings from verified clients who booked and visited this shop.',
                        ),
                      ),
                      IconButton(
                        onPressed: () {},
                        icon: Icon(
                          Icons.arrow_forward,
                          size: context.scale(20),
                        ),
                      ),
                    ],
                  ),
                  Material(
                    borderRadius: BorderRadius.circular(context.scale(12)),
                    color: context.appColors.backgroundShade100,
                    child: Padding(
                      padding: EdgeInsets.all(context.scale(24)),
                      child: const RatingSummary(),
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
