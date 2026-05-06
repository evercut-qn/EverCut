// lib/core/di/modules/authentication_module.dart

import 'package:get_it/get_it.dart';

import '../../../features/authentication/data/repositories/authentication_repository_impl.dart';
import '../../../features/authentication/domain/repositories/authentication_repository.dart';
import '../../../features/authentication/domain/use_cases/authentication_otp_resend_use_case.dart';
import '../../../features/authentication/domain/use_cases/authentication_otp_send_use_case.dart';
import '../../../features/authentication/domain/use_cases/authentication_otp_verify_use_case.dart';
import '../../../features/authentication/presentation/bloc/authentication_bloc.dart';

class AuthenticationModule {
  static void register(GetIt sl) {
    sl.registerLazySingleton<AuthenticationRepository>(() => AuthenticationRepositoryImpl());

    sl.registerLazySingleton<AuthenticationOtpSendUseCase>(() => AuthenticationOtpSendUseCase(sl<AuthenticationRepository>()));
    sl.registerLazySingleton<AuthenticationOtpResendUseCase>(() => AuthenticationOtpResendUseCase(sl<AuthenticationRepository>()));
    sl.registerLazySingleton<AuthenticationOtpVerifyUseCase>(() => AuthenticationOtpVerifyUseCase(sl<AuthenticationRepository>()));

    sl.registerLazySingleton<AuthenticationBloc>(
      () => AuthenticationBloc(
        sl<AuthenticationOtpSendUseCase>(),
        sl<AuthenticationOtpResendUseCase>(),
        sl<AuthenticationOtpVerifyUseCase>(),
      ),
    );
  }
}
