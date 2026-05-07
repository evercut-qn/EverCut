// lib/features/dashboard/modules/rewards/presentation/views/rewards_screen.dart

import 'package:flutter/material.dart';

import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../widgets/reward_progress_bar.dart';

class RewardsScreen extends StatelessWidget {
  const RewardsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rewards')),
      backgroundColor: context.appColors.backgroundShade75,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Material(
                clipBehavior: Clip.hardEdge,
                color: context.appColors.backgroundShade50,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(context.scale(12)),
                  side: BorderSide(color: context.appColors.backgroundShade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: EdgeInsets.all(context.scale(18)),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            spacing: context.scale(8),
                            children: [
                              Material(
                                color: context.appColors.neutralShade850,
                                shape: const CircleBorder(),
                                child: SizedBox.square(
                                  dimension: context.scale(6),
                                ),
                              ),
                              Text(
                                'MARCH 2026',
                                style: TextStyle(
                                  color: context.appColors.neutralShade850,
                                  fontSize: context.scale(12),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          Material(
                            clipBehavior: Clip.hardEdge,
                            color: context.appColors.backgroundShade75,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(context.scale(8)),
                              side: BorderSide(color: context.appColors.backgroundShade200),
                            ),
                            child: Padding(
                              padding: EdgeInsets.all(context.scale(12)),
                              child: Row(
                                spacing: context.scale(8),
                                children: [
                                  Icon(
                                    AppIcons.solidRoundedAward01,
                                    color: context.appColors.neutralShade850,
                                    size: context.scale(16),
                                  ),
                                  Text(
                                    'Active',
                                    style: TextStyle(
                                      color: context.appColors.neutralShade850,
                                      fontSize: context.scale(12),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
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
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: context.scale(36),
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: context.scale(12),
                            children: [
                              Text(
                                'TOTAL BOOKINGS',
                                style: TextStyle(
                                  color: context.appColors.neutralShade850,
                                  fontSize: context.scale(12),
                                  fontWeight: FontWeight.w700,
                                  height: 1.0,
                                ),
                              ),
                              Text(
                                '720',
                                style: TextStyle(
                                  fontSize: context.scale(36),
                                  fontWeight: FontWeight.w700,
                                  height: 1.0,
                                ),
                              ),
                            ],
                          ),
                          RewardProgressBarWidget(
                            max: 1000,
                            current: 750,
                            checkpoints: [100, 700, 850],
                          ),
                          Material(
                            color: context.appColors.backgroundShade75,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(context.scale(12)),
                              side: BorderSide(color: context.appColors.backgroundShade200),
                            ),
                            child: Padding(
                              padding: EdgeInsets.all(context.scale(16)),
                              child: Row(
                                spacing: context.scale(12),
                                children: [
                                  Material(
                                    borderRadius: BorderRadius.circular(context.scale(6)),
                                    color: context.appColors.backgroundShade200,
                                    child: Padding(
                                      padding: EdgeInsets.all(context.scale(16)),
                                      child: Icon(
                                        AppIcons.solidRoundedFlash,
                                        color: context.appColors.greenShade100,
                                        size: context.scale(16),
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: RichText(
                                      text: TextSpan(
                                        text: 'Just ',
                                        style: TextStyle(
                                          color: context.appColors.neutralShade850,
                                          fontFamily: 'DMSans',
                                          fontSize: context.scale(12),
                                          height: 1.55,
                                        ),
                                        children: <TextSpan>[
                                          TextSpan(
                                            text: '130 more bookings',
                                            style: TextStyle(
                                              color: context.appColors.greenShade100,
                                            ),
                                          ),
                                          const TextSpan(text: ' to reach your next reward!'),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
