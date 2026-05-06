import 'package:get_it/get_it.dart';
import 'package:http/http.dart' as http;

import '../../auth/auth_state_notifier.dart';
import '../../auth/session_store.dart';
import '../../../features/merchant_onboarding/data/data_sources/merchant_onboarding_remote_data_source.dart';
import '../../../features/merchant_onboarding/data/data_sources/merchant_onboarding_remote_data_source_impl.dart';
import '../../../features/merchant_onboarding/data/repositories/merchant_onboarding_repository_impl.dart';
import '../../../features/merchant_onboarding/domain/repositories/merchant_onboarding_repository.dart';

class MerchantOnboardingModule {
  static void register(GetIt sl) {
    sl.registerLazySingleton<MerchantOnboardingRemoteDataSource>(
      () => MerchantOnboardingRemoteDataSourceImpl(sl<http.Client>()),
    );
    sl.registerLazySingleton<MerchantOnboardingRepository>(
      () => MerchantOnboardingRepositoryImpl(
        sl<MerchantOnboardingRemoteDataSource>(),
        sl<SessionStore>(),
        sl<AuthStateNotifier>(),
      ),
    );
  }
}
