// lib/features/authentication/presentation/bloc/authentication_event.dart

part of 'authentication_bloc.dart';

abstract class AuthenticationEvent {}

class AuthenticationOtpSend extends AuthenticationEvent {
  final AuthenticationOtpSendParams params;
  AuthenticationOtpSend(this.params);
}

class AuthenticationOtpResend extends AuthenticationEvent {
  final AuthenticationOtpResendParams params;
  AuthenticationOtpResend(this.params);
}

class AuthenticationOtpVerify extends AuthenticationEvent {
  final AuthenticationOtpVerifyParams params;
  AuthenticationOtpVerify(this.params);
}

class AuthenticationCancel extends AuthenticationEvent {}
