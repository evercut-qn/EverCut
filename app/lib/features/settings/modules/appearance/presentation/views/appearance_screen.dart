// lib/features/settings/modules/appearance/presentation/views/appearance_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../../core/theme/foundation/colors/dark_color_tokens.dart';
import '../../../../../../core/theme/foundation/colors/light_color_tokens.dart';
import '../../../../../../core/theme/presentation/cubit/theme_cubit.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';
import '../widgets/theme_mode_tile.dart';

class AppearanceScreen extends StatefulWidget {
  const AppearanceScreen({super.key});

  @override
  State<AppearanceScreen> createState() => _AppearanceScreenState();
}

class _AppearanceScreenState extends State<AppearanceScreen> {
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
                        return BlocSelector<ThemeCubit, ThemeState, ThemeMode>(
                          selector: (ThemeState state) => state.mode,
                          builder: (BuildContext context, ThemeMode themeMode) {
                            return Wrap(
                              alignment: WrapAlignment.start,
                              runAlignment: WrapAlignment.start,
                              runSpacing: context.scale(16),
                              spacing: context.scale(16),
                              children: [
                                ThemeModeTileWidget(
                                  darkColor: LightColorTokens.backgroundShade200.withAlpha(191),
                                  isThemeModeTileSelected: themeMode == ThemeMode.light,
                                  lightColor: LightColorTokens.backgroundShade100,
                                  text: 'Light',
                                  textColor: LightColorTokens.neutralShade850,
                                  themeMode: ThemeMode.light,
                                  width: constraints.maxWidth,
                                ),
                                ThemeModeTileWidget(
                                  darkColor: DarkColorTokens.backgroundShade200.withAlpha(191),
                                  isThemeModeTileSelected: themeMode == ThemeMode.dark,
                                  lightColor: DarkColorTokens.backgroundShade100,
                                  text: 'Dark',
                                  textColor: DarkColorTokens.neutralShade850,
                                  themeMode: ThemeMode.dark,
                                  width: constraints.maxWidth,
                                ),
                                ThemeModeTileWidget(
                                  darkColor: DarkColorTokens.backgroundShade100,
                                  isThemeModeTileSelected: themeMode == ThemeMode.system,
                                  lightColor: LightColorTokens.backgroundShade100,
                                  showGradient: true,
                                  text: 'System Default',
                                  textColor: LightColorTokens.neutralShade850,
                                  themeMode: ThemeMode.system,
                                  width: constraints.maxWidth,
                                ),
                              ],
                            );
                          },
                        );
                      },
                    ),
                  ],
                ),
              ),
              Divider(
                color: context.appColors.backgroundShade200,
                height: 1.0,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
