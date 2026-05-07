// lib/features/dashboard/modules/ratings_and_reviews/presentation/views/ratings_and_reviews_screen.dart

import 'package:flutter/material.dart';

import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';

import '../widgets/rating_summary.dart';
import '../widgets/review_thread.dart';

class RatingsAndReviewsScreen extends StatelessWidget {
  const RatingsAndReviewsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ratings & Reviews')),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: context.scale(24),
                  children: [
                    Text(
                      'Ratings and reviews are submitted by verified clients who booked '
                      'and visited this shop through our app.',
                      style: TextStyle(
                        color: context.appColors.neutralShade850,
                        fontSize: context.scale(12),
                      ),
                    ),
                    RatingSummaryWidget(
                      rating: 3.5,
                      ratingCount: 16417439,
                      ratingDistribution: [0.10, 0.35, 0.5, 0.85, 0.68],
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
                  spacing: context.scale(24),
                  children: List.generate(3, (int index) {
                    return ReviewThreadWidget(
                      customer: CustomerReviewModel(
                        dateTime: DateTime(2026, 03, 14),
                        message:
                            'Great service from a skilled and professional barber. '
                            'The shop was clean, hygienic, and well maintained throughout the visit. '
                            'Booking through the app was smooth and saved a lot of time. '
                            'The barber understood exactly what I wanted and delivered a perfect haircut. '
                            'Overall, a very satisfying experience and I’d definitely',
                        name: 'John Doe',
                        rating: 4.5,
                      ),
                      merchant: ReviewMessageModel(
                        dateTime: DateTime(2026, 07, 16),
                        message:
                            'Great service from a skilled and professional barber. '
                            'The shop was clean, hygienic, and well maintained throughout the visit. '
                            'Booking through the app was smooth and saved a lot of time. '
                            'The barber understood exactly what I wanted and delivered a perfect haircut. '
                            'Overall, a very satisfying experience and I’d definitely',
                        name: 'The Barber Shop',
                      ),
                    );
                  }),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
