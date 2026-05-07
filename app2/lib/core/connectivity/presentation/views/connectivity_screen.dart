// lib/core/connectivity/presentation/views/connectivity_screen.dart

import 'package:android_intent_plus/android_intent.dart';
import 'package:android_intent_plus/flag.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../shared/widgets/other/loaders/shimmer_container.dart';
import '../../../di/injection.dart' as di;
import '../../../theme/presentation/widgets/theme_mode_builder.dart';
import '../../domain/entities/connectivity_status.dart';
import '../cubit/connectivity_cubit.dart';

class ConnectivityScreen extends StatefulWidget {
  const ConnectivityScreen({super.key});

  @override
  State<ConnectivityScreen> createState() => _ConnectivityScreenState();
}

class _ConnectivityScreenState extends State<ConnectivityScreen> {
  final _connectivityCubit = di.sl<ConnectivityCubit>();

  Future<void> _onOpenSettingsButtonPressed() async => await AndroidIntent(
    action: 'android.settings.WIFI_SETTINGS',
    flags: <int>[Flag.FLAG_ACTIVITY_NEW_TASK],
  ).launch();

  Future<void> _onRefreshButtonPressed() async => await _connectivityCubit.refresh();

  @override
  Widget build(BuildContext context) {
    final double illustrationSize = context.screenWidth * 0.48;
    return PopScope(
      canPop: context.canPop() && (_connectivityCubit.state == ConnectivityStatus.connected),
      child: Scaffold(
        body: Padding(
          padding: EdgeInsets.all(context.scale(24)),
          child: Center(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              spacing: context.scale(24),
              children: [
                ThemeModeBuilder(
                  builder: (BuildContext context, bool isDarkMode) {
                    return SvgPicture.asset(
                      'assets/images/svg/${isDarkMode ? 'dark' : 'light'}/mouse.svg',
                      width: illustrationSize,
                      placeholderBuilder: (BuildContext context) {
                        return Shimmer.fromColors(
                          baseColor: context.appColors.backgroundShade75,
                          highlightColor: context.appColors.backgroundShade150,
                          child: ShimmerContainer(
                            color: context.appColors.backgroundShade75,
                            width: illustrationSize,
                            height: illustrationSize,
                          ),
                        );
                      },
                    );
                  },
                ),
                Column(
                  spacing: context.scale(12),
                  children: <Text>[
                    Text(
                      'Oops - No Connection',
                      style: TextStyle(
                        color: context.appColors.neutralShade850,
                        fontSize: context.scale(18),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      'You\'re currently offline. Please check your connection and try again.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: context.appColors.neutralShade650,
                        fontSize: context.scale(14),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        bottomNavigationBar: CustomBottomAppBar(
          child: Row(
            spacing: context.scale(12),
            children: <Expanded>[
              Expanded(
                child: OutlinedButton(
                  onPressed: _onOpenSettingsButtonPressed,
                  child: const Text('Open Settings'),
                ),
              ),
              Expanded(
                child: FilledButton(
                  onPressed: _onRefreshButtonPressed,
                  child: const Text('Refresh'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
