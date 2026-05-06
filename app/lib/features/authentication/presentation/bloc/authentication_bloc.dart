// lib/features/authentication/presentation/bloc/authentication_bloc.dart

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/use_cases/authentication_otp_resend_params.dart';
import '../../domain/use_cases/authentication_otp_resend_use_case.dart';
import '../../domain/use_cases/authentication_otp_send_params.dart';
import '../../domain/use_cases/authentication_otp_send_use_case.dart';
import '../../domain/use_cases/authentication_otp_verify_params.dart';
import '../../domain/use_cases/authentication_otp_verify_use_case.dart';

part 'authentication_event.dart';
part 'authentication_state.dart';

class AuthenticationBloc extends Bloc<AuthenticationEvent, AuthenticationState> {
  final AuthenticationOtpSendUseCase authenticationOtpSend;
  final AuthenticationOtpResendUseCase authenticationOtpResend;
  final AuthenticationOtpVerifyUseCase authenticationOtpVerify;

  AuthenticationBloc(
    this.authenticationOtpSend,
    this.authenticationOtpResend,
    this.authenticationOtpVerify,
  ) : super(AuthenticationInitial()) {
    on<AuthenticationOtpSend>((
      AuthenticationOtpSend event,
      Emitter<AuthenticationState> emit,
    ) async {
      try {
        emit(AuthenticationOtpSending(event.params.phoneNumber));

        // await authenticationOtpSend(
        //   AuthenticationOtpSendParams(
        //     event.params.phoneNumber,
        //   ),
        // );

        emit(AuthenticationOtpSent(event.params.phoneNumber, '', DateTime.now()));
      } catch (error, stackTrace) {
        emit(AuthenticationFailure(error.toString(), stackTrace));
      }
    });

    on<AuthenticationOtpResend>((
      AuthenticationOtpResend event,
      Emitter<AuthenticationState> emit,
    ) async {
      try {
        emit(AuthenticationOtpResending(event.params.phoneNumber));

        // await authenticationOtpResend(
        //   AuthenticationOtpResendParams(
        //     event.params.phoneNumber,
        //   ),
        // );

        emit(AuthenticationOtpSent(event.params.phoneNumber, '', DateTime.now()));
      } catch (error, stackTrace) {
        emit(AuthenticationFailure(error.toString(), stackTrace));
      }
    });

    on<AuthenticationOtpVerify>((
      AuthenticationOtpVerify event,
      Emitter<AuthenticationState> emit,
    ) {
      try {
        emit(AuthenticationOtpVerifying(event.params.phoneNumber, event.params.smsCode));
        emit(AuthenticationOtpVerified(event.params.phoneNumber, DateTime.now()));
        emit(AuthenticationSuccess());
      } catch (error, stackTrace) {
        emit(AuthenticationFailure(error.toString(), stackTrace));
      }
    });

    on<AuthenticationCancel>((
      AuthenticationCancel event,
      Emitter<AuthenticationState> emit,
    ) {
      try {
        emit(AuthenticationInitial());
      } catch (error, stackTrace) {
        emit(AuthenticationFailure(error.toString(), stackTrace));
      }
    });
  }
}
