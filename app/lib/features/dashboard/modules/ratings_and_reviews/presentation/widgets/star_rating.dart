// lib/features/dashboard/modules/ratings_and_reviews/presentation/widgets/star_rating.dart

import 'package:flutter/material.dart';

import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';

class StarRatingWidget extends StatelessWidget {
  final double rating;

  const StarRatingWidget(
    this.rating, {
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.start,
      spacing: context.scale(2),
      children: List.generate(5, (int index) {
        if (index < rating.floor()) {
          return Icon(
            AppIcons.solidStandardStar,
            color: context.appColors.greenShade100,
            size: context.scale(12),
          );
        } else if (index == rating.floor() && (rating - rating.floor()) >= 0.5) {
          return Row(
            children: [
              ClipRect(
                child: Align(
                  alignment: Alignment.centerLeft,
                  widthFactor: 0.5,
                  child: Icon(
                    AppIcons.solidStandardStar,
                    color: context.appColors.greenShade100,
                    size: context.scale(12),
                  ),
                ),
              ),
              ClipRect(
                child: Align(
                  alignment: Alignment.centerRight,
                  widthFactor: 0.5,
                  child: Icon(
                    AppIcons.solidStandardStar,
                    color: context.appColors.backgroundShade325,
                    size: context.scale(12),
                  ),
                ),
              ),
            ],
          );
        } else {
          return Icon(
            AppIcons.solidStandardStar,
            color: context.appColors.backgroundShade325,
            size: context.scale(12),
          );
        }
      }),
    );
  }
}
