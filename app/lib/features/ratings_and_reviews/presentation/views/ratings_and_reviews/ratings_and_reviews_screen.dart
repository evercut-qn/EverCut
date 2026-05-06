// lib/features/ratings_and_reviews/presentation/views/ratings_and_reviews/ratings_and_reviews_screen.dart

import 'package:flutter/material.dart';

import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../widgets/user_review.dart';

import 'widgets/rating_summary.dart';

class RatingsAndReviewsScreen extends StatelessWidget {
  const RatingsAndReviewsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leadingWidth: 0,
        shape: Border(
          bottom: BorderSide(
            color: context.appColors.neutralShade800.withAlpha(125),
          ),
        ),
        title: Text(
          'Ratings & Reviews',
          style: TextStyle(
            color: context.appColors.neutralShade800,
            fontSize: context.scale(18),
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: context.scale(24),
            children: [
              Text(
                'Ratings and reviews are submitted by verified clients who booked '
                'and visited this shop through our app.',
                style: TextStyle(
                  color: context.appColors.neutralShade800,
                  fontSize: context.scale(12),
                ),
              ),
              const RatingSummary(),
              Divider(
                color: context.appColors.neutralShade800.withAlpha(125),
                height: 0,
              ),
              const UserReview(),
            ],
          ),
        ),
      ),
    );
  }
}
