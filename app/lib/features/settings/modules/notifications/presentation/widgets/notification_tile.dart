// lib/features/settings/modules/notifications/presentation/widgets/notification_tile.dart

part of 'notification_preferences.dart';

class NotificationTileWidget extends StatelessWidget {
  final IconData icon;
  final ValueChanged<bool> onChanged;
  final String subtitle;
  final String title;
  final bool value;

  const NotificationTileWidget({
    super.key,
    required this.icon,
    required this.onChanged,
    required this.subtitle,
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.all(context.scale(8)),
      horizontalTitleGap: context.scale(20),
      leading: Icon(
        icon,
        color: context.appColors.neutralShade650,
        size: context.scale(24),
      ),
      minLeadingWidth: 0,
      minVerticalPadding: 0,
      subtitle: Text(
        subtitle,
        style: TextStyle(
          color: context.appColors.neutralShade650,
          fontSize: context.scale(12),
          fontWeight: FontWeight.w400,
        ),
      ),
      title: Text(
        title,
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
            padding: EdgeInsets.zero,
            value: value,
            onChanged: onChanged,
          ),
        ),
      ),
    );
  }
}
