// lib/features/onboarding/presentation/widgets/onboarding_appbar.dart

import 'package:flutter/material.dart';

import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';

class OnboardingAppBarWidget extends StatelessWidget {
  final int currentIndex;
  final int indicatorLength;
  final String titleText;

  const OnboardingAppBarWidget({
    super.key,
    required this.currentIndex,
    required this.indicatorLength,
    required this.titleText,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(context.scale(24)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: context.scale(32),
        children: [
          Text(
            titleText,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: context.appColors.neutralShade850,
              fontSize: context.scale(20),
              fontWeight: FontWeight.w700,
            ),
          ),
          Row(
            spacing: context.scale(12),
            children: List.generate(indicatorLength, (int index) {
              return Expanded(
                child: Material(
                  borderRadius: BorderRadius.circular(context.scale(4)),
                  color: index == currentIndex ? context.appColors.greenShade100 : context.appColors.backgroundShade125,
                  child: SizedBox(
                    height: context.scale(8),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
