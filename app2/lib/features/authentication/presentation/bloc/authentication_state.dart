// lib/features/authentication/presentation/bloc/authentication_state.dart

part of 'authentication_bloc.dart';

abstract class AuthenticationState {}

class AuthenticationInitial extends AuthenticationState {}

class AuthenticationOtpSending extends AuthenticationState {
  final String phoneNumber;
  AuthenticationOtpSending(this.phoneNumber);
}

class AuthenticationOtpSent extends AuthenticationState {
  final String phoneNumber;
  final String verificationId;
  final DateTime sentAt;

  AuthenticationOtpSent(
    this.phoneNumber,
    this.verificationId,
    this.sentAt,
  );
}

class AuthenticationOtpResending extends AuthenticationState {
  final String phoneNumber;
  AuthenticationOtpResending(this.phoneNumber);
}

class AuthenticationOtpVerifying extends AuthenticationState {
  final String phoneNumber;
  final String smsOtp;

  AuthenticationOtpVerifying(
    this.phoneNumber,
    this.smsOtp,
  );
}

class AuthenticationOtpVerified extends AuthenticationState {
  final String phoneNumber;
  final DateTime verifiedAt;

  AuthenticationOtpVerified(
    this.phoneNumber,
    this.verifiedAt,
  );
}

class AuthenticationSuccess extends AuthenticationState {}

class AuthenticationFailure extends AuthenticationState {
  final String message;
  final StackTrace? stackTrace;

  AuthenticationFailure(
    this.message, [
    this.stackTrace,
  ]);
}
