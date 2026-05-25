// lib/features/settings/modules/manage_account/presentation/widgets/profile_avatar.dart

import 'package:flutter/material.dart';

import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../shared/widgets/overlays/bottomsheet.dart';
import '../../../../presentation/widgets/settings_section.dart';

part 'profile_avatar_actions_bottomsheet.dart';

class ProfileAvatarWidget extends StatelessWidget {
  const ProfileAvatarWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(context.scale(16)),
      child: GestureDetector(
        onTap: () => showCustomBottomsheet(
          context: context,
          builder: (BuildContext context) => ProfileAvatarActionsBottomsheetWidget(),
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
    );
  }
}
