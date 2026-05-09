// lib/core/di/modules/authentication_module.dart

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';
import 'package:http/http.dart' as http;

import '../../../features/authentication/data/data_sources/local/authentication_local_data_source.dart';
import '../../../features/authentication/data/data_sources/local/authentication_local_data_source_impl.dart';
import '../../../features/authentication/data/data_sources/remote/authentication_remote_data_source.dart';
import '../../../features/authentication/data/data_sources/remote/authentication_remote_data_source_impl.dart';
import '../../../features/authentication/data/repositories/authentication_repository_impl.dart';
import '../../../features/authentication/domain/repositories/authentication_repository.dart';
import '../../../features/authentication/domain/policies/otp/authentication_otp_resend_policy.dart';
import '../../../features/authentication/domain/use_cases/otp/use_cases/authentication_otp_resend_use_case.dart';
import '../../../features/authentication/domain/use_cases/otp/use_cases/authentication_otp_send_use_case.dart';
import '../../../features/authentication/domain/use_cases/otp/use_cases/authentication_otp_verify_use_case.dart';
import '../../../features/authentication/domain/use_cases/session/use_cases/authentication_session_check_use_case.dart';
import '../../../features/authentication/domain/use_cases/session/use_cases/authentication_session_logout_use_case.dart';
import '../../../features/authentication/domain/use_cases/session/use_cases/authentication_session_refresh_use_case.dart';
import '../../../features/authentication/presentation/bloc/authentication_otp/authentication_otp_bloc.dart';
import '../../../features/authentication/presentation/bloc/authentication_session/authentication_session_bloc.dart';
import '../../../features/authentication/presentation/cubit/authentication_otp_resend/authentication_otp_resend_cubit.dart';

class AuthenticationModule {
  static void register(GetIt sl) {
    sl.registerLazySingleton<AuthenticationLocalDataSource>(() => AuthenticationLocalDataSourceImpl(sl<FlutterSecureStorage>()));
    sl.registerLazySingleton<AuthenticationRemoteDataSource>(() => AuthenticationRemoteDataSourceImpl(sl<http.Client>()));

    sl.registerLazySingleton<AuthenticationRepository>(
      () => AuthenticationRepositoryImpl(
        sl<AuthenticationLocalDataSource>(),
        sl<AuthenticationRemoteDataSource>(),
      ),
    );

    sl.registerLazySingleton<AuthenticationOtpSendUseCase>(() => AuthenticationOtpSendUseCase(sl<AuthenticationRepository>()));
    sl.registerLazySingleton<AuthenticationOtpResendUseCase>(() => AuthenticationOtpResendUseCase(sl<AuthenticationRepository>()));
    sl.registerLazySingleton<AuthenticationOtpVerifyUseCase>(() => AuthenticationOtpVerifyUseCase(sl<AuthenticationRepository>()));

    sl.registerLazySingleton<AuthenticationOtpBloc>(
      () => AuthenticationOtpBloc(
        sl<AuthenticationOtpSendUseCase>(),
        sl<AuthenticationOtpResendUseCase>(),
        sl<AuthenticationOtpVerifyUseCase>(),
      ),
    );

    sl.registerLazySingleton<AuthenticationOtpResendPolicy>(() => AuthenticationOtpResendPolicy());

    sl.registerLazySingleton<AuthenticationOtpResendCubit>(
      () => AuthenticationOtpResendCubit(
        authenticationOtpResendPolicy: sl<AuthenticationOtpResendPolicy>(),
      ),
    );

    sl.registerLazySingleton<AuthenticationSessionCheckUseCase>(() => AuthenticationSessionCheckUseCase(sl<AuthenticationRepository>()));
    sl.registerLazySingleton<AuthenticationSessionRefreshUseCase>(() => AuthenticationSessionRefreshUseCase(sl<AuthenticationRepository>()));
    sl.registerLazySingleton<AuthenticationSessionLogoutUseCase>(() => AuthenticationSessionLogoutUseCase(sl<AuthenticationRepository>()));

    sl.registerLazySingleton<AuthenticationSessionBloc>(
      () => AuthenticationSessionBloc(
        sl<AuthenticationSessionCheckUseCase>(),
        sl<AuthenticationSessionRefreshUseCase>(),
        sl<AuthenticationSessionLogoutUseCase>(),
      ),
    );
  }
}
