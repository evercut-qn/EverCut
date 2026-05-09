// lib/features/authentication/presentation/bloc/authentication_otp/authentication_otp_bloc.dart

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../core/errors/app_exception.dart';
import '../../../domain/use_cases/otp/params/authentication_otp_resend_params.dart';
import '../../../domain/use_cases/otp/params/authentication_otp_send_params.dart';
import '../../../domain/use_cases/otp/params/authentication_otp_verify_params.dart';
import '../../../domain/use_cases/otp/use_cases/authentication_otp_resend_use_case.dart';
import '../../../domain/use_cases/otp/use_cases/authentication_otp_send_use_case.dart';
import '../../../domain/use_cases/otp/use_cases/authentication_otp_verify_use_case.dart';

part 'authentication_otp_event.dart';
part 'authentication_otp_state.dart';

class AuthenticationOtpBloc extends Bloc<AuthenticationOtpEvent, AuthenticationOtpState> {
  final AuthenticationOtpSendUseCase authenticationOtpSend;
  final AuthenticationOtpResendUseCase authenticationOtpResend;
  final AuthenticationOtpVerifyUseCase authenticationOtpVerify;

  AuthenticationOtpBloc(
    this.authenticationOtpSend,
    this.authenticationOtpResend,
    this.authenticationOtpVerify,
  ) : super(AuthenticationOtpInitial()) {
    on<AuthenticationOtpSendRequested>((
      AuthenticationOtpSendRequested event,
      Emitter<AuthenticationOtpState> emit,
    ) async {
      try {
        emit(AuthenticationOtpSending(phoneNumber: event.params.phoneNumber));

        await authenticationOtpSend(event.params);

        emit(AuthenticationOtpSent(phoneNumber: event.params.phoneNumber, sentAt: DateTime.now()));
      } on AppException catch (error, stackTrace) {
        emit(AuthenticationOtpFailure(error.message, stackTrace));
      } catch (error, stackTrace) {
        emit(AuthenticationOtpFailure(error.toString(), stackTrace));
      }
    });

    on<AuthenticationOtpResendRequested>((
      AuthenticationOtpResendRequested event,
      Emitter<AuthenticationOtpState> emit,
    ) async {
      try {
        emit(AuthenticationOtpResending(phoneNumber: event.params.phoneNumber));

        await authenticationOtpResend(event.params);

        emit(AuthenticationOtpSent(phoneNumber: event.params.phoneNumber, sentAt: DateTime.now()));
      } on AppException catch (error, stackTrace) {
        emit(AuthenticationOtpFailure(error.message, stackTrace));
      } catch (error, stackTrace) {
        emit(AuthenticationOtpFailure(error.toString(), stackTrace));
      }
    });

    on<AuthenticationOtpVerifyRequested>((
      AuthenticationOtpVerifyRequested event,
      Emitter<AuthenticationOtpState> emit,
    ) async {
      try {
        emit(AuthenticationOtpVerifying(phoneNumber: event.params.phoneNumber, smsCode: event.params.smsCode));

        await authenticationOtpVerify(event.params);

        emit(AuthenticationOtpVerified(phoneNumber: event.params.phoneNumber, verifiedAt: DateTime.now()));
      } on AppException catch (error, stackTrace) {
        emit(AuthenticationOtpFailure(error.message, stackTrace));
      } catch (error, stackTrace) {
        emit(AuthenticationOtpFailure(error.toString(), stackTrace));
      }
    });

    on<AuthenticationOtpFlowCancelled>((
      AuthenticationOtpFlowCancelled event,
      Emitter<AuthenticationOtpState> emit,
    ) {
      try {
        emit(AuthenticationOtpInitial());
      } catch (error, stackTrace) {
        emit(AuthenticationOtpFailure(error.toString(), stackTrace));
      }
    });
  }
}
