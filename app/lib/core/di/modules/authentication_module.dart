// lib/core/di/modules/authentication_module.dart

import 'package:get_it/get_it.dart';

import '../../../core/auth/session_store.dart';
import '../../../core/auth/auth_state_notifier.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/auth_token_refresher.dart';
import '../../../features/authentication/data/data_sources/local/authentication_local_data_source.dart';
import '../../../features/authentication/data/data_sources/local/authentication_local_data_source_impl.dart';
import '../../../features/authentication/data/data_sources/remote/authentication_remote_data_source.dart';
import '../../../features/authentication/data/data_sources/remote/authentication_remote_data_source_impl.dart';
import '../../../features/authentication/data/repositories/authentication_repository_impl.dart';
import '../../../features/authentication/domain/repositories/authentication_repository.dart';
import '../../../features/authentication/domain/use_cases/authentication_logout_use_case.dart';
import '../../../features/authentication/domain/use_cases/authentication_otp_resend_use_case.dart';
import '../../../features/authentication/domain/use_cases/authentication_otp_send_use_case.dart';
import '../../../features/authentication/domain/use_cases/authentication_otp_verify_use_case.dart';
import '../../../features/authentication/presentation/bloc/authentication_bloc.dart';

class AuthenticationModule {
  static void register(GetIt sl) {
    sl.registerLazySingleton<AuthenticationLocalDataSource>(
      () => AuthenticationLocalDataSourceImpl(sl<SessionStore>()),
    );
    sl.registerLazySingleton<AuthenticationRemoteDataSource>(
      () => AuthenticationRemoteDataSourceImpl(sl<ApiClient>()),
    );
    sl.registerLazySingleton<AuthenticationRepository>(
      () => AuthenticationRepositoryImpl(
        sl<AuthenticationRemoteDataSource>(),
        sl<AuthenticationLocalDataSource>(),
        sl<AuthStateNotifier>(),
      ),
    );
    sl.registerLazySingleton<AuthTokenRefresher>(
      () => sl<AuthenticationRepository>() as AuthTokenRefresher,
    );
    sl<ApiClient>().tokenRefresher = sl<AuthTokenRefresher>();

    sl.registerLazySingleton<AuthenticationOtpSendUseCase>(() => AuthenticationOtpSendUseCase(sl<AuthenticationRepository>()));
    sl.registerLazySingleton<AuthenticationOtpResendUseCase>(() => AuthenticationOtpResendUseCase(sl<AuthenticationRepository>()));
    sl.registerLazySingleton<AuthenticationOtpVerifyUseCase>(() => AuthenticationOtpVerifyUseCase(sl<AuthenticationRepository>()));
    sl.registerLazySingleton<AuthenticationLogoutUseCase>(() => AuthenticationLogoutUseCase(sl<AuthenticationRepository>()));

    sl.registerFactory<AuthenticationBloc>(
      () => AuthenticationBloc(
        sl<AuthenticationOtpSendUseCase>(),
        sl<AuthenticationOtpResendUseCase>(),
        sl<AuthenticationOtpVerifyUseCase>(),
      ),
    );
  }
}
