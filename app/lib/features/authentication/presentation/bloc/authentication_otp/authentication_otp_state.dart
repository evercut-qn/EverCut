// lib/features/authentication/presentation/bloc/authentication_otp/authentication_otp_state.dart

part of 'authentication_otp_bloc.dart';

sealed class AuthenticationOtpState {}

final class AuthenticationOtpInitial extends AuthenticationOtpState {}

final class AuthenticationOtpSending extends AuthenticationOtpState {
  final String phoneNumber;
  AuthenticationOtpSending({
    required this.phoneNumber,
  });
}

final class AuthenticationOtpSent extends AuthenticationOtpState {
  final String phoneNumber;
  final DateTime sentAt;
  AuthenticationOtpSent({
    required this.phoneNumber,
    required this.sentAt,
  });
}

final class AuthenticationOtpResending extends AuthenticationOtpState {
  final String phoneNumber;
  AuthenticationOtpResending({
    required this.phoneNumber,
  });
}

final class AuthenticationOtpVerifying extends AuthenticationOtpState {
  final String phoneNumber;
  final String smsCode;
  AuthenticationOtpVerifying({
    required this.phoneNumber,
    required this.smsCode,
  });
}

final class AuthenticationOtpVerified extends AuthenticationOtpState {
  final String phoneNumber;
  final DateTime verifiedAt;
  AuthenticationOtpVerified({
    required this.phoneNumber,
    required this.verifiedAt,
  });
}

final class AuthenticationOtpFailure extends AuthenticationOtpState {
  final String message;
  final StackTrace? stackTrace;
  AuthenticationOtpFailure(
    this.message, [
    this.stackTrace,
  ]);
}
