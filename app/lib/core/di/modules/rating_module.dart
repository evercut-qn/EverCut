// lib/core/di/modules/rating_module.dart

import 'package:get_it/get_it.dart';

import '../../network/api_client.dart';
import '../../../features/ratings/data/data_sources/remote/rating_remote_data_source.dart';
import '../../../features/ratings/data/data_sources/remote/rating_remote_data_source_impl.dart';
import '../../../features/ratings/data/repositories/rating_repository_impl.dart';
import '../../../features/ratings/domain/repositories/rating_repository.dart';

class RatingModule {
  static void register(GetIt sl) {
    // Data sources
    sl.registerLazySingleton<RatingRemoteDataSource>(
      () => RatingRemoteDataSourceImpl(sl<ApiClient>()),
    );

    // Repositories
    sl.registerLazySingleton<RatingRepository>(
      () => RatingRepositoryImpl(sl<RatingRemoteDataSource>()),
    );
  }
}
