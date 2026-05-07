// lib/features/transactions/presentation/widgets/transaction.dart

import 'package:flutter/material.dart';

import '../../../../core/constants/navigation/route_segments.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/extensions/context/go_router_extension.dart';

class TransactionWidget extends StatelessWidget {
  const TransactionWidget({super.key});

  @override
  Widget build(BuildContext context) {
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
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: context.scale(6),
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
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
                            ],
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
  }
}
