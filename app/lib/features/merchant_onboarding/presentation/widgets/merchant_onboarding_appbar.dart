// lib/features/merchant_onboarding/presentation/widgets/merchant_onboarding_appbar.dart

import 'package:flutter/material.dart';

import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';

class MerchantOnboardingAppBar extends StatelessWidget {
  final int currentIndex;
  final int indicatorLength;
  final String titleText;

  const MerchantOnboardingAppBar({
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
        spacing: context.scale(32),
        children: [
          Text(
            titleText,
            style: TextStyle(
              fontSize: context.scale(20),
              fontWeight: FontWeight.bold,
            ),
          ),
          Row(
            spacing: context.scale(12),
            children: List.generate(indicatorLength, (int index) {
              return Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(context.scale(2.75)),
                    color: index == currentIndex ? context.appColors.greenShade100 : Theme.of(context).inputDecorationTheme.fillColor,
                  ),
                  padding: EdgeInsets.all(context.scale(2.75)),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
