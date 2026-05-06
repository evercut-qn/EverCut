// lib/core/connectivity/presentation/views/connection_not_found/connection_not_found_screen.dart

import 'package:android_intent_plus/android_intent.dart';
import 'package:android_intent_plus/flag.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../shared/widgets/other/loaders/shimmer_container.dart';
import '../../../../di/injection.dart' as di;
import '../../../../theme/presentation/widgets/theme_mode_builder.dart';
import '../../../domain/entities/connectivity_status.dart';
import '../../cubit/connectivity_cubit.dart';

class ConnectionNotFoundScreen extends StatefulWidget {
  const ConnectionNotFoundScreen({super.key});

  @override
  State<ConnectionNotFoundScreen> createState() => _ConnectionNotFoundScreenState();
}

class _ConnectionNotFoundScreenState extends State<ConnectionNotFoundScreen> {
  final _connectivityCubit = di.sl<ConnectivityCubit>();

  bool get _canPop {
    return context.canPop() && _connectivityCubit.state == ConnectivityStatus.connected;
  }

  Future<void> _onOpenSettingsButtonPressed() async {
    final androidIntent = AndroidIntent(
      action: 'android.settings.WIFI_SETTINGS',
      flags: <int>[Flag.FLAG_ACTIVITY_NEW_TASK],
    );
    return await androidIntent.launch();
  }

  Future<void> _onRefreshButtonPressed() async {
    return await _connectivityCubit.refresh();
  }

  @override
  Widget build(BuildContext context) {
    final double illustrationSize = context.screenWidth * 0.48;
    return PopScope(
      canPop: _canPop,
      child: Scaffold(
        body: Padding(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            spacing: context.scale(24),
            children: [
              ThemeModeBuilder(
                builder: (BuildContext context, bool isDarkMode) {
                  return SvgPicture.asset(
                    'assets/images/svg/${isDarkMode ? 'dark' : 'light'}/mouse.svg',
                    width: illustrationSize,
                    placeholderBuilder: (BuildContext context) {
                      return Shimmer.fromColors(
                        baseColor: context.appColors.neutralShade200.withAlpha(50),
                        highlightColor: context.appColors.neutralShade300.withAlpha(150),
                        child: ShimmerContainer(
                          borderRadius: 4,
                          color: context.appColors.neutralShade200.withAlpha(150),
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
                      fontSize: context.scale(18),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'You\'re currently offline. Please check your connection and try again.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: context.scale(14),
                    ),
                  ),
                ],
              ),
            ],
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
