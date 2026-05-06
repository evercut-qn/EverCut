// lib/features/transactions/presentation/views/transaction_details/transaction_details_screen.dart

import 'package:flutter/material.dart';

import '../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';

class TransactionDetailsScreen extends StatelessWidget {
  const TransactionDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        actions: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: context.scale(6)),
            child: PopupMenuButton(
              icon: const Icon(Icons.more_vert),
              itemBuilder: (BuildContext context) {
                return <PopupMenuEntry>[
                  PopupMenuItem(
                    child: Row(
                      spacing: context.scale(6),
                      children: [
                        SizedBox.square(
                          dimension: context.scale(24),
                          child: Icon(
                            AppIcons.solidRoundedPrinter,
                            color: context.appColors.neutralShade650,
                            size: context.scale(18),
                          ),
                        ),
                        Text(
                          'Print Receipt',
                          style: TextStyle(
                            color: context.appColors.neutralShade650,
                            fontSize: context.scale(14),
                          ),
                        ),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    child: Row(
                      spacing: context.scale(6),
                      children: [
                        SizedBox.square(
                          dimension: context.scale(24),
                          child: Icon(
                            AppIcons.solidRoundedShare08,
                            color: context.appColors.neutralShade650,
                            size: context.scale(18),
                          ),
                        ),
                        Text(
                          'Share',
                          style: TextStyle(
                            color: context.appColors.neutralShade650,
                            fontSize: context.scale(14),
                          ),
                        ),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    child: Row(
                      spacing: context.scale(6),
                      children: [
                        SizedBox.square(
                          dimension: context.scale(24),
                          child: Icon(
                            AppIcons.solidRoundedUser,
                            color: context.appColors.neutralShade650,
                            size: context.scale(18),
                          ),
                        ),
                        Text(
                          'Customer Profile',
                          style: TextStyle(
                            color: context.appColors.neutralShade650,
                            fontSize: context.scale(14),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const PopupMenuDivider(),
                  PopupMenuItem(
                    child: Row(
                      spacing: context.scale(6),
                      children: [
                        SizedBox.square(
                          dimension: context.scale(24),
                          child: Icon(
                            AppIcons.solidRoundedAlertDiamond,
                            color: context.appColors.redShade100,
                            size: context.scale(18),
                          ),
                        ),
                        Text(
                          'Report Issue',
                          style: TextStyle(
                            color: context.appColors.redShade100,
                            fontSize: context.scale(14),
                          ),
                        ),
                      ],
                    ),
                  ),
                ];
              },
            ),
          ),
        ],
        title: const Text('Transaction Detail'),
      ),
      body: SizedBox.expand(
        child: ColoredBox(
          color: context.appColors.backgroundShade100.withAlpha(191),
          child: SafeArea(
            child: SingleChildScrollView(
              padding: EdgeInsets.all(context.scale(24)),
              child: Column(
                spacing: context.scale(24),
                children: [
                  Material(
                    borderRadius: BorderRadius.circular(context.scale(12)),
                    color: context.appColors.backgroundShade50,
                    child: Padding(
                      padding: EdgeInsets.all(context.scale(24)),
                      child: Column(
                        spacing: context.scale(24),
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            spacing: context.scale(16),
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                spacing: context.scale(8),
                                children: [
                                  Text(
                                    'CUSTOMER',
                                    style: TextStyle(
                                      color: context.appColors.neutralShade650,
                                      fontSize: context.scale(12),
                                    ),
                                  ),
                                  Text(
                                    'Alex Johnson',
                                    style: TextStyle(
                                      color: context.appColors.neutralShade850,
                                      fontSize: context.scale(20),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Text(
                                    '#C-A123CXZ',
                                    style: TextStyle(
                                      color: context.appColors.neutralShade650,
                                      fontSize: context.scale(14),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                              CircleAvatar(
                                backgroundColor: context.appColors.backgroundShade100,
                                radius: context.scale(26),
                              ),
                            ],
                          ),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: context.scale(16),
                            children: [
                              Expanded(
                                child: Material(
                                  borderRadius: BorderRadius.circular(context.scale(12)),
                                  color: context.appColors.backgroundShade100,
                                  child: Padding(
                                    padding: EdgeInsets.all(context.scale(16)),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      spacing: context.scale(8),
                                      children: [
                                        Row(
                                          spacing: context.scale(8),
                                          children: [
                                            Icon(
                                              AppIcons.solidRoundedCalendar02,
                                              color: context.appColors.neutralShade650,
                                              size: context.scale(16),
                                            ),
                                            Text(
                                              'DATE',
                                              style: TextStyle(
                                                color: context.appColors.neutralShade650,
                                                fontSize: context.scale(12),
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ],
                                        ),
                                        Text(
                                          'Oct 24, 2026',
                                          style: TextStyle(
                                            color: context.appColors.neutralShade650,
                                            fontSize: context.scale(16),
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Material(
                                  borderRadius: BorderRadius.circular(context.scale(12)),
                                  color: context.appColors.backgroundShade100,
                                  child: Padding(
                                    padding: EdgeInsets.all(context.scale(16)),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      spacing: context.scale(8),
                                      children: [
                                        Row(
                                          spacing: context.scale(8),
                                          children: [
                                            Icon(
                                              AppIcons.solidRoundedTime02,
                                              color: context.appColors.neutralShade650,
                                              size: context.scale(16),
                                            ),
                                            Text(
                                              'TIME',
                                              style: TextStyle(
                                                color: context.appColors.neutralShade650,
                                                fontSize: context.scale(12),
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ],
                                        ),
                                        Text(
                                          '10:30 AM',
                                          style: TextStyle(
                                            color: context.appColors.neutralShade650,
                                            fontSize: context.scale(16),
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  Material(
                    color: context.appColors.backgroundShade200.withAlpha(127),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(context.scale(12)),
                      side: BorderSide(color: context.appColors.backgroundShade300),
                    ),
                    child: Padding(
                      padding: EdgeInsets.all(context.scale(24)),
                      child: Row(
                        spacing: context.scale(16),
                        children: [
                          CircleAvatar(
                            backgroundColor: context.appColors.backgroundShade300,
                            radius: context.scale(26),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: context.scale(2),
                            children: [
                              Text(
                                'BARBER',
                                style: TextStyle(
                                  color: context.appColors.neutralShade650,
                                  fontSize: context.scale(10),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                'Alex Johnson',
                                style: TextStyle(
                                  color: context.appColors.neutralShade850,
                                  fontSize: context.scale(16),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                '#B-X734STL',
                                style: TextStyle(
                                  color: context.appColors.neutralShade650,
                                  fontSize: context.scale(12),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  Material(
                    borderRadius: BorderRadius.circular(context.scale(12)),
                    color: context.appColors.backgroundShade50,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: EdgeInsets.all(context.scale(24)),
                          child: Row(
                            spacing: context.scale(12),
                            children: [
                              Icon(
                                AppIcons.solidRoundedChairBarber,
                                color: context.appColors.neutralShade850,
                                size: context.scale(20),
                              ),
                              Expanded(
                                child: Text(
                                  'Service Summary',
                                  style: TextStyle(
                                    color: context.appColors.neutralShade850,
                                    fontSize: context.scale(14),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Divider(
                          color: context.appColors.backgroundShade100,
                          height: 1.0,
                        ),
                        Padding(
                          padding: EdgeInsets.all(context.scale(24)),
                          child: Column(
                            spacing: context.scale(16),
                            children: [
                              Column(
                                spacing: context.scale(16),
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    spacing: context.scale(16),
                                    children: [
                                      Text(
                                        'Haircut',
                                        textAlign: TextAlign.left,
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(14),
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      Text(
                                        '₹45.00',
                                        textAlign: TextAlign.right,
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(14),
                                        ),
                                      ),
                                    ],
                                  ),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    spacing: context.scale(16),
                                    children: [
                                      Text(
                                        'Beard',
                                        textAlign: TextAlign.left,
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(14),
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      Text(
                                        '₹20.00',
                                        textAlign: TextAlign.right,
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(14),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              Divider(
                                color: context.appColors.backgroundShade100,
                                height: 1.0,
                              ),
                              Row(
                                spacing: context.scale(16),
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      spacing: context.scale(2),
                                      children: [
                                        Text(
                                          'GRAND TOTAL',
                                          textAlign: TextAlign.left,
                                          style: TextStyle(
                                            color: context.appColors.neutralShade650,
                                            fontSize: context.scale(14),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        Text(
                                          'Tax Inclusive',
                                          textAlign: TextAlign.left,
                                          style: TextStyle(
                                            color: context.appColors.neutralShade650,
                                            fontSize: context.scale(12),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    '₹55.00',
                                    textAlign: TextAlign.right,
                                    style: TextStyle(
                                      color: context.appColors.neutralShade650,
                                      fontSize: context.scale(24),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Material(
                    color: context.appColors.backgroundShade200.withAlpha(127),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(context.scale(12)),
                      side: BorderSide(color: context.appColors.backgroundShade300),
                    ),
                    child: Column(
                      children: [
                        Padding(
                          padding: EdgeInsets.all(context.scale(24)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: context.scale(8),
                            children: [
                              Text(
                                'PAYMENT STATUS',
                                style: TextStyle(
                                  color: context.appColors.neutralShade650,
                                  fontSize: context.scale(10),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Row(
                                spacing: context.scale(8),
                                children: [
                                  Icon(
                                    AppIcons.solidRoundedCheckmarkBadge01,
                                    color: context.appColors.greenShade100,
                                    size: context.scale(20),
                                  ),
                                  Text(
                                    'Successfully Paid',
                                    style: TextStyle(
                                      color: context.appColors.greenShade100,
                                      fontSize: context.scale(16),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Divider(
                          color: context.appColors.backgroundShade300,
                          height: 1.0,
                        ),
                        Padding(
                          padding: EdgeInsets.all(context.scale(24)),
                          child: Column(
                            spacing: context.scale(16),
                            children: [
                              Row(
                                spacing: context.scale(16),
                                children: [
                                  Text(
                                    'Transaction ID',
                                    textAlign: TextAlign.left,
                                    style: TextStyle(
                                      color: context.appColors.neutralShade650,
                                      fontSize: context.scale(14),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  Expanded(
                                    child: Text(
                                      'TXN99201458',
                                      textAlign: TextAlign.right,
                                      style: TextStyle(
                                        color: context.appColors.neutralShade650,
                                        fontSize: context.scale(14),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              Divider(
                                color: context.appColors.backgroundShade300,
                                height: 1.0,
                              ),
                              Row(
                                spacing: context.scale(16),
                                children: [
                                  Text(
                                    'User\'s UPI',
                                    textAlign: TextAlign.left,
                                    style: TextStyle(
                                      color: context.appColors.neutralShade650,
                                      fontSize: context.scale(14),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  Expanded(
                                    child: Text(
                                      'username@bank',
                                      textAlign: TextAlign.right,
                                      style: TextStyle(
                                        color: context.appColors.neutralShade650,
                                        fontSize: context.scale(14),
                                      ),
                                    ),
                                  ),
                                ],
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
        ),
      ),
    );
  }
}
