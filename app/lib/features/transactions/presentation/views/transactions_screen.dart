// lib/features/transactions/presentation/views/transactions_screen.dart

import 'package:flutter/material.dart';

import '../../../../core/constants/navigation/route_segments.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/enums/sort.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/extensions/context/go_router_extension.dart';
import '../../../../shared/models/amount_range.dart';
import '../../../../shared/models/date_range.dart';
import '../../../../shared/models/sort_option.dart';
import '../../../../shared/widgets/overlays/dialogs.dart';
import '../models/transaction_filter.dart';
import '../widgets/filter_dialog.dart';

class TransactionsScreen extends StatelessWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: DecoratedBox(
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: context.appColors.primaryDividerColor,
                    width: 1.0,
                  ),
                ),
                color: context.appColors.scaffoldBackgroundColor,
              ),
              child: Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                              crossAxisAlignment: CrossAxisAlignment.start,
                              spacing: context.scale(12),
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
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
          ),
          PinnedHeaderSliver(
            child: DecoratedBox(
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: context.appColors.primaryDividerColor,
                    width: 1.0,
                  ),
                ),
                color: context.appColors.scaffoldBackgroundColor,
              ),
              child: Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                              child: FilterDialog(
                                initialValue: TransactionFilter(
                                  amountRange: AmountRange(min: 0, max: 5000),
                                  dateRange: DateRange(from: DateTime.now(), to: DateTime.now()),
                                  sortOption: SortOption(sortBy: SortBy.date),
                                ),
                                onApplyPressed: (TransactionFilter value) {},
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
          ),
          SliverToBoxAdapter(
            child: ColoredBox(
              color: context.appColors.backgroundShade75,
              child: Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: ListView.separated(
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
                            return Material(
                              clipBehavior: Clip.hardEdge,
                              color: context.appColors.backgroundShade50,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(context.scale(12)),
                                side: BorderSide(color: context.appColors.backgroundShade200),
                              ),
                              child: InkWell(
                                highlightColor: context.appColors.backgroundShade200.withAlpha(31),
                                onTap: () => context.pushNested(RouteSegments.transactionDetails),
                                splashColor: context.appColors.backgroundShade200.withAlpha(63),
                                child: Padding(
                                  padding: EdgeInsets.all(context.scale(20)),
                                  child: Row(
                                    spacing: context.scale(16),
                                    children: [
                                      CircleAvatar(
                                        backgroundColor: context.appColors.backgroundShade100,
                                        radius: context.scale(24),
                                      ),
                                      Expanded(
                                        child: Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                spacing: context.scale(2),
                                                children: [
                                                  Text(
                                                    'Received From',
                                                    maxLines: 1,
                                                    style: TextStyle(
                                                      color: context.appColors.neutralShade650,
                                                      fontSize: context.scale(11),
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                  Text(
                                                    'Elena Vance',
                                                    maxLines: 1,
                                                    style: TextStyle(
                                                      color: context.appColors.neutralShade850,
                                                      fontSize: context.scale(15),
                                                      fontWeight: FontWeight.w700,
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                  Row(
                                                    mainAxisAlignment: MainAxisAlignment.start,
                                                    spacing: context.scale(6),
                                                    children: [
                                                      Icon(
                                                        AppIcons.solidRoundedUserAccount,
                                                        color: context.appColors.neutralShade850,
                                                        size: context.scale(16),
                                                      ),
                                                      Flexible(
                                                        child: Text(
                                                          'username@bank',
                                                          maxLines: 1,
                                                          style: TextStyle(
                                                            color: context.appColors.neutralShade850,
                                                            fontSize: context.scale(11),
                                                            fontWeight: FontWeight.w500,
                                                            overflow: TextOverflow.ellipsis,
                                                          ),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ],
                                              ),
                                            ),
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.end,
                                              spacing: context.scale(2),
                                              children: [
                                                Text(
                                                  '10:30 AM',
                                                  maxLines: 1,
                                                  style: TextStyle(
                                                    color: context.appColors.neutralShade650,
                                                    fontSize: context.scale(11),
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                                Text(
                                                  '₹145.00K',
                                                  maxLines: 1,
                                                  style: TextStyle(
                                                    color: context.appColors.greenShade100,
                                                    fontSize: context.scale(15),
                                                    fontWeight: FontWeight.w700,
                                                    overflow: TextOverflow.ellipsis,
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
                              ),
                            );
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
                  padding: EdgeInsets.zero,
                  physics: const NeverScrollableScrollPhysics(),
                  separatorBuilder: (BuildContext context, int index) {
                    return SizedBox(
                      height: context.scale(24),
                    );
                  },
                  shrinkWrap: true,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
