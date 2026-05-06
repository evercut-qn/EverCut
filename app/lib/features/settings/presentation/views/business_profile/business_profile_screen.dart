// lib/features/settings/presentation/views/business_profile/business_profile_screen.dart

import 'package:flutter/material.dart';

import '../../../../../core/constants/navigation/route_segments.dart';
import '../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../core/theme/foundation/colors/light_color_tokens.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/extensions/context/go_router_extension.dart';
import '../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../shared/widgets/common/section/section_header.dart';
import '../../models/settings_tile.dart';

class BusinessProfileScreen extends StatefulWidget {
  const BusinessProfileScreen({super.key});

  @override
  State<BusinessProfileScreen> createState() => _BusinessProfileScreenState();
}

class _BusinessProfileScreenState extends State<BusinessProfileScreen> {
  final Set<SettingsTile> _profileActions = <SettingsTile>{};

  @override
  void initState() {
    super.initState();

    _profileActions.addAll(<SettingsTile>{
      SettingsTile(
        icon: AppIcons.solidRoundedPropertyEdit,
        title: 'Edit Business Profile',
        onTap: () => context.pushNested(RouteSegments.editBusinessProfile),
      ),
      SettingsTile(
        icon: AppIcons.solidRoundedUserGroup,
        title: 'Employee Management',
        onTap: () => context.pushNested(RouteSegments.employeeManagement),
      ),
      SettingsTile(
        icon: AppIcons.solidRoundedTag01,
        title: 'Manage Services',
        onTap: () => context.pushNested(RouteSegments.manageServices),
      ),
      SettingsTile(
        icon: AppIcons.solidRoundedPayment01,
        title: 'UPI Details',
        onTap: () => context.pushNested(RouteSegments.upiDetails),
      ),
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Business Profile')),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  spacing: context.scale(24),
                  children: [
                    AspectRatio(
                      aspectRatio: 1.25,
                      child: LayoutBuilder(
                        builder: (BuildContext context, BoxConstraints constraints) {
                          return Stack(
                            children: [
                              Positioned.fill(
                                child: CustomPaint(
                                  painter: ShopImageSectionPainter(context),
                                  child: ClipPath(
                                    clipBehavior: Clip.hardEdge,
                                    clipper: ShopImageSectionClipper(context),
                                    child: Container(
                                      alignment: Alignment.bottomLeft,
                                      clipBehavior: Clip.hardEdge,
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(
                                          begin: Alignment.topCenter,
                                          colors: [Colors.transparent, Colors.black],
                                          end: Alignment.bottomCenter,
                                        ),
                                      ),
                                      padding: EdgeInsets.all(context.scale(18)),
                                      child: SizedBox(
                                        width: constraints.maxWidth - constraints.maxHeight * 0.3 - context.scale(34),
                                        child: Text(
                                          'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
                                          maxLines: 2,
                                          style: TextStyle(
                                            color: LightColorTokens.scaffoldBackgroundColor,
                                            fontSize: context.scale(18),
                                            fontWeight: FontWeight.w700,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              Positioned(
                                bottom: 0,
                                right: 0,
                                child: Material(
                                  color: context.appColors.backgroundShade100,
                                  clipBehavior: Clip.hardEdge,
                                  shape: CircleBorder(
                                    side: BorderSide(
                                      color: context.appColors.backgroundShade200,
                                      width: context.scale(2),
                                    ),
                                  ),
                                  child: SizedBox.square(
                                    dimension: constraints.maxHeight * 0.3 - context.scale(16),
                                  ),
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                    Column(
                      spacing: context.scale(16),
                      children: [
                        CustomTextFormField(
                          enabled: false,
                          labelText: 'Business Category',
                          prefixIcon: AppIcons.solidRoundedTag01,
                        ),
                        CustomTextFormField(
                          enabled: false,
                          labelText: 'Target Customers',
                          prefixIcon: AppIcons.solidRoundedUserGroup,
                        ),
                        CustomTextFormField(
                          enabled: false,
                          labelText: 'Shop Location',
                          prefixIcon: AppIcons.solidRoundedStoreLocation02,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Divider(height: 1.0),
              Column(
                children: [
                  Padding(
                    padding: EdgeInsets.all(context.scale(24)).copyWith(bottom: context.scale(8)),
                    child: const SectionHeader(
                      title: 'Shop Settings',
                      description: 'Edit your shop profile, easily manage your employees, services, and payment options.',
                    ),
                  ),
                  Padding(
                    padding: EdgeInsets.all(context.scale(8)).copyWith(top: 0),
                    child: Column(
                      spacing: context.scale(2),
                      children: _profileActions.toList().asMap().entries.map((entry) {
                        return Theme(
                          data: Theme.of(context).copyWith(
                            highlightColor: Colors.transparent,
                            splashColor: Colors.transparent,
                            splashFactory: NoSplash.splashFactory,
                          ),
                          child: ListTile(
                            contentPadding: EdgeInsets.all(context.scale(16)),
                            horizontalTitleGap: context.scale(16),
                            leading: Icon(
                              entry.value.icon,
                              color: entry.value.color ?? context.appColors.neutralShade650,
                              size: context.scale(20),
                            ),
                            minLeadingWidth: 0,
                            minTileHeight: 0,
                            minVerticalPadding: 0,
                            onTap: entry.value.onTap,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(
                                context.scale(6),
                              ),
                            ),
                            title: Text(
                              entry.value.title,
                              style: TextStyle(
                                color: entry.value.color ?? context.appColors.neutralShade650,
                                fontSize: context.scale(14),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            trailing: () {
                              if (entry.value.showArrow) {
                                return Icon(
                                  AppIcons.strokeStandardArrowRight01,
                                  color: entry.value.color ?? context.appColors.neutralShade650,
                                  size: context.scale(20),
                                );
                              } else {
                                return null;
                              }
                            }(),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

Path clipPath(BuildContext context, Size size) {
  final double cornerRadius = context.scale(12);

  final Path path = Path();

  final double rightLineHeight = size.height * 0.7;
  final double innerLineSize = size.height * 0.3;

  path.moveTo(cornerRadius, 0);

  final List<Offset> topRightCorner = <Offset>[
    Offset(size.width - cornerRadius, 0),
    Offset(size.width, cornerRadius),
  ];

  path.lineTo(topRightCorner.first.dx, topRightCorner.first.dy);
  path.arcToPoint(topRightCorner.last, radius: Radius.circular(cornerRadius));

  final List<Offset> bottomRightTopRightCorner = <Offset>[
    Offset(size.width, rightLineHeight - cornerRadius),
    Offset(size.width - cornerRadius, rightLineHeight),
  ];

  path.lineTo(bottomRightTopRightCorner.first.dx, bottomRightTopRightCorner.first.dy);
  path.arcToPoint(bottomRightTopRightCorner.last, radius: Radius.circular(cornerRadius));

  final List<Offset> bottomRightTopLeftCorner = <Offset>[
    Offset(size.width - (innerLineSize - cornerRadius) + context.scale(16), rightLineHeight),
    Offset(size.width - innerLineSize, rightLineHeight + cornerRadius + context.scale(16)),
  ];

  path.lineTo(bottomRightTopLeftCorner.first.dx, bottomRightTopLeftCorner.first.dy);
  path.arcToPoint(bottomRightTopLeftCorner.last, radius: Radius.circular(context.scale(30)), clockwise: false);

  final List<Offset> bottomRightBottomLeftCorner = <Offset>[
    Offset(size.width - innerLineSize, size.height - cornerRadius),
    Offset(size.width - (innerLineSize + cornerRadius), size.height),
  ];

  path.lineTo(bottomRightBottomLeftCorner.first.dx, bottomRightBottomLeftCorner.first.dy);
  path.arcToPoint(bottomRightBottomLeftCorner.last, radius: Radius.circular(cornerRadius));

  final List<Offset> bottomLeftCorner = <Offset>[
    Offset(cornerRadius, size.height),
    Offset(0, size.height - cornerRadius),
  ];

  path.lineTo(bottomLeftCorner.first.dx, bottomLeftCorner.first.dy);
  path.arcToPoint(bottomLeftCorner.last, radius: Radius.circular(cornerRadius));

  final List<Offset> topLeftCorner = <Offset>[
    Offset(0, cornerRadius),
    Offset(cornerRadius, 0),
  ];

  path.lineTo(topLeftCorner.first.dx, topLeftCorner.first.dy);
  path.arcToPoint(topLeftCorner.last, radius: Radius.circular(cornerRadius));

  path.close();

  return path;
}

class ShopImageSectionPainter extends CustomPainter {
  final BuildContext context;

  const ShopImageSectionPainter(
    this.context, {
    super.repaint,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final Path path = clipPath(context, size);

    final fillPaint = Paint();

    fillPaint.color = context.appColors.backgroundShade100;
    fillPaint.style = PaintingStyle.fill;

    canvas.drawPath(path, fillPaint);

    final paint = Paint();

    paint.color = context.appColors.backgroundShade200;
    paint.style = PaintingStyle.stroke;
    paint.strokeWidth = context.scale(2);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return false;
  }
}

class ShopImageSectionClipper extends CustomClipper<Path> {
  final BuildContext context;

  const ShopImageSectionClipper(this.context);

  @override
  Path getClip(Size size) {
    return clipPath(context, size);
  }

  @override
  bool shouldReclip(covariant CustomClipper<dynamic> oldClipper) {
    return false;
  }
}
