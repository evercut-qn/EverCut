// lib/features/ratings_and_reviews/presentation/widgets/star_rating.dart

import 'package:flutter/material.dart';

import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';

class StarRating extends StatelessWidget {
  final double rating;

  const StarRating(
    this.rating, {
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final int fullStars = rating.floor();
    final bool hasHalfStar = (rating - fullStars) >= 0.5;

    return Row(
      mainAxisAlignment: MainAxisAlignment.start,
      spacing: context.scale(2),
      children: List.generate(5, (int index) {
        if (index < fullStars) {
          return Icon(
            AppIcons.solidStandardStar,
            color: context.appColors.greenShade100,
            size: context.scale(12),
          );
        } else if (index == fullStars && hasHalfStar) {
          return Stack(
            children: [
              Icon(
                AppIcons.solidStandardStar,
                color: context.appColors.backgroundShade300,
                size: context.scale(12),
              ),
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
            ],
          );
        } else {
          return Icon(
            AppIcons.solidStandardStar,
            color: context.appColors.backgroundShade300,
            size: context.scale(12),
          );
        }
      }),
    );
  }
}
