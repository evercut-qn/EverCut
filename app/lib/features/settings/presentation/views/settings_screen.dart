// lib/features/settings/presentation/views/settings_screen.dart

import 'package:flutter/material.dart';

import '../../../../core/constants/navigation/route_segments.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/extensions/context/go_router_extension.dart';
import '../models/settings_tile.dart';
import '../models/settings_tile_block.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final Set<SettingsTileBlock> _tiles = <SettingsTileBlock>{};

  @override
  void initState() {
    super.initState();

    _tiles.addAll(<SettingsTileBlock>{
      SettingsTileBlock(
        heading: 'Account & Preferences',
        tiles: <SettingsTile>{
          SettingsTile(
            icon: AppIcons.solidRoundedUserSettings01,
            onTap: () => context.pushNested(RouteSegments.manageAccount),
            title: 'Manage Account',
          ),
          SettingsTile(
            icon: AppIcons.solidRoundedOffice,
            onTap: () => context.pushNested(RouteSegments.settingsBusinessProfile),
            title: 'Business Profile',
          ),
          SettingsTile(
            icon: AppIcons.solidRoundedCreditCard,
            onTap: () {},
            title: 'Subscription & Billing',
          ),
          SettingsTile(
            icon: AppIcons.solidRoundedDarkMode,
            onTap: () => context.pushNested(RouteSegments.appearance),
            title: 'Appearance',
          ),
          SettingsTile(
            icon: AppIcons.solidRoundedNotification01,
            onTap: () => context.pushNested(RouteSegments.settingsNotifications),
            title: 'Notifications',
          ),
        },
      ),
      SettingsTileBlock(
        heading: 'Support & Legal',
        tiles: <SettingsTile>{
          SettingsTile(
            icon: AppIcons.solidRoundedCustomerSupport,
            onTap: () {},
            title: 'Contact Us',
          ),
          SettingsTile(
            icon: AppIcons.solidRoundedAgreement03,
            onTap: () {},
            title: 'Terms & Conditions',
          ),
          SettingsTile(
            icon: AppIcons.solidRoundedShield02,
            onTap: () {},
            title: 'Privacy Policy',
          ),
        },
      ),
      SettingsTileBlock(
        heading: 'Other Settings',
        tiles: <SettingsTile>{
          SettingsTile(
            icon: AppIcons.solidRoundedWaste,
            onTap: () {},
            title: 'Clear App Cache',
            showArrow: false,
          ),
          SettingsTile(
            icon: AppIcons.solidRoundedLogout01,
            onTap: () {},
            title: 'Log Out',
            showArrow: false,
          ),
        },
      ),
    });
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Material(
        color: context.appColors.backgroundShade200,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.all(context.scale(24)).copyWith(
                top: context.systemPadding.top + context.scale(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: context.scale(48),
                children: [
                  Text(
                    'Settings',
                    style: TextStyle(
                      fontSize: context.scale(20),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Row(
                    spacing: context.scale(18),
                    children: [
                      CircleAvatar(
                        backgroundColor: context.appColors.scaffoldBackgroundColor,
                        radius: context.scale(32),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'John Doe',
                              maxLines: 1,
                              style: TextStyle(
                                fontSize: context.scale(20),
                                fontWeight: FontWeight.w700,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              'johndoe@example.com',
                              maxLines: 1,
                              style: TextStyle(
                                fontSize: context.scale(12),
                                fontWeight: FontWeight.w400,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: Material(
                color: context.appColors.scaffoldBackgroundColor,
                clipBehavior: Clip.hardEdge,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadiusGeometry.vertical(
                    top: Radius.circular(
                      context.scale(24),
                    ),
                  ),
                ),
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(context.scale(24)),
                  child: Column(
                    spacing: context.scale(24),
                    children: _tiles.map((SettingsTileBlock block) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: context.scale(12),
                        children: [
                          Text(
                            block.heading,
                            style: TextStyle(
                              color: context.appColors.neutralShade650,
                              fontSize: context.scale(14),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Column(
                            spacing: context.scale(2),
                            children: block.tiles.toList().asMap().entries.map((entry) {
                              return ListTile(
                                contentPadding: EdgeInsets.all(context.scale(16)),
                                horizontalTitleGap: context.scale(16),
                                leading: Icon(
                                  entry.value.icon,
                                  color: context.appColors.neutralShade650,
                                  size: context.scale(20),
                                ),
                                minLeadingWidth: 0,
                                minTileHeight: 0,
                                minVerticalPadding: 0,
                                onTap: entry.value.onTap,
                                shape: () {
                                  if (entry.key == 0) {
                                    return RoundedRectangleBorder(
                                      borderRadius: BorderRadius.vertical(
                                        top: Radius.circular(context.scale(12)),
                                        bottom: Radius.circular(context.scale(6)),
                                      ),
                                    );
                                  } else if (entry.key == block.tiles.length - 1) {
                                    return RoundedRectangleBorder(
                                      borderRadius: BorderRadius.vertical(
                                        top: Radius.circular(context.scale(6)),
                                        bottom: Radius.circular(context.scale(12)),
                                      ),
                                    );
                                  } else {
                                    return RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(
                                        context.scale(6),
                                      ),
                                    );
                                  }
                                }(),
                                tileColor: context.appColors.backgroundShade100,
                                title: Text(
                                  entry.value.title,
                                  style: TextStyle(
                                    color: context.appColors.neutralShade650,
                                    fontSize: context.scale(14),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                trailing: () {
                                  if (entry.value.showArrow) {
                                    return Icon(
                                      AppIcons.strokeStandardArrowRight01,
                                      color: context.appColors.neutralShade650,
                                      size: context.scale(20),
                                    );
                                  } else {
                                    return null;
                                  }
                                }(),
                              );
                            }).toList(),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
