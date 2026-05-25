// lib/features/dashboard/modules/ratings_and_reviews/presentation/widgets/rating_summary.dart

import 'package:flutter/material.dart';

import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/utils/formatters/number.dart';

import 'star_rating.dart';

class RatingSummaryWidget extends StatelessWidget {
  final double rating;
  final int ratingCount;
  final List<double> ratingDistribution;

  const RatingSummaryWidget({
    super.key,
    required this.rating,
    required this.ratingCount,
    required this.ratingDistribution,
  }) : assert(ratingDistribution.length == 5, 'ratingDistribution must have exactly 5 elements');

  @override
  Widget build(BuildContext context) {
    return Row(
      spacing: context.scale(32),
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$rating',
              style: TextStyle(
                color: context.appColors.neutralShade850,
                fontSize: context.scale(56),
                fontWeight: FontWeight.w700,
                height: 1.25,
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: context.scale(8),
              children: [
                StarRatingWidget(rating),
                Text(
                  NumberFormatter.formatDouble(ratingCount.toDouble()),
                  style: TextStyle(
                    color: context.appColors.neutralShade850,
                    fontSize: context.scale(10),
                  ),
                ),
              ],
            ),
          ],
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: context.scale(6),
            children: List.generate(5, (int index) {
              return Row(
                spacing: context.scale(12),
                children: [
                  SizedBox(
                    width: context.scale(12),
                    child: Text(
                      '${5 - index}',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: context.appColors.neutralShade850,
                        fontSize: context.scale(12),
                      ),
                    ),
                  ),
                  Expanded(
                    child: LinearProgressIndicator(
                      backgroundColor: context.appColors.backgroundShade200,
                      borderRadius: BorderRadius.circular(context.scale(4)),
                      color: context.appColors.greenShade100,
                      minHeight: context.scale(8),
                      value: ratingDistribution[4 - index],
                    ),
                  ),
                ],
              );
            }),
          ),
        ),
      ],
    );
  }
}
