// lib/core/di/modules/connectivity_module.dart

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:get_it/get_it.dart';
import 'package:http/http.dart' as http;

import '../../connectivity/data/data_sources/platform/connectivity_platform_data_source.dart';
import '../../connectivity/data/data_sources/platform/connectivity_platform_data_source_impl.dart';
import '../../connectivity/data/data_sources/remote/internet_status_remote_data_source.dart';
import '../../connectivity/data/data_sources/remote/internet_status_remote_data_source_impl.dart';
import '../../connectivity/data/repositories/connectivity_repository_impl.dart';
import '../../connectivity/domain/repositories/connectivity_repository.dart';
import '../../connectivity/domain/use_cases/refresh_connectivity_use_case.dart';
import '../../connectivity/domain/use_cases/watch_connectivity_use_case.dart';
import '../../connectivity/presentation/cubit/connectivity_cubit.dart';

class ConnectivityModule {
  static void register(GetIt sl) {
    sl.registerLazySingleton(() => Connectivity());
    sl.registerLazySingleton<http.Client>(() => http.Client());
    sl.registerLazySingleton<ConnectivityPlatformDataSource>(() {
      return ConnectivityPlatformDataSourceImpl(sl<Connectivity>());
    });
    sl.registerLazySingleton<InternetStatusRemoteDataSource>(() {
      return InternetStatusRemoteDataSourceImpl(sl<http.Client>());
    });
    sl.registerLazySingleton<ConnectivityRepository>(
      () => ConnectivityRepositoryImpl(
        sl<ConnectivityPlatformDataSource>(),
        sl<InternetStatusRemoteDataSource>(),
      ),
    );
    sl.registerLazySingleton<RefreshConnectivityUseCase>(() {
      return RefreshConnectivityUseCase(sl<ConnectivityRepository>());
    });
    sl.registerLazySingleton<WatchConnectivityUseCase>(() {
      return WatchConnectivityUseCase(sl<ConnectivityRepository>());
    });
    sl.registerLazySingleton<ConnectivityCubit>(
      () => ConnectivityCubit(
        sl<RefreshConnectivityUseCase>(),
        sl<WatchConnectivityUseCase>(),
      ),
      dispose: (ConnectivityCubit connectivityCubit) {
        return connectivityCubit.close();
      },
    );
  }
}
