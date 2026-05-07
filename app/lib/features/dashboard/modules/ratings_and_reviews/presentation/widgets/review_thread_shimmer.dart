// lib/features/dashboard/modules/ratings_and_reviews/presentation/widgets/review_thread_shimmer.dart

import 'package:flutter/material.dart';

import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/widgets/other/loaders/shimmer_container.dart';

class ReviewThreadShimmerWidget extends StatelessWidget {
  const ReviewThreadShimmerWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: context.scale(16),
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: context.scale(16),
          children: [
            Row(
              spacing: context.scale(16),
              children: [
                ShimmerContainer(
                  borderRadius: context.scale(28),
                  width: context.scale(56),
                  height: context.scale(56),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: context.scale(4),
                    children: [
                      ShimmerContainer(height: context.scale(18.3)),
                      IntrinsicHeight(
                        child: Row(
                          spacing: context.scale(8),
                          children: [
                            ShimmerContainer(
                              width: context.scale(78),
                              height: context.scale(15.4),
                            ),
                            Padding(
                              padding: EdgeInsets.all(context.scale(2)),
                              child: VerticalDivider(
                                color: context.appColors.backgroundShade650,
                                width: 1.0,
                              ),
                            ),
                            ShimmerContainer(
                              width: context.scale(78),
                              height: context.scale(15.4),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox.square(
                  dimension: context.scale(48),
                  child: Center(
                    child: ShimmerContainer(
                      width: context.scale(16),
                      height: context.scale(16),
                    ),
                  ),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: context.scale(4),
              children: [
                ShimmerContainer(height: context.scale(15.4)),
                ShimmerContainer(
                  width: context.scale(225),
                  height: context.scale(15.4),
                ),
              ],
            ),
          ],
        ),
        Material(
          clipBehavior: Clip.hardEdge,
          color: context.appColors.backgroundShade75,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(context.scale(6)),
            side: BorderSide(color: context.appColors.backgroundShade200),
          ),
          child: Padding(
            padding: EdgeInsets.all(context.scale(16)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: context.scale(12),
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  spacing: context.scale(16),
                  children: [
                    ShimmerContainer(
                      width: context.scale(125),
                      height: context.scale(14.85),
                    ),
                    ShimmerContainer(
                      width: context.scale(75),
                      height: context.scale(11.95),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: context.scale(4),
                  children: [
                    ShimmerContainer(height: context.scale(15.4)),
                    ShimmerContainer(
                      width: context.scale(225),
                      height: context.scale(15.4),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
