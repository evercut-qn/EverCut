// lib/features/settings/presentation/views/manage_account/manage_account_screen.dart

import 'package:flutter/material.dart';

import '../../../../../core/constants/navigation/route_segments.dart';
import '../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/extensions/context/go_router_extension.dart';
import '../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../shared/widgets/overlays/bottomsheet.dart';
import '../../models/settings_tile.dart';

class ManageAccountScreen extends StatefulWidget {
  const ManageAccountScreen({super.key});

  @override
  State<ManageAccountScreen> createState() => _ManageAccountScreenState();
}

class _ManageAccountScreenState extends State<ManageAccountScreen> {
  final Set<SettingsTile> _accountActions = <SettingsTile>{};

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (_accountActions.isEmpty) {
      _accountActions.addAll(<SettingsTile>{
        SettingsTile(
          icon: AppIcons.solidRoundedUserEdit01,
          title: 'Edit Profile',
          onTap: () => context.pushNested(RouteSegments.editProfile),
        ),
        SettingsTile(
          icon: AppIcons.solidRoundedLockSync02,
          title: 'Change PIN',
          onTap: () => context.pushNested(RouteSegments.changePin),
        ),
        SettingsTile(
          icon: AppIcons.solidRoundedGlobe02,
          title: 'Sign-Out Everywhere',
          onTap: () {},
          showArrow: false,
        ),
        SettingsTile(
          color: context.appColors.redShade200,
          icon: AppIcons.solidRoundedDelete02,
          title: 'Delete Account',
          onTap: () => context.pushNested(RouteSegments.deleteAccount),
        ),
      });
    }
  }

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
                    Padding(
                      padding: EdgeInsets.all(context.scale(16)),
                      child: GestureDetector(
                        onTap: () => showCustomBottomsheet(
                          context: context,
                          builder: (BuildContext context) => ProfileImageActionsBottomsheet(),
                          padding: EdgeInsets.zero,
                        ),
                        child: Stack(
                          children: [
                            CircleAvatar(
                              backgroundColor: context.appColors.backgroundShade100,
                              radius: context.scale(40),
                            ),
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Material(
                                color: context.appColors.scaffoldBackgroundColor,
                                clipBehavior: Clip.hardEdge,
                                shape: const CircleBorder(),
                                child: Padding(
                                  padding: EdgeInsets.all(context.scale(8)),
                                  child: Icon(
                                    AppIcons.solidRoundedSettings01,
                                    color: context.appColors.neutralShade650,
                                    size: context.scale(16),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: context.appColors.backgroundShade200),
                        borderRadius: BorderRadius.circular(context.scale(12)),
                        color: context.appColors.backgroundShade100,
                      ),
                      padding: EdgeInsets.all(context.scale(16)),
                      child: Column(
                        spacing: context.scale(16),
                        children: [
                          Row(
                            spacing: context.scale(16),
                            children: [
                              Icon(
                                AppIcons.solidRoundedUser,
                                color: context.appColors.neutralShade650,
                                size: context.scale(18),
                              ),
                              Text(
                                'John Doe',
                                maxLines: 1,
                                style: TextStyle(
                                  color: context.appColors.neutralShade650,
                                  fontSize: context.scale(14),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          Divider(
                            color: context.appColors.backgroundShade200,
                            height: 1.0,
                          ),
                          Row(
                            spacing: context.scale(16),
                            children: [
                              Icon(
                                AppIcons.solidRoundedMail01,
                                color: context.appColors.neutralShade650,
                                size: context.scale(18),
                              ),
                              Text(
                                'john.doe@example.com',
                                maxLines: 1,
                                style: TextStyle(
                                  color: context.appColors.neutralShade650,
                                  fontSize: context.scale(14),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          Divider(
                            color: context.appColors.backgroundShade200,
                            height: 1.0,
                          ),
                          Row(
                            spacing: context.scale(16),
                            children: [
                              Icon(
                                AppIcons.solidRoundedCall,
                                color: context.appColors.neutralShade650,
                                size: context.scale(18),
                              ),
                              Text(
                                '+91 98765 43210',
                                maxLines: 1,
                                style: TextStyle(
                                  color: context.appColors.neutralShade650,
                                  fontSize: context.scale(14),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
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
                                  child: Row(
                                    spacing: context.scale(16),
                                    children: [
                                      Icon(
                                        AppIcons.solidRoundedCalendar02,
                                        color: context.appColors.neutralShade650,
                                        size: context.scale(18),
                                      ),
                                      Text(
                                        '01 January 2026',
                                        maxLines: 1,
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(14),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                VerticalDivider(
                                  color: context.appColors.backgroundShade200,
                                  width: 1.0,
                                ),
                                Expanded(
                                  child: Row(
                                    spacing: context.scale(16),
                                    children: [
                                      Icon(
                                        AppIcons.solidRoundedUserAccount,
                                        color: context.appColors.neutralShade650,
                                        size: context.scale(18),
                                      ),
                                      Text(
                                        'Female',
                                        maxLines: 1,
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(14),
                                          overflow: TextOverflow.ellipsis,
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
              const Divider(height: 1.0),
              Column(
                children: [
                  Padding(
                    padding: EdgeInsets.all(context.scale(24)).copyWith(bottom: context.scale(8)),
                    child: const SectionHeader(
                      title: 'Account Actions',
                      description: 'Update personal details, enhance account security, or request permanent account deletion.',
                    ),
                  ),
                  Padding(
                    padding: EdgeInsets.all(context.scale(8)).copyWith(top: 0),
                    child: Column(
                      spacing: context.scale(2),
                      children: _accountActions.toList().asMap().entries.map((entry) {
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

class ProfileImageActionsBottomsheet extends StatefulWidget {
  const ProfileImageActionsBottomsheet({super.key});

  @override
  State<ProfileImageActionsBottomsheet> createState() => _ProfileImageActionsBottomsheetState();
}

class _ProfileImageActionsBottomsheetState extends State<ProfileImageActionsBottomsheet> {
  final Set<SettingsTile> _manageProfileActions = <SettingsTile>{};

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (_manageProfileActions.isEmpty) {
      _manageProfileActions.addAll(<SettingsTile>{
        SettingsTile(
          icon: AppIcons.solidRoundedImageUpload,
          title: 'Add or Change Photo',
          onTap: () {},
          showArrow: false,
        ),
        SettingsTile(
          color: context.appColors.redShade200,
          icon: AppIcons.solidRoundedDelete02,
          title: 'Remove Photo',
          onTap: () {},
          showArrow: false,
        ),
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: EdgeInsets.all(context.scale(20)).copyWith(bottom: context.scale(8)),
          child: const SectionHeader(
            title: 'Manage Profile Picture',
            description: 'Select a new profile photo or remove the existing picture from your account.',
          ),
        ),
        Padding(
          padding: EdgeInsets.all(context.scale(4)).copyWith(bottom: context.scale(12)),
          child: Column(
            spacing: context.scale(2),
            children: _manageProfileActions.toList().asMap().entries.expand((entry) {
              final List<Widget> widgets = [
                Theme(
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
                ),
              ];

              if (entry.key != _manageProfileActions.length - 1) {
                widgets.add(
                  Divider(
                    color: context.appColors.secondaryDividerColor,
                    endIndent: context.scale(16),
                    height: 1.0,
                    indent: context.scale(52),
                  ),
                );
              }

              return widgets;
            }).toList(),
          ),
        ),
      ],
    );
  }
}
