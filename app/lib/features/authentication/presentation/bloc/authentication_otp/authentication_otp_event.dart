// lib/features/authentication/presentation/bloc/authentication_otp/authentication_otp_event.dart

part of 'authentication_otp_bloc.dart';

sealed class AuthenticationOtpEvent {}

final class AuthenticationOtpSendRequested extends AuthenticationOtpEvent {
  final AuthenticationOtpSendParams params;

  AuthenticationOtpSendRequested({
    required this.params,
  });
}

final class AuthenticationOtpResendRequested extends AuthenticationOtpEvent {
  final AuthenticationOtpResendParams params;

  AuthenticationOtpResendRequested({
    required this.params,
  });
}

final class AuthenticationOtpVerifyRequested extends AuthenticationOtpEvent {
  final AuthenticationOtpVerifyParams params;

  AuthenticationOtpVerifyRequested({
    required this.params,
  });
}

final class AuthenticationOtpFlowCancelled extends AuthenticationOtpEvent {}
