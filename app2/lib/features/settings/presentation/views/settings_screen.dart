// lib/features/settings/presentation/views/settings_screen.dart

import 'package:flutter/material.dart';

import '../../../../core/constants/navigation/route_segments.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/extensions/context/go_router_extension.dart';
import '../widgets/settings_section.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: context.appColors.backgroundShade125,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: EdgeInsets.all(context.scale(24)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
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
                        backgroundColor: context.appColors.backgroundShade225,
                        radius: context.scale(32),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
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
                clipBehavior: Clip.hardEdge,
                color: context.appColors.backgroundShade50,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadiusGeometry.vertical(top: Radius.circular(context.scale(24))),
                  side: BorderSide(color: context.appColors.backgroundShade200),
                ),
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(context.scale(24)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: context.scale(24),
                    children: <SettingsSectionWidget>[
                      SettingsSectionWidget(
                        title: 'Account & Preferences',
                        tiles: <SettingsTileWidget>[
                          SettingsTileWidget(
                            icon: AppIcons.solidRoundedUserSettings01,
                            isFirst: true,
                            onTap: () => context.pushNested(RouteSegments.manageAccount),
                            title: 'Manage Account',
                          ),
                          SettingsTileWidget(
                            icon: AppIcons.solidRoundedOffice,
                            onTap: () {}, // => context.pushNested(RouteSegments.businessProfile),
                            title: 'Business Profile',
                          ),
                          SettingsTileWidget(
                            icon: AppIcons.solidRoundedDarkMode,
                            onTap: () => context.pushNested(RouteSegments.appearance),
                            title: 'Appearance',
                          ),
                          SettingsTileWidget(
                            icon: AppIcons.solidRoundedNotification01,
                            isLast: true,
                            onTap: () => context.pushNested(RouteSegments.notifications),
                            title: 'Notifications',
                          ),
                        ],
                      ),
                      SettingsSectionWidget(
                        title: 'Support & Legal',
                        tiles: <SettingsTileWidget>[
                          SettingsTileWidget(
                            icon: AppIcons.solidRoundedCustomerSupport,
                            isFirst: true,
                            onTap: () {},
                            title: 'Contact Us',
                          ),
                          SettingsTileWidget(
                            icon: AppIcons.solidRoundedAgreement03,
                            onTap: () => context.pushNested(RouteSegments.termsOfService),
                            title: 'Terms of Service',
                          ),
                          SettingsTileWidget(
                            icon: AppIcons.solidRoundedShield02,
                            isLast: true,
                            onTap: () => context.pushNested(RouteSegments.privacyPolicy),
                            title: 'Privacy Policy',
                          ),
                        ],
                      ),
                      SettingsSectionWidget(
                        title: 'Other Settings',
                        tiles: <SettingsTileWidget>[
                          SettingsTileWidget(
                            icon: AppIcons.solidRoundedWaste,
                            isFirst: true,
                            onTap: () {},
                            showArrow: false,
                            title: 'Clear App Cache',
                          ),
                          SettingsTileWidget(
                            color: context.appColors.redShade100,
                            icon: AppIcons.solidRoundedLogout01,
                            isLast: true,
                            onTap: () {},
                            showArrow: false,
                            title: 'Log Out',
                          ),
                        ],
                      ),
                    ],
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
