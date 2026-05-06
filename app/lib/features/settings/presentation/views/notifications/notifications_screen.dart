// lib/features/settings/presentation/views/notifications/notifications_screen.dart

import 'package:flutter/material.dart';

import '../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/widgets/common/section/section_header.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            spacing: context.scale(18),
            children: [
              const SectionHeader(
                title: 'Lorem Ipsum',
                description: 'Lorem Ipsum is simply standard dummy text of the printing and typesetting industry.',
              ),
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: context.appColors.backgroundShade200),
                  borderRadius: BorderRadius.circular(context.scale(12)),
                  color: context.appColors.backgroundShade100,
                ),
                child: ListView.separated(
                  itemBuilder: (BuildContext context, int index) {
                    return ListTile(
                      contentPadding: EdgeInsets.all(context.scale(8)),
                      horizontalTitleGap: context.scale(16),
                      leading: Icon(
                        AppIcons.solidRoundedNotification02,
                        color: context.appColors.neutralShade650,
                        size: context.scale(24),
                      ),
                      minLeadingWidth: 0,
                      minVerticalPadding: 0,
                      subtitle: Text(
                        'Lorem Ipsum is the printing and type a setting industry.',
                        style: TextStyle(
                          color: context.appColors.neutralShade650,
                          fontSize: context.scale(12),
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      title: Text(
                        'Push',
                        style: TextStyle(
                          color: context.appColors.neutralShade650,
                          fontSize: context.scale(14),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      trailing: SizedBox(
                        width: context.scale(40),
                        height: context.scale(30),
                        child: FittedBox(
                          fit: BoxFit.fill,
                          child: Switch(
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            onChanged: (value) {},
                            padding: EdgeInsets.zero,
                            value: false,
                          ),
                        ),
                      ),
                    );
                  },
                  itemCount: 3,
                  padding: EdgeInsets.symmetric(
                    horizontal: context.scale(12),
                    vertical: context.scale(8),
                  ),
                  physics: const NeverScrollableScrollPhysics(),
                  separatorBuilder: (BuildContext context, int index) {
                    return Padding(
                      padding: EdgeInsets.symmetric(vertical: context.scale(8)),
                      child: Divider(
                        color: context.appColors.backgroundShade200,
                        height: 1.0,
                      ),
                    );
                  },
                  shrinkWrap: true,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
