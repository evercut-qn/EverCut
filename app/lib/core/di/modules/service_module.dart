// lib/core/di/modules/service_module.dart

import 'package:get_it/get_it.dart';

import '../../network/api_client.dart';
import '../../../features/services/data/data_sources/remote/service_remote_data_source.dart';
import '../../../features/services/data/data_sources/remote/service_remote_data_source_impl.dart';
import '../../../features/services/data/repositories/service_repository_impl.dart';
import '../../../features/services/domain/repositories/service_repository.dart';

class ServiceModule {
  static void register(GetIt sl) {
    // Data sources
    sl.registerLazySingleton<ServiceRemoteDataSource>(
      () => ServiceRemoteDataSourceImpl(sl<ApiClient>()),
    );

    // Repositories
    sl.registerLazySingleton<ServiceRepository>(
      () => ServiceRepositoryImpl(sl<ServiceRemoteDataSource>()),
    );
  }
}
