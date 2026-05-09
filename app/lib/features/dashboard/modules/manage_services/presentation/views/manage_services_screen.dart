// lib/features/dashboard/modules/manage_services/presentation/views/manage_services_screen.dart

import 'package:flutter/material.dart';

import '../../../../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../../../../shared/painters/dashed_border.dart';
import '../../../../../../../../../shared/widgets/overlays/bottomsheet.dart';
import '../widgets/add_bundle_service_bottomsheet.dart';
import '../widgets/add_single_service_bottomsheet.dart';

class ManageServicesScreen extends StatelessWidget {
  const ManageServicesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Manage Services'),
          bottom: TabBar(
            tabs: const <Tab>[
              Tab(text: 'Single'),
              Tab(text: 'Bundle'),
            ],
          ),
        ),
        backgroundColor: context.appColors.backgroundShade75,
        body: SafeArea(
          child: TabBarView(
            children: [
              SingleChildScrollView(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  spacing: context.scale(24),
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
                            padding: EdgeInsets.all(context.scale(16)),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              spacing: context.scale(16),
                              children: [
                                Row(
                                  spacing: context.scale(16),
                                  children: [
                                    SizedBox.square(
                                      dimension: context.scale(56),
                                      child: Material(
                                        borderRadius: BorderRadius.circular(context.scale(6)),
                                        color: context.appColors.backgroundShade100,
                                      ),
                                    ),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.stretch,
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        spacing: context.scale(6),
                                        children: [
                                          Text(
                                            'Hair Cut',
                                            style: TextStyle(
                                              color: context.appColors.neutralShade850,
                                              fontSize: context.scale(14),
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                          IntrinsicHeight(
                                            child: Row(
                                              spacing: context.scale(8),
                                              children: [
                                                Row(
                                                  spacing: context.scale(6),
                                                  children: [
                                                    Icon(
                                                      AppIcons.solidRoundedUserAccount,
                                                      color: context.appColors.blueShade100,
                                                      size: context.scale(16),
                                                    ),
                                                    Text(
                                                      'Male',
                                                      maxLines: 1,
                                                      style: TextStyle(
                                                        color: context.appColors.neutralShade650,
                                                        fontSize: context.scale(12),
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                VerticalDivider(
                                                  color: context.appColors.backgroundShade200,
                                                  width: 1.0,
                                                ),
                                                Row(
                                                  spacing: context.scale(6),
                                                  children: [
                                                    Icon(
                                                      AppIcons.solidRoundedMoney01,
                                                      color: context.appColors.greenShade100,
                                                      size: context.scale(16),
                                                    ),
                                                    Text(
                                                      '₹100',
                                                      maxLines: 1,
                                                      style: TextStyle(
                                                        color: context.appColors.neutralShade650,
                                                        fontSize: context.scale(12),
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                VerticalDivider(
                                                  color: context.appColors.backgroundShade200,
                                                  width: 1.0,
                                                ),
                                                Row(
                                                  spacing: context.scale(6),
                                                  children: [
                                                    Icon(
                                                      AppIcons.solidRoundedTimer02,
                                                      color: context.appColors.orangeShade100,
                                                      size: context.scale(16),
                                                    ),
                                                    Text(
                                                      '01 Hr 30 Min',
                                                      maxLines: 1,
                                                      style: TextStyle(
                                                        color: context.appColors.neutralShade650,
                                                        fontSize: context.scale(12),
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
                                  ],
                                ),
                                Material(
                                  borderRadius: BorderRadius.circular(context.scale(6)),
                                  color: context.appColors.greenShade100.withAlpha(31),
                                  child: CustomPaint(
                                    painter: DashedBorderPainter(
                                      borderRadius: context.scale(6),
                                      color: context.appColors.greenShade100,
                                      dashPattern: [context.scale(4), context.scale(4)],
                                    ),
                                    child: Padding(
                                      padding: EdgeInsets.all(context.scale(12)),
                                      child: IntrinsicHeight(
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          spacing: context.scale(12),
                                          children: [
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.center,
                                              spacing: context.scale(8),
                                              children: [
                                                Text(
                                                  'You earn',
                                                  maxLines: 1,
                                                  style: TextStyle(
                                                    color: context.appColors.neutralShade650,
                                                    fontSize: context.scale(10),
                                                    fontWeight: FontWeight.w700,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                                Text(
                                                  '₹80',
                                                  maxLines: 1,
                                                  style: TextStyle(
                                                    color: context.appColors.greenShade300,
                                                    fontSize: context.scale(16),
                                                    fontWeight: FontWeight.w700,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            Material(
                                              borderRadius: BorderRadius.circular(context.scale(6)),
                                              clipBehavior: Clip.hardEdge,
                                              color: context.appColors.greenShade300,
                                              child: Padding(
                                                padding: EdgeInsets.symmetric(
                                                  horizontal: context.scale(12),
                                                  vertical: context.scale(8),
                                                ),
                                                child: Text(
                                                  '₹20 OFF',
                                                  maxLines: 1,
                                                  style: TextStyle(
                                                    color: context.appColors.neutralShade50,
                                                    fontSize: context.scale(10),
                                                    fontWeight: FontWeight.w700,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
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
                          IntrinsicHeight(
                            child: Row(
                              children: [
                                Expanded(
                                  child: InkWell(
                                    highlightColor: context.appColors.backgroundShade200.withAlpha(31),
                                    onTap: () {},
                                    splashColor: context.appColors.backgroundShade200.withAlpha(63),
                                    child: Padding(
                                      padding: EdgeInsets.all(context.scale(18)),
                                      child: Center(
                                        child: Text(
                                          'Delete',
                                          style: TextStyle(
                                            color: context.appColors.redShade100,
                                            fontSize: context.scale(12.75),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: EdgeInsets.symmetric(vertical: context.scale(12)),
                                  child: VerticalDivider(
                                    color: context.appColors.backgroundShade200,
                                    width: 1.0,
                                  ),
                                ),
                                Expanded(
                                  child: InkWell(
                                    highlightColor: context.appColors.backgroundShade200.withAlpha(31),
                                    onTap: () {},
                                    splashColor: context.appColors.backgroundShade200.withAlpha(63),
                                    child: Padding(
                                      padding: EdgeInsets.all(context.scale(18)),
                                      child: Center(
                                        child: Text(
                                          'Edit',
                                          style: TextStyle(
                                            color: context.appColors.neutralShade650,
                                            fontSize: context.scale(12.75),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
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
                  ],
                ),
              ),
              SingleChildScrollView(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  spacing: context.scale(24),
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
                            padding: EdgeInsets.all(context.scale(16)),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              spacing: context.scale(16),
                              children: [
                                Row(
                                  spacing: context.scale(16),
                                  children: [
                                    SizedBox.square(
                                      dimension: context.scale(56),
                                      child: Material(
                                        borderRadius: BorderRadius.circular(context.scale(6)),
                                        color: context.appColors.backgroundShade100,
                                      ),
                                    ),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.stretch,
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        spacing: context.scale(4.25),
                                        children: [
                                          Text(
                                            'Dashing Star',
                                            style: TextStyle(
                                              color: context.appColors.neutralShade850,
                                              fontSize: context.scale(14),
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                          IntrinsicHeight(
                                            child: Row(
                                              spacing: context.scale(8),
                                              children: [
                                                Row(
                                                  spacing: context.scale(6),
                                                  children: [
                                                    Icon(
                                                      AppIcons.solidRoundedUserAccount,
                                                      color: context.appColors.blueShade100,
                                                      size: context.scale(16),
                                                    ),
                                                    Text(
                                                      'Male',
                                                      style: TextStyle(
                                                        color: context.appColors.neutralShade650,
                                                        fontSize: context.scale(12),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                VerticalDivider(
                                                  color: context.appColors.backgroundShade200,
                                                  width: 1.0,
                                                ),
                                                Row(
                                                  spacing: context.scale(6),
                                                  children: [
                                                    Icon(
                                                      AppIcons.solidRoundedMoney01,
                                                      color: context.appColors.greenShade100,
                                                      size: context.scale(16),
                                                    ),
                                                    Text(
                                                      '₹100',
                                                      style: TextStyle(
                                                        color: context.appColors.neutralShade650,
                                                        fontSize: context.scale(12),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                VerticalDivider(
                                                  color: context.appColors.backgroundShade200,
                                                  width: 1.0,
                                                ),
                                                Row(
                                                  spacing: context.scale(6),
                                                  children: [
                                                    Icon(
                                                      AppIcons.solidRoundedTimer02,
                                                      color: context.appColors.orangeShade100,
                                                      size: context.scale(16),
                                                    ),
                                                    Text(
                                                      '01 Hr 30 Min',
                                                      maxLines: 1,
                                                      style: TextStyle(
                                                        color: context.appColors.neutralShade650,
                                                        fontSize: context.scale(12),
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
                                  ],
                                ),
                                Material(
                                  borderRadius: BorderRadius.circular(context.scale(6)),
                                  color: context.appColors.greenShade100.withAlpha(31),
                                  child: CustomPaint(
                                    painter: DashedBorderPainter(
                                      borderRadius: context.scale(6),
                                      color: context.appColors.greenShade100,
                                      dashPattern: [context.scale(4), context.scale(4)],
                                    ),
                                    child: Padding(
                                      padding: EdgeInsets.all(context.scale(12)),
                                      child: IntrinsicHeight(
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          spacing: context.scale(12),
                                          children: [
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.center,
                                              spacing: context.scale(8),
                                              children: [
                                                Text(
                                                  'You earn',
                                                  maxLines: 1,
                                                  style: TextStyle(
                                                    color: context.appColors.neutralShade650,
                                                    fontSize: context.scale(10),
                                                    fontWeight: FontWeight.w700,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                                Text(
                                                  '₹80',
                                                  maxLines: 1,
                                                  style: TextStyle(
                                                    color: context.appColors.greenShade300,
                                                    fontSize: context.scale(16),
                                                    fontWeight: FontWeight.w700,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            Material(
                                              borderRadius: BorderRadius.circular(context.scale(6)),
                                              clipBehavior: Clip.hardEdge,
                                              color: context.appColors.greenShade300,
                                              child: Padding(
                                                padding: EdgeInsets.symmetric(
                                                  horizontal: context.scale(12),
                                                  vertical: context.scale(8),
                                                ),
                                                child: Text(
                                                  '₹20 OFF',
                                                  maxLines: 1,
                                                  style: TextStyle(
                                                    color: context.appColors.neutralShade50,
                                                    fontSize: context.scale(10),
                                                    fontWeight: FontWeight.w700,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
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
                            padding: EdgeInsets.all(context.scale(16)),
                            child: Wrap(
                              alignment: WrapAlignment.start,
                              runAlignment: WrapAlignment.start,
                              runSpacing: context.scale(12),
                              spacing: context.scale(12),
                              children: ['Hair Cut', 'Beard', 'Facial', 'Massage', 'Hair Color', 'Clean-Up'].map((entry) {
                                return Material(
                                  borderRadius: BorderRadius.circular(context.scale(6)),
                                  color: context.appColors.backgroundShade100,
                                  child: Padding(
                                    padding: EdgeInsets.symmetric(
                                      horizontal: context.scale(12),
                                      vertical: context.scale(6),
                                    ),
                                    child: Text(
                                      entry,
                                      style: TextStyle(
                                        color: context.appColors.neutralShade650,
                                        fontSize: context.scale(12),
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                          Divider(
                            color: context.appColors.backgroundShade200,
                            height: 1.0,
                          ),
                          IntrinsicHeight(
                            child: Row(
                              children: [
                                Expanded(
                                  child: InkWell(
                                    highlightColor: context.appColors.backgroundShade200.withAlpha(31),
                                    onTap: () {},
                                    splashColor: context.appColors.backgroundShade200.withAlpha(63),
                                    child: Padding(
                                      padding: EdgeInsets.all(context.scale(18)),
                                      child: Center(
                                        child: Text(
                                          'Delete',
                                          style: TextStyle(
                                            color: context.appColors.redShade100,
                                            fontSize: context.scale(12.75),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: EdgeInsets.symmetric(vertical: context.scale(12)),
                                  child: VerticalDivider(
                                    color: context.appColors.backgroundShade200,
                                    width: 1.0,
                                  ),
                                ),
                                Expanded(
                                  child: InkWell(
                                    highlightColor: context.appColors.backgroundShade200.withAlpha(31),
                                    onTap: () {},
                                    splashColor: context.appColors.backgroundShade200.withAlpha(63),
                                    child: Padding(
                                      padding: EdgeInsets.all(context.scale(18)),
                                      child: Center(
                                        child: Text(
                                          'Edit',
                                          style: TextStyle(
                                            color: context.appColors.neutralShade650,
                                            fontSize: context.scale(12.75),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
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
                  ],
                ),
              ),
            ],
          ),
        ),
        floatingActionButton: Builder(
          builder: (BuildContext context) {
            return FloatingActionButton(
              onPressed: () {
                switch (DefaultTabController.of(context).index) {
                  case 0:
                    showCustomBottomsheet(
                      context: context,
                      builder: (BuildContext context) => AddSingleServiceBottomsheetWidget(),
                      padding: EdgeInsets.zero,
                      scrollable: false,
                    );
                  case 1:
                    showCustomBottomsheet(
                      context: context,
                      builder: (BuildContext context) => AddBundleServiceBottomsheetWidget(),
                      padding: EdgeInsets.zero,
                    );
                }
              },
              child: const Icon(Icons.add),
            );
          },
        ),
      ),
    );
  }
}
