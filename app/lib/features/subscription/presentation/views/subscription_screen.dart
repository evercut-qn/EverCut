// lib/features/subscription/presentation/views/subscription_screen.dart

import 'package:flutter/material.dart';

import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.appColors.backgroundShade75,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Material(
                  clipBehavior: Clip.hardEdge,
                  color: context.appColors.backgroundShade50,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(context.scale(12)),
                    side: BorderSide(color: context.appColors.backgroundShade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.transparent,
                              context.appColors.purpleShade100.withAlpha(31),
                            ],
                          ),
                        ),
                        child: Padding(
                          padding: EdgeInsets.all(context.scale(20)),
                          child: Row(
                            spacing: context.scale(16),
                            children: [
                              Material(
                                borderRadius: BorderRadius.circular(context.scale(12)),
                                clipBehavior: Clip.hardEdge,
                                child: DecoratedBox(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      begin: Alignment.topLeft,
                                      colors: [
                                        context.appColors.purpleShade100.withAlpha(31),
                                        context.appColors.purpleShade100.withAlpha(167),
                                      ],
                                      end: Alignment.bottomRight,
                                    ),
                                  ),
                                  child: Padding(
                                    padding: EdgeInsets.all(context.scale(16)),
                                    child: Icon(
                                      AppIcons.solidRoundedStar,
                                      color: context.appColors.neutralShade50,
                                      size: context.scale(20),
                                    ),
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  spacing: context.scale(2),
                                  children: [
                                    Text(
                                      'V1 Plan',
                                      style: TextStyle(
                                        color: context.appColors.neutralShade850,
                                        fontSize: context.scale(18),
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      '₹299/Month',
                                      style: TextStyle(
                                        color: context.appColors.neutralShade650,
                                        fontSize: context.scale(12),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Material(
                                borderRadius: BorderRadius.circular(context.scale(20)),
                                clipBehavior: Clip.hardEdge,
                                color: context.appColors.greenShade50.withAlpha(31),
                                child: Padding(
                                  padding: EdgeInsets.symmetric(
                                    horizontal: context.scale(14),
                                    vertical: context.scale(10),
                                  ),
                                  child: Row(
                                    spacing: context.scale(6),
                                    children: [
                                      Icon(
                                        AppIcons.solidRoundedCheckmarkCircle02,
                                        color: context.appColors.greenShade100,
                                        size: context.scale(14),
                                      ),
                                      Text(
                                        'Active',
                                        style: TextStyle(
                                          color: context.appColors.greenShade100,
                                          fontSize: context.scale(10),
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      Divider(
                        color: context.appColors.backgroundShade200,
                        height: 1.0,
                      ),
                      Padding(
                        padding: EdgeInsets.all(context.scale(20)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          spacing: context.scale(20),
                          children: [
                            Text(
                              'Access to the following features',
                              style: TextStyle(
                                color: context.appColors.neutralShade650,
                                fontSize: context.scale(12),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              spacing: context.scale(20),
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  spacing: context.scale(4),
                                  children: [
                                    Row(
                                      spacing: context.scale(8),
                                      children: [
                                        Icon(
                                          AppIcons.solidRoundedCheckmarkCircle02,
                                          color: context.appColors.purpleShade100.withAlpha(191),
                                          size: context.scale(20),
                                        ),
                                        Text(
                                          'Basic Analytics',
                                          style: TextStyle(
                                            color: context.appColors.neutralShade850,
                                            fontSize: context.scale(12),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Padding(
                                      padding: EdgeInsets.only(left: context.scale(28)),
                                      child: Text(
                                        'View key insights.',
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(10),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  spacing: context.scale(4),
                                  children: [
                                    Row(
                                      spacing: context.scale(8),
                                      children: [
                                        Icon(
                                          AppIcons.solidRoundedCheckmarkCircle02,
                                          color: context.appColors.purpleShade100.withAlpha(191),
                                          size: context.scale(20),
                                        ),
                                        Text(
                                          'Basic Analytics',
                                          style: TextStyle(
                                            color: context.appColors.neutralShade850,
                                            fontSize: context.scale(12),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Padding(
                                      padding: EdgeInsets.only(left: context.scale(28)),
                                      child: Text(
                                        'View key insights.',
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(10),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  spacing: context.scale(4),
                                  children: [
                                    Row(
                                      spacing: context.scale(8),
                                      children: [
                                        Icon(
                                          AppIcons.solidRoundedCheckmarkCircle02,
                                          color: context.appColors.purpleShade100.withAlpha(191),
                                          size: context.scale(20),
                                        ),
                                        Text(
                                          'Basic Analytics',
                                          style: TextStyle(
                                            color: context.appColors.neutralShade850,
                                            fontSize: context.scale(12),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Padding(
                                      padding: EdgeInsets.only(left: context.scale(28)),
                                      child: Text(
                                        'View key insights.',
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(10),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  spacing: context.scale(4),
                                  children: [
                                    Row(
                                      spacing: context.scale(8),
                                      children: [
                                        Icon(
                                          AppIcons.solidRoundedCheckmarkCircle02,
                                          color: context.appColors.neutralShade650.withAlpha(191),
                                          size: context.scale(20),
                                        ),
                                        Text(
                                          'Basic Analytics',
                                          style: TextStyle(
                                            color: context.appColors.neutralShade850,
                                            fontSize: context.scale(12),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Padding(
                                      padding: EdgeInsets.only(left: context.scale(28)),
                                      child: Text(
                                        'View key insights.',
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(10),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  spacing: context.scale(4),
                                  children: [
                                    Row(
                                      spacing: context.scale(8),
                                      children: [
                                        Icon(
                                          AppIcons.solidRoundedCheckmarkCircle02,
                                          color: context.appColors.neutralShade650.withAlpha(191),
                                          size: context.scale(20),
                                        ),
                                        Text(
                                          'Basic Analytics',
                                          style: TextStyle(
                                            color: context.appColors.neutralShade850,
                                            fontSize: context.scale(12),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Padding(
                                      padding: EdgeInsets.only(left: context.scale(28)),
                                      child: Text(
                                        'View key insights.',
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(10),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
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
                  spacing: context.scale(18),
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      spacing: context.scale(4),
                      children: [
                        Text(
                          'Mandate & Billing',
                          style: TextStyle(
                            color: context.appColors.neutralShade850,
                            fontSize: context.scale(18),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          'Manage all your payment mandates, plan validity, and subscriptions quickly, and securely.',
                          style: TextStyle(
                            color: context.appColors.neutralShade650,
                            fontSize: context.scale(12),
                          ),
                        ),
                      ],
                    ),
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
                            padding: EdgeInsets.all(context.scale(20)),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              spacing: context.scale(20),
                              children: [
                                InkWell(
                                  highlightColor: Colors.transparent,
                                  onTap: () {},
                                  splashFactory: NoSplash.splashFactory,
                                  splashColor: Colors.transparent,
                                  child: Row(
                                    spacing: context.scale(16),
                                    children: [
                                      Material(
                                        borderRadius: BorderRadius.circular(context.scale(6)),
                                        clipBehavior: Clip.hardEdge,
                                        color: context.appColors.purpleShade50.withAlpha(31),
                                        child: Padding(
                                          padding: EdgeInsets.all(context.scale(14)),
                                          child: Icon(
                                            AppIcons.solidRoundedCalendar02,
                                            color: context.appColors.purpleShade100,
                                            size: context.scale(20),
                                          ),
                                        ),
                                      ),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.stretch,
                                          spacing: context.scale(2),
                                          children: [
                                            Text(
                                              'Last Recharge',
                                              style: TextStyle(
                                                color: context.appColors.neutralShade850,
                                                fontSize: context.scale(14),
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            Text(
                                              '24th Dec 2026',
                                              style: TextStyle(
                                                color: context.appColors.neutralShade650,
                                                fontSize: context.scale(12),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                InkWell(
                                  highlightColor: Colors.transparent,
                                  onTap: () {},
                                  splashFactory: NoSplash.splashFactory,
                                  splashColor: Colors.transparent,
                                  child: Row(
                                    spacing: context.scale(16),
                                    children: [
                                      Material(
                                        borderRadius: BorderRadius.circular(context.scale(6)),
                                        clipBehavior: Clip.hardEdge,
                                        color: context.appColors.orangeShade50.withAlpha(31),
                                        child: Padding(
                                          padding: EdgeInsets.all(context.scale(14)),
                                          child: Icon(
                                            AppIcons.solidRoundedTimer01,
                                            color: context.appColors.orangeShade100,
                                            size: context.scale(20),
                                          ),
                                        ),
                                      ),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.stretch,
                                          spacing: context.scale(2),
                                          children: [
                                            Text(
                                              'Plan Validity',
                                              style: TextStyle(
                                                color: context.appColors.neutralShade850,
                                                fontSize: context.scale(14),
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            Text(
                                              '24th Dec 2026',
                                              style: TextStyle(
                                                color: context.appColors.neutralShade650,
                                                fontSize: context.scale(12),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Material(
                                        borderRadius: BorderRadius.circular(context.scale(20)),
                                        clipBehavior: Clip.hardEdge,
                                        color: context.appColors.greenShade50.withAlpha(31),
                                        child: Padding(
                                          padding: EdgeInsets.symmetric(
                                            horizontal: context.scale(14),
                                            vertical: context.scale(10),
                                          ),
                                          child: Text(
                                            '15 Days Left',
                                            style: TextStyle(
                                              color: context.appColors.greenShade100,
                                              fontSize: context.scale(10),
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
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
                            padding: EdgeInsets.all(context.scale(20)),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              spacing: context.scale(20),
                              children: [
                                InkWell(
                                  highlightColor: Colors.transparent,
                                  onTap: () {},
                                  splashFactory: NoSplash.splashFactory,
                                  splashColor: Colors.transparent,
                                  child: Row(
                                    spacing: context.scale(16),
                                    children: [
                                      Material(
                                        borderRadius: BorderRadius.circular(context.scale(6)),
                                        clipBehavior: Clip.hardEdge,
                                        color: context.appColors.blueShade50.withAlpha(31),
                                        child: Padding(
                                          padding: EdgeInsets.all(context.scale(14)),
                                          child: Icon(
                                            AppIcons.solidRoundedCreditCard,
                                            color: context.appColors.blueShade100,
                                            size: context.scale(20),
                                          ),
                                        ),
                                      ),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.stretch,
                                          spacing: context.scale(2),
                                          children: [
                                            Text(
                                              'Manage Billing',
                                              style: TextStyle(
                                                color: context.appColors.neutralShade850,
                                                fontSize: context.scale(14),
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            Text(
                                              'Change your auto-pay or payment method.',
                                              style: TextStyle(
                                                color: context.appColors.neutralShade650,
                                                fontSize: context.scale(12),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Icon(
                                        Icons.chevron_right,
                                        color: context.appColors.neutralShade650,
                                        size: context.scale(24),
                                      ),
                                    ],
                                  ),
                                ),
                                InkWell(
                                  highlightColor: Colors.transparent,
                                  onTap: () {},
                                  splashFactory: NoSplash.splashFactory,
                                  splashColor: Colors.transparent,
                                  child: Row(
                                    spacing: context.scale(16),
                                    children: [
                                      Material(
                                        borderRadius: BorderRadius.circular(context.scale(6)),
                                        clipBehavior: Clip.hardEdge,
                                        color: context.appColors.redShade50.withAlpha(31),
                                        child: Padding(
                                          padding: EdgeInsets.all(context.scale(14)),
                                          child: Icon(
                                            AppIcons.strokeRoundedCancelCircle,
                                            color: context.appColors.redShade100,
                                            size: context.scale(20),
                                          ),
                                        ),
                                      ),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.stretch,
                                          spacing: context.scale(2),
                                          children: [
                                            Text(
                                              'Cancel Subscription',
                                              style: TextStyle(
                                                color: context.appColors.neutralShade850,
                                                fontSize: context.scale(14),
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            Text(
                                              'Cancel your plan and stop future payments.',
                                              style: TextStyle(
                                                color: context.appColors.neutralShade650,
                                                fontSize: context.scale(12),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Icon(
                                        Icons.chevron_right,
                                        color: context.appColors.neutralShade650,
                                        size: context.scale(24),
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
