// lib/features/ratings_and_reviews/presentation/views/ratings_and_reviews/widgets/rating_summary.dart

import 'package:flutter/material.dart';

import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../widgets/star_rating.dart';

class RatingSummary extends StatelessWidget {
  const RatingSummary({super.key});

  @override
  Widget build(BuildContext context) {
    final values = [
      0.10,
      0.35,
      0.5,
      0.85,
      0.68,
    ];
    return Row(
      spacing: context.scale(32),
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: context.scale(6),
          children: [
            Text(
              '3.5',
              style: TextStyle(
                color: context.appColors.neutralShade850,
                fontSize: context.scale(56),
                fontWeight: FontWeight.bold,
                height: 1,
              ),
            ),
            const StarRating(3.5),
            Text(
              '64,17,439',
              style: TextStyle(
                color: context.appColors.neutralShade850,
                fontSize: context.scale(10),
              ),
            ),
          ],
        ),
        Expanded(
          child: Column(
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
                      value: values[4 - index],
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
