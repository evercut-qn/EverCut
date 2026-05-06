// lib/features/ratings_and_reviews/presentation/widgets/user_review.dart

import 'package:flutter/material.dart';

import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';

import 'star_rating.dart';

class UserReview extends StatelessWidget {
  const UserReview({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      spacing: context.scale(12),
      children: [
        Row(
          spacing: context.scale(12),
          children: [
            CircleAvatar(
              backgroundColor: context.appColors.neutralShade800,
              radius: context.scale(24),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: context.scale(2),
                children: [
                  Text(
                    'John Doe',
                    maxLines: 1,
                    style: TextStyle(
                      color: context.appColors.neutralShade800,
                      fontSize: context.scale(14),
                      fontWeight: FontWeight.w600,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IntrinsicHeight(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [
                        Text(
                          '10-Mar-2025',
                          style: TextStyle(
                            color: context.appColors.neutralShade800,
                            fontSize: context.scale(12),
                          ),
                        ),
                        VerticalDivider(
                          color: context.appColors.neutralShade800,
                          endIndent: context.scale(2),
                          indent: context.scale(2),
                        ),
                        const StarRating(3.5),
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
                size: context.scale(16),
              ),
            ),
          ],
        ),
        _ExpandableText(
          'Great service from a skilled and professional barber. '
          'The shop was clean, hygienic, and well maintained throughout the visit. '
          'Booking through the app was smooth and saved a lot of time. '
          'The barber understood exactly what I wanted and delivered a perfect haircut. '
          'Overall, a very satisfying experience and I’d definitely',
        ),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(context.scale(6)),
            color: context.appColors.neutralShade50.withAlpha(25),
          ),
          padding: EdgeInsets.all(context.scale(12)),
          child: Column(
            spacing: context.scale(6),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                spacing: context.scale(12),
                children: [
                  Flexible(
                    child: Text(
                      'The Barber Shop',
                      style: TextStyle(
                        color: context.appColors.neutralShade600,
                        fontSize: context.scale(13),
                        fontWeight: FontWeight.w600,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                  Text(
                    '12-Mar-2025',
                    style: TextStyle(
                      color: context.appColors.neutralShade600,
                      fontSize: context.scale(11),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              _ExpandableText(
                'Great service from a skilled and professional barber. '
                'The shop was clean, hygienic, and well maintained throughout the visit. '
                'Booking through the app was smooth and saved a lot of time. '
                'The barber understood exactly what I wanted and delivered a perfect haircut. '
                'Overall, a very satisfying experience and I’d definitely',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ExpandableText extends StatefulWidget {
  final String text;

  const _ExpandableText(this.text);

  @override
  State<_ExpandableText> createState() => _ExpandableTextState();
}

class _ExpandableTextState extends State<_ExpandableText> {
  bool isExpanded = false;

  void onTextTap() => setState(() {
    isExpanded = !isExpanded;
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTextTap,
      child: AnimatedCrossFade(
        crossFadeState: isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
        duration: const Duration(milliseconds: 150),
        firstChild: Text(
          widget.text,
          maxLines: 2,
          style: TextStyle(
            color: context.appColors.neutralShade600,
            fontSize: context.scale(12),
            overflow: !isExpanded ? TextOverflow.ellipsis : null,
          ),
        ),
        secondChild: Text(
          widget.text,
          style: TextStyle(
            color: context.appColors.neutralShade600,
            fontSize: context.scale(12),
          ),
        ),
      ),
    );
  }
}
