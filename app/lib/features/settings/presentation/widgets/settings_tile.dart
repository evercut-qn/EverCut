// lib/features/settings/presentation/widgets/settings_tile.dart

part of 'settings_section.dart';

class SettingsTileWidget extends StatelessWidget {
  final Color? color;
  final IconData icon;
  final bool isFirst;
  final bool isLast;
  final VoidCallback onTap;
  final bool showArrow;
  final String title;

  const SettingsTileWidget({
    super.key,
    this.color,
    required this.icon,
    this.isFirst = false,
    this.isLast = false,
    required this.title,
    required this.onTap,
    this.showArrow = true,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.all(context.scale(16)),
      horizontalTitleGap: context.scale(16),
      leading: Icon(
        icon,
        color: color ?? context.appColors.neutralShade650,
        size: context.scale(20),
      ),
      minLeadingWidth: 0,
      minTileHeight: 0,
      minVerticalPadding: 0,
      onTap: onTap,
      shape: (() {
        if (isFirst) {
          return RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(context.scale(12)),
              bottom: Radius.circular(context.scale(6)),
            ),
          );
        } else if (isLast) {
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
      }()),
      tileColor: context.appColors.backgroundShade100,
      title: Text(
        title,
        style: TextStyle(
          color: color ?? context.appColors.neutralShade650,
          fontSize: context.scale(14),
          fontWeight: FontWeight.w500,
        ),
      ),
      trailing: (() {
        if (showArrow) {
          return Icon(
            AppIcons.strokeStandardArrowRight01,
            color: color ?? context.appColors.neutralShade650,
            size: context.scale(20),
          );
        } else {
          return null;
        }
      }()),
    );
  }
}
