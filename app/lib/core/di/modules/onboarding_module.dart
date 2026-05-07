import 'package:get_it/get_it.dart';
import 'package:http/http.dart' as http;

import '../../auth/auth_state_notifier.dart';
import '../../auth/session_store.dart';
import '../../../features/onboarding/data/data_sources/onboarding_remote_data_source.dart';
import '../../../features/onboarding/data/data_sources/onboarding_remote_data_source_impl.dart';
import '../../../features/onboarding/data/repositories/onboarding_repository_impl.dart';
import '../../../features/onboarding/domain/repositories/onboarding_repository.dart';

class OnboardingModule {
  static void register(GetIt sl) {
    sl.registerLazySingleton<OnboardingRemoteDataSource>(
      () => OnboardingRemoteDataSourceImpl(sl<http.Client>()),
    );
    sl.registerLazySingleton<OnboardingRepository>(
      () => OnboardingRepositoryImpl(
        sl<OnboardingRemoteDataSource>(),
        sl<SessionStore>(),
        sl<AuthStateNotifier>(),
      ),
    );
  }
}
