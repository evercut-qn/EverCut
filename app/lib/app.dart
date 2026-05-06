// lib/app.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'core/connectivity/domain/entities/connectivity_status.dart';
import 'core/connectivity/presentation/cubit/connectivity_cubit.dart';
import 'core/constants/navigation/route_paths.dart';
import 'core/di/injection.dart' as di;
import 'core/theme/foundation/app_theme.dart';
import 'core/theme/presentation/cubit/theme_cubit.dart';
import 'shared/utils/device/device_metrics.dart';
import 'shared/utils/system/system_ui.dart';

class EvercutMerchant extends StatefulWidget {
  const EvercutMerchant({super.key});

  @override
  State<EvercutMerchant> createState() => _EvercutMerchantState();
}

class _EvercutMerchantState extends State<EvercutMerchant> with WidgetsBindingObserver {
  final _goRouter = di.sl<GoRouter>();
  final _themeCubit = di.sl<ThemeCubit>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    SystemUi.init();
  }

  @override
  void didChangeMetrics() {
    super.didChangeMetrics();
    DeviceMetrics.sync(View.of(context));
  }

  @override
  void didChangePlatformBrightness() {
    super.didChangePlatformBrightness();
    _themeCubit.syncWithSystemBrightness(
      View.of(context).platformDispatcher.platformBrightness,
    );
  }

  @override
  void dispose() {
    super.dispose();
    SystemUi.dispose();
    WidgetsBinding.instance.removeObserver(this);
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<ThemeCubit>(
          create: (BuildContext context) {
            return _themeCubit;
          },
        ),
        BlocProvider<ConnectivityCubit>(
          create: (BuildContext context) {
            return di.sl<ConnectivityCubit>()..start();
          },
        ),
      ],
      child: BlocSelector<ThemeCubit, ThemeState, ThemeMode>(
        selector: (ThemeState state) => state.mode,
        builder: (BuildContext context, ThemeMode themeMode) {
          return BlocListener<ConnectivityCubit, ConnectivityStatus>(
            listener: (BuildContext context, ConnectivityStatus connectivityStatus) {
              if (connectivityStatus != ConnectivityStatus.connected) {
                if (_goRouter.state.path != RoutePaths.connectionNotFound) {
                  _goRouter.push(RoutePaths.connectionNotFound);
                }
              } else {
                if (_goRouter.state.path == RoutePaths.connectionNotFound) {
                  _goRouter.pop();
                }
              }
            },
            listenWhen: (ConnectivityStatus previousConnectivityStatus, ConnectivityStatus currentConnectivityStatus) {
              return previousConnectivityStatus != currentConnectivityStatus;
            },
            child: MaterialApp.router(
              builder: (BuildContext context, Widget? child) {
                return MediaQuery(
                  data: MediaQuery.of(context).copyWith(
                    textScaler: TextScaler.noScaling,
                  ),
                  child: child!,
                );
              },
              darkTheme: AppTheme.of(context).dark,
              debugShowCheckedModeBanner: false,
              routerConfig: _goRouter,
              scrollBehavior: const ScrollBehavior().copyWith(
                overscroll: false,
                physics: const ClampingScrollPhysics(),
              ),
              theme: AppTheme.of(context).light,
              themeMode: themeMode,
              title: 'Evercut Merchant',
            ),
          );
        },
      ),
    );
  }
}
