// lib/features/settings/presentation/views/business_profile/upi_details/upi_details_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';

class UPIDetailsScreen extends StatefulWidget {
  const UPIDetailsScreen({super.key});

  @override
  State<UPIDetailsScreen> createState() => _UPIDetailsScreenState();
}

class _UPIDetailsScreenState extends State<UPIDetailsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('UPI Details')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            spacing: context.scale(18),
            children: [
              const SectionHeader(
                title: 'Receive Payments via UPI',
                description: 'View and manage the UPI information used to securely receive payments from your customers.',
              ),
              Material(
                clipBehavior: Clip.hardEdge,
                color: context.appColors.backgroundShade100,
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
                        spacing: context.scale(48),
                        children: [
                          Align(
                            alignment: Alignment.topRight,
                            child: Material(
                              color: context.appColors.greenShade100.withAlpha(63),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(context.scale(22)),
                                side: BorderSide(color: context.appColors.greenShade100.withAlpha(127)),
                              ),
                              child: Padding(
                                padding: EdgeInsets.symmetric(
                                  horizontal: context.scale(14),
                                  vertical: context.scale(10),
                                ),
                                child: Text(
                                  'Verified',
                                  style: TextStyle(
                                    color: context.appColors.backgroundShade50,
                                    fontSize: context.scale(12),
                                    fontWeight: FontWeight.w500,
                                    height: 1.0,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          LayoutBuilder(
                            builder: (BuildContext context, BoxConstraints constraints) {
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                spacing: context.scale(12),
                                children: [
                                  SizedBox(
                                    width: constraints.maxWidth * 0.825,
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      spacing: context.scale(2),
                                      children: [
                                        Text(
                                          'Monkey Dragon Luffy',
                                          maxLines: 1,
                                          style: TextStyle(
                                            color: context.appColors.neutralShade850,
                                            fontSize: context.scale(16),
                                            fontWeight: FontWeight.w700,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        Text(
                                          'kingofpirates@onepiece',
                                          maxLines: 1,
                                          style: TextStyle(
                                            color: context.appColors.neutralShade650,
                                            fontSize: context.scale(12),
                                            fontWeight: FontWeight.w400,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Align(
                                    alignment: Alignment.bottomRight,
                                    child: SvgPicture.asset(
                                      'assets/images/svg/light/upi.svg',
                                      width: constraints.maxWidth * 0.175,
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                    Divider(
                      color: context.appColors.backgroundShade200,
                      height: 1.0,
                    ),
                    InkWell(
                      onTap: () {},
                      overlayColor: WidgetStatePropertyAll(context.appColors.backgroundShade200.withAlpha(127)),
                      splashColor: context.appColors.backgroundShade400.withAlpha(127),
                      child: Padding(
                        padding: EdgeInsets.all(context.scale(20)),
                        child: Center(
                          child: Text(
                            'Edit UPI Details',
                            style: TextStyle(
                              color: context.appColors.greenShade100,
                              fontSize: context.scale(12),
                              fontWeight: FontWeight.w500,
                              height: 1.0,
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
      ),
    );
  }
}
