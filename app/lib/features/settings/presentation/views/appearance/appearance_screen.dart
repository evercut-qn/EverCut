// lib/features/settings/presentation/views/appearance/appearance_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../core/di/injection.dart' as di;
import '../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../core/theme/foundation/colors/dark_color_tokens.dart';
import '../../../../../core/theme/foundation/colors/light_color_tokens.dart';
import '../../../../../core/theme/presentation/cubit/theme_cubit.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/widgets/common/section/section_header.dart';

class _ThemeTile {
  final Color darkColor;
  final Color lightColor;
  final bool showGradient;
  final ThemeMode themeMode;
  final String text;
  final Color textColor;

  _ThemeTile({
    required this.darkColor,
    required this.lightColor,
    this.showGradient = false,
    required this.themeMode,
    required this.text,
    required this.textColor,
  });
}

class AppearanceScreen extends StatefulWidget {
  const AppearanceScreen({super.key});

  @override
  State<AppearanceScreen> createState() => _AppearanceScreenState();
}

class _AppearanceScreenState extends State<AppearanceScreen> {
  final List<_ThemeTile> _tiles = [
    _ThemeTile(
      darkColor: LightColorTokens.backgroundShade200.withAlpha(191),
      lightColor: LightColorTokens.backgroundShade100,
      themeMode: ThemeMode.light,
      text: 'Light',
      textColor: LightColorTokens.neutralShade850,
    ),
    _ThemeTile(
      darkColor: DarkColorTokens.backgroundShade200.withAlpha(191),
      lightColor: DarkColorTokens.backgroundShade100,
      themeMode: ThemeMode.dark,
      text: 'Dark',
      textColor: DarkColorTokens.neutralShade850,
    ),
    _ThemeTile(
      darkColor: DarkColorTokens.backgroundShade100,
      lightColor: LightColorTokens.backgroundShade100,
      showGradient: true,
      themeMode: ThemeMode.system,
      text: 'System Default',
      textColor: LightColorTokens.neutralShade850,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Appearance')),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: context.scale(18),
                  children: [
                    const SectionHeader(
                      title: 'Choose a Theme',
                      description: 'Select how you want the app to look. You can choose Light, Dark, or match your device settings.',
                    ),
                    LayoutBuilder(
                      builder: (BuildContext context, BoxConstraints constraints) {
                        return Wrap(
                          runSpacing: context.scale(16),
                          spacing: context.scale(16),
                          children: _tiles.map((_ThemeTile tile) {
                            return GestureDetector(
                              onTap: () => di.sl<ThemeCubit>().changeThemeMode(tile.themeMode),
                              child: Column(
                                spacing: context.scale(8),
                                children: [
                                  BlocSelector<ThemeCubit, ThemeState, ThemeMode>(
                                    selector: (ThemeState state) => state.mode,
                                    builder: (BuildContext context, ThemeMode themeMode) {
                                      return Container(
                                        clipBehavior: Clip.hardEdge,
                                        decoration: BoxDecoration(
                                          border: Border.all(
                                            color: themeMode == tile.themeMode ? context.appColors.blueShade100 : Colors.transparent,
                                            width: context.scale(2),
                                          ),
                                          borderRadius: BorderRadius.circular(context.scale(12)),
                                          color: !tile.showGradient ? tile.lightColor : null,
                                          gradient: () {
                                            if (tile.showGradient) {
                                              return LinearGradient(
                                                colors: [tile.lightColor, tile.darkColor],
                                                stops: const [0.5, 0.5],
                                              );
                                            } else {
                                              return null;
                                            }
                                          }(),
                                        ),
                                        width: (constraints.maxWidth - context.scale(16)) / 2,
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
                                                  child: Container(
                                                    clipBehavior: Clip.hardEdge,
                                                    decoration: BoxDecoration(
                                                      borderRadius: BorderRadius.only(
                                                        topLeft: Radius.circular(
                                                          context.scale(6),
                                                        ),
                                                      ),
                                                      gradient: () {
                                                        if (tile.showGradient) {
                                                          return LinearGradient(
                                                            colors: [
                                                              tile.lightColor.withValues(alpha: 0.25),
                                                              tile.darkColor.withValues(alpha: 0.25),
                                                            ],
                                                            begin: Alignment.topLeft,
                                                            end: Alignment.bottomRight,
                                                          );
                                                        } else {
                                                          return null;
                                                        }
                                                      }(),
                                                      color: !tile.showGradient ? tile.darkColor : null,
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
                                                          color: tile.textColor,
                                                          fontSize: context.scale(18),
                                                          fontWeight: FontWeight.w500,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              if (themeMode == tile.themeMode) ...[
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
                                      );
                                    },
                                  ),
                                  Text(
                                    tile.text,
                                    style: TextStyle(
                                      fontSize: context.scale(12),
                                      color: context.appColors.neutralShade650,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        );
                      },
                    ),
                  ],
                ),
              ),
              const Divider(height: 1.0),
            ],
          ),
        ),
      ),
    );
  }
}
