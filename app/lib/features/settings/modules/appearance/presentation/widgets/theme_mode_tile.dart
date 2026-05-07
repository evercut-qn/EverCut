// lib/features/settings/modules/appearance/presentation/widgets/theme_mode_tile.dart

import 'package:flutter/material.dart';

import '../../../../../../core/di/injection.dart' as di;
import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../core/theme/presentation/cubit/theme_cubit.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';

class ThemeModeTileWidget extends StatelessWidget {
  final Color darkColor;
  final bool isThemeModeTileSelected;
  final Color lightColor;
  final bool showGradient;
  final String text;
  final Color textColor;
  final ThemeMode themeMode;
  final double width;

  const ThemeModeTileWidget({
    super.key,
    required this.darkColor,
    required this.isThemeModeTileSelected,
    required this.lightColor,
    this.showGradient = false,
    required this.themeMode,
    required this.text,
    required this.textColor,
    required this.width,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => di.sl<ThemeCubit>().changeThemeMode(themeMode),
      child: Column(
        spacing: context.scale(8),
        children: [
          Material(
            clipBehavior: Clip.hardEdge,
            color: !showGradient ? lightColor : Colors.transparent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(context.scale(12)),
              side: BorderSide(
                color: isThemeModeTileSelected ? context.appColors.blueShade100 : Colors.transparent,
                width: context.scale(2),
              ),
            ),
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: (() {
                  if (showGradient) {
                    return LinearGradient(
                      colors: [lightColor, darkColor],
                      stops: const [0.5, 0.5],
                    );
                  } else {
                    return null;
                  }
                }()),
              ),
              child: SizedBox(
                width: (width - context.scale(16)) / 2,
                child: AspectRatio(
                  aspectRatio: 2,
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: Padding(
                          padding: EdgeInsets.only(
                            left: context.scale(12),
                            top: context.scale(12),
                          ),
                          child: Material(
                            borderRadius: BorderRadius.only(topLeft: Radius.circular(context.scale(6))),
                            clipBehavior: Clip.hardEdge,
                            color: !showGradient ? darkColor : Colors.transparent,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: (() {
                                  if (showGradient) {
                                    return LinearGradient(
                                      colors: [lightColor.withAlpha(63), darkColor.withAlpha(63)],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    );
                                  } else {
                                    return null;
                                  }
                                }()),
                              ),
                              child: Padding(
                                padding: EdgeInsets.only(
                                  left: context.scale(16),
                                  top: context.scale(16),
                                ),
                                child: Text(
                                  'Aa',
                                  style: TextStyle(
                                    height: 1,
                                    color: textColor,
                                    fontSize: context.scale(18),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      if (isThemeModeTileSelected) ...[
                        Positioned(
                          right: context.scale(12),
                          bottom: context.scale(12),
                          child: Icon(
                            AppIcons.solidRoundedCheckmarkCircle01,
                            color: context.appColors.blueShade100,
                            size: context.scale(24),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
          Text(
            text,
            style: TextStyle(
              fontSize: context.scale(12),
              color: context.appColors.neutralShade650,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
