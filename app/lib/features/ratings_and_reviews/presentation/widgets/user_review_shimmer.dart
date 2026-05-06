// lib/features/ratings_and_reviews/presentation/widgets/user_review_shimmer.dart

import 'package:flutter/material.dart';

import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/widgets/other/loaders/shimmer_container.dart';

class UserReviewShimmer extends StatelessWidget {
  const UserReviewShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      spacing: context.scale(12),
      children: [
        Row(
          spacing: context.scale(12),
          children: [
            ShimmerContainer(
              borderRadius: context.scale(24),
              width: 48,
              height: 48,
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: context.scale(4),
                children: [
                  ShimmerContainer(
                    width: 225,
                    height: 18.3,
                  ),
                  IntrinsicHeight(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [
                        ShimmerContainer(
                          width: 78,
                          height: 15.4,
                        ),
                        VerticalDivider(
                          color: context.appColors.neutralShade800,
                          endIndent: context.scale(2),
                          indent: context.scale(2),
                        ),
                        ShimmerContainer(
                          width: 78,
                          height: 15.4,
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
                  width: 18,
                  height: 18,
                ),
              ),
            ),
          ],
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: context.scale(4),
          children: [
            ShimmerContainer(
              width: double.infinity,
              height: 15.4,
            ),
            ShimmerContainer(
              width: 225,
              height: 15.4,
            ),
          ],
        ),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(context.scale(6)),
            color: context.appColors.neutralShade50.withAlpha(25),
          ),
          padding: EdgeInsets.all(context.scale(12)),
          child: Column(
            spacing: context.scale(8),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                spacing: context.scale(12),
                children: [
                  ShimmerContainer(
                    width: 125,
                    height: 15.85,
                  ),
                  ShimmerContainer(
                    width: 125,
                    height: 13.95,
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: context.scale(4),
                children: [
                  ShimmerContainer(
                    width: double.infinity,
                    height: 15.4,
                  ),
                  ShimmerContainer(
                    width: 225,
                    height: 15.4,
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
