// lib/features/dashboard/modules/ratings_and_reviews/presentation/widgets/review_thread.dart

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/widgets/other/expandable_text/expandable_text.dart';

import 'star_rating.dart';

part '../models/customer_review.dart';
part '../models/review_message.dart';

class ReviewThreadWidget extends StatelessWidget {
  final CustomerReviewModel customer;
  final ReviewMessageModel? merchant;

  const ReviewThreadWidget({
    super.key,
    required this.customer,
    this.merchant,
  });

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
                Material(
                  clipBehavior: Clip.hardEdge,
                  color: context.appColors.backgroundShade75,
                  shape: CircleBorder(
                    side: BorderSide(
                      color: context.appColors.backgroundShade200,
                    ),
                  ),
                  child: SizedBox.square(
                    dimension: context.scale(56),
                    child: (() {
                      if (customer.avatarUrl != null) {
                        return SizedBox.shrink();
                      } else {
                        return Center(
                          child: Text(
                            customer.name.split(' ').map((word) => word[0].toUpperCase()).join(),
                            style: TextStyle(
                              color: context.appColors.neutralShade850,
                              fontSize: context.scale(12),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        );
                      }
                    })(),
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: context.scale(2),
                    children: [
                      Text(
                        customer.name,
                        maxLines: 1,
                        style: TextStyle(
                          color: context.appColors.neutralShade850,
                          fontSize: context.scale(14),
                          fontWeight: FontWeight.w600,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IntrinsicHeight(
                        child: Row(
                          spacing: context.scale(8),
                          children: [
                            Text(
                              DateFormat('dd-MMM-yyyy').format(customer.dateTime),
                              style: TextStyle(
                                color: context.appColors.neutralShade650,
                                fontSize: context.scale(12),
                              ),
                            ),
                            Padding(
                              padding: EdgeInsets.all(context.scale(2)),
                              child: VerticalDivider(
                                color: context.appColors.backgroundShade650,
                                width: 1.0,
                              ),
                            ),
                            StarRatingWidget(customer.rating),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () {},
                  icon: Icon(
                    AppIcons.solidRoundedMoreVerticalCircle01,
                    color: context.appColors.neutralShade650,
                    size: context.scale(16),
                  ),
                ),
              ],
            ),
            ExpandableText(
              customer.message,
              style: TextStyle(
                color: context.appColors.neutralShade650,
                fontSize: context.scale(12),
              ),
            ),
          ],
        ),
        if (merchant != null) ...[
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
                spacing: context.scale(8),
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    spacing: context.scale(16),
                    children: [
                      Flexible(
                        child: Text(
                          merchant!.name,
                          style: TextStyle(
                            color: context.appColors.neutralShade650,
                            fontSize: context.scale(13),
                            fontWeight: FontWeight.w600,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                      Text(
                        DateFormat('dd-MMM-yyyy').format(merchant!.dateTime),
                        style: TextStyle(
                          color: context.appColors.neutralShade650,
                          fontSize: context.scale(11),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  ExpandableText(
                    merchant!.message,
                    style: TextStyle(
                      color: context.appColors.neutralShade650,
                      fontSize: context.scale(12),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}
