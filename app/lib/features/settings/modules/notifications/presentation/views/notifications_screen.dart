// lib/features/settings/modules/notifications/presentation/views/notifications_screen.dart

import 'package:flutter/material.dart';

import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../widgets/notification_preferences.dart';

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
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: context.scale(24),
            children: <NotificationPreferencesWidget>[
              NotificationPreferencesWidget(
                title: 'Lorem Ipsum',
                description: 'Lorem Ipsum is simply standard dummy text of the printing and typesetting industry.',
                tiles: <NotificationTileWidget>[
                  NotificationTileWidget(
                    icon: AppIcons.solidRoundedNotification02,
                    onChanged: (bool value) {},
                    subtitle: 'Lorem Ipsum is the printing and type a setting industry.',
                    title: 'Push',
                    value: true,
                  ),
                  NotificationTileWidget(
                    icon: AppIcons.solidRoundedNotificationSquare,
                    onChanged: (bool value) {},
                    subtitle: 'Lorem Ipsum is the printing and type a setting industry.',
                    title: 'In-App',
                    value: false,
                  ),
                  NotificationTileWidget(
                    icon: AppIcons.solidRoundedMail01,
                    onChanged: (bool value) {},
                    subtitle: 'Lorem Ipsum is the printing and type a setting industry.',
                    title: 'Email',
                    value: false,
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
