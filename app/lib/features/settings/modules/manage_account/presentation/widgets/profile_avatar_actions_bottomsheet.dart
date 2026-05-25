// lib/features/settings/modules/manage_account/presentation/widgets/profile_avatar_actions_bottomsheet.dart

part of 'profile_avatar.dart';

class ProfileAvatarActionsBottomsheetWidget extends StatelessWidget {
  const ProfileAvatarActionsBottomsheetWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: context.scale(4),
        vertical: context.scale(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: context.scale(12),
        children: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: context.scale(16)).copyWith(top: context.scale(8)),
            child: const SectionHeader(
              title: 'Manage Profile Picture',
              description: 'Select a new profile photo or remove the existing picture from your account.',
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
                  icon: AppIcons.solidRoundedImageUpload,
                  onTap: () {},
                  tileColor: Colors.transparent,
                  title: 'Add or Change Photo',
                ),
                Divider(
                  color: context.appColors.backgroundShade200,
                  endIndent: context.scale(16),
                  height: 1.0,
                  indent: context.scale(52),
                ),
                SettingsTileWidget(
                  color: context.appColors.redShade100,
                  icon: AppIcons.solidRoundedDelete02,
                  onTap: () {},
                  tileColor: Colors.transparent,
                  title: 'Remove Photo',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
