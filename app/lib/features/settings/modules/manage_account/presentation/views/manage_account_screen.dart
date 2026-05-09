// lib/features/settings/modules/manage_account/presentation/views/manage_account_screen.dart

import 'package:flutter/material.dart';

import '../../../../../../core/constants/navigation/route_segments.dart';
import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/extensions/context/go_router_extension.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../presentation/widgets/settings_section.dart';
import '../widgets/profile_avatar.dart';
import '../widgets/profile_info_tile.dart';

class ManageAccountScreen extends StatelessWidget {
  const ManageAccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Manage Account')),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  spacing: context.scale(24),
                  children: [
                    const ProfileAvatarWidget(),
                    Material(
                      clipBehavior: Clip.hardEdge,
                      color: context.appColors.backgroundShade75,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(context.scale(12)),
                        side: BorderSide(color: context.appColors.backgroundShade200),
                      ),
                      child: Padding(
                        padding: EdgeInsets.all(context.scale(16)),
                        child: Column(
                          spacing: context.scale(16),
                          children: [
                            ProfileInfoTileWidget(
                              icon: AppIcons.solidRoundedUser,
                              text: 'John Doe',
                            ),
                            Divider(
                              color: context.appColors.backgroundShade200,
                              height: 1.0,
                            ),
                            ProfileInfoTileWidget(
                              icon: AppIcons.solidRoundedMail01,
                              text: 'john.doe@example.com',
                            ),
                            Divider(
                              color: context.appColors.backgroundShade200,
                              height: 1.0,
                            ),
                            ProfileInfoTileWidget(
                              icon: AppIcons.solidRoundedCall,
                              text: 'john.doe@example.com',
                            ),
                            Divider(
                              color: context.appColors.backgroundShade200,
                              height: 1.0,
                            ),
                            IntrinsicHeight(
                              child: Row(
                                spacing: context.scale(16),
                                children: [
                                  Expanded(
                                    child: ProfileInfoTileWidget(
                                      icon: AppIcons.solidRoundedCalendar02,
                                      text: '01 January 2026',
                                    ),
                                  ),
                                  VerticalDivider(
                                    color: context.appColors.backgroundShade200,
                                    width: 1.0,
                                  ),
                                  Expanded(
                                    child: ProfileInfoTileWidget(
                                      icon: AppIcons.solidRoundedUserAccount,
                                      text: 'Female',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
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
                padding: EdgeInsets.all(context.scale(8)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: context.scale(8),
                  children: [
                    Padding(
                      padding: EdgeInsets.all(context.scale(16)).copyWith(bottom: 0),
                      child: const SectionHeader(
                        title: 'Account Actions',
                        description: 'Update personal details, enhance account security, or request permanent account deletion.',
                      ),
                    ),
                    Theme(
                      data: Theme.of(context).copyWith(
                        highlightColor: Colors.transparent,
                        splashColor: Colors.transparent,
                        splashFactory: NoSplash.splashFactory,
                      ),
                      child: Column(
                        spacing: context.scale(2),
                        children: [
                          SettingsTileWidget(
                            icon: AppIcons.solidRoundedUserEdit01,
                            onTap: () => context.pushNested(RouteSegments.editProfile),
                            tileColor: Colors.transparent,
                            title: 'Edit Profile',
                          ),
                          SettingsTileWidget(
                            icon: AppIcons.solidRoundedCall,
                            onTap: () => context.pushNested(RouteSegments.updatePhoneNumber),
                            tileColor: Colors.transparent,
                            title: 'Update Phone Number',
                          ),
                          SettingsTileWidget(
                            icon: AppIcons.solidRoundedGlobe02,
                            onTap: () {},
                            showArrow: false,
                            tileColor: Colors.transparent,
                            title: 'Sign-Out Everywhere',
                          ),
                          SettingsTileWidget(
                            color: context.appColors.redShade100,
                            icon: AppIcons.solidRoundedDelete02,
                            onTap: () => context.pushNested(RouteSegments.deleteAccount),
                            tileColor: Colors.transparent,
                            title: 'Delete Account',
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
