// lib/features/transactions/presentation/views/transactions_screen.dart

import 'package:flutter/material.dart';

import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/enums/sort.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/models/ranges/amount_range.dart';
import '../../../../shared/models/ranges/date_range.dart';
import '../../../../shared/models/ui/sort_option.dart';
import '../../../../shared/widgets/overlays/dialogs.dart';
import '../models/transaction_filter.dart';
import '../widgets/filter_dialog.dart';
import '../widgets/transaction.dart';

class TransactionsScreen extends StatelessWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(context.scale(24)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: context.scale(24),
                children: [
                  Text(
                    'Transactions',
                    style: TextStyle(
                      color: context.appColors.neutralShade650,
                      fontSize: context.scale(20),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Material(
                    borderRadius: BorderRadius.circular(context.scale(12)),
                    clipBehavior: Clip.hardEdge,
                    color: context.appColors.backgroundShade100,
                    child: Stack(
                      children: [
                        Positioned(
                          right: -(context.scale(40)),
                          bottom: -(context.scale(60)),
                          child: Icon(
                            AppIcons.solidStandardMoney01,
                            color: context.appColors.backgroundShade200,
                            size: context.scale(192),
                          ),
                        ),
                        Padding(
                          padding: EdgeInsets.all(context.scale(24)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            spacing: context.scale(12),
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    'MONTHLY REVENUE',
                                    style: TextStyle(
                                      color: context.appColors.neutralShade650,
                                      fontSize: context.scale(12),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  Text(
                                    '₹145.00K',
                                    style: TextStyle(
                                      color: context.appColors.neutralShade650,
                                      fontSize: context.scale(36),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                              Row(
                                spacing: context.scale(6),
                                children: [
                                  Icon(
                                    Icons.trending_up,
                                    color: context.appColors.neutralShade650,
                                    size: context.scale(18),
                                  ),
                                  Text(
                                    '+12.5% from last month',
                                    style: TextStyle(
                                      color: context.appColors.neutralShade650,
                                      fontSize: context.scale(14),
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
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Divider(
              color: context.appColors.backgroundShade200,
              height: 1.0,
            ),
          ),
          PinnedHeaderSliver(
            child: Padding(
              padding: EdgeInsets.all(context.scale(24)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: context.scale(20),
                children: [
                  Text(
                    'Transaction History',
                    style: TextStyle(
                      color: context.appColors.neutralShade650,
                      fontSize: context.scale(16),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    spacing: context.scale(16),
                    children: [
                      Material(
                        clipBehavior: Clip.hardEdge,
                        color: context.appColors.backgroundShade100,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(context.scale(6)),
                          side: BorderSide(color: context.appColors.backgroundShade200),
                        ),
                        child: InkWell(
                          highlightColor: context.appColors.backgroundShade200.withAlpha(63),
                          onTap: () {},
                          splashColor: context.appColors.backgroundShade200.withAlpha(127),
                          child: Padding(
                            padding: EdgeInsets.all(context.scale(12)),
                            child: Row(
                              spacing: context.scale(6),
                              children: [
                                Icon(
                                  AppIcons.solidRoundedFile01,
                                  color: context.appColors.neutralShade650,
                                  size: context.scale(16),
                                ),
                                Text(
                                  'Download Statement',
                                  style: TextStyle(
                                    color: context.appColors.neutralShade650,
                                    fontSize: context.scale(12),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Material(
                        clipBehavior: Clip.hardEdge,
                        color: context.appColors.backgroundShade100,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(context.scale(6)),
                          side: BorderSide(color: context.appColors.backgroundShade200),
                        ),
                        child: InkWell(
                          highlightColor: context.appColors.backgroundShade200.withAlpha(63),
                          onTap: () => Dialogs.of(context).showCustomDialog(
                            padding: EdgeInsets.zero,
                            title: 'Filter By',
                            child: FilterDialogWidget(
                              initialValue: TransactionFilterModel(
                                amountRange: AmountRangeModel(min: 0, max: 5000),
                                dateRange: DateRangeModel(from: DateTime.now(), to: DateTime.now()),
                                sortOption: SortOptionModel(sortBy: SortByEnum.date),
                              ),
                              onApplyPressed: (TransactionFilterModel value) {},
                            ),
                          ),
                          splashColor: context.appColors.backgroundShade200.withAlpha(127),
                          child: Padding(
                            padding: EdgeInsets.all(context.scale(12)),
                            child: Row(
                              spacing: context.scale(6),
                              children: [
                                Icon(
                                  AppIcons.solidRoundedFilterHorizontal,
                                  color: context.appColors.neutralShade650,
                                  size: context.scale(16),
                                ),
                                Text(
                                  'Filter',
                                  style: TextStyle(
                                    color: context.appColors.neutralShade650,
                                    fontSize: context.scale(12),
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
          PinnedHeaderSliver(
            child: Divider(
              color: context.appColors.backgroundShade200,
              height: 1.0,
            ),
          ),
          DecoratedSliver(
            decoration: BoxDecoration(color: context.appColors.backgroundShade75),
            sliver: SliverPadding(
              padding: EdgeInsets.all(context.scale(24)),
              sliver: SliverList.separated(
                itemBuilder: (BuildContext context, int index) {
                  return Column(
                    spacing: context.scale(16),
                    children: [
                      Row(
                        spacing: context.scale(12),
                        children: [
                          Text(
                            '13 DECEMBER 2024',
                            style: TextStyle(
                              color: context.appColors.neutralShade650,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Expanded(
                            child: Divider(
                              color: context.appColors.backgroundShade400,
                              height: 1.0,
                            ),
                          ),
                        ],
                      ),
                      ListView.separated(
                        itemBuilder: (BuildContext context, int index) {
                          return TransactionWidget();
                        },
                        itemCount: 3,
                        padding: EdgeInsets.zero,
                        physics: const NeverScrollableScrollPhysics(),
                        separatorBuilder: (BuildContext context, int index) {
                          return SizedBox(
                            height: context.scale(16),
                          );
                        },
                        shrinkWrap: true,
                      ),
                    ],
                  );
                },
                itemCount: 2,
                separatorBuilder: (BuildContext context, int index) {
                  return SizedBox(
                    height: context.scale(24),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
