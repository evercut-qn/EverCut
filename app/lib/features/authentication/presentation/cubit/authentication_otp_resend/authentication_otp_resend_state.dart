// lib/features/authentication/presentation/cubit/authentication_otp_resend/authentication_otp_resend_state.dart

part of 'authentication_otp_resend_cubit.dart';

class AuthenticationOtpResendState extends Equatable {
  final DateTime? lastAttemptTime;
  final int remainingSeconds;
  final int resendAttempts;

  const AuthenticationOtpResendState({
    required this.lastAttemptTime,
    required this.remainingSeconds,
    required this.resendAttempts,
  });

  factory AuthenticationOtpResendState.initial() {
    return const AuthenticationOtpResendState(
      lastAttemptTime: null,
      remainingSeconds: 0,
      resendAttempts: 0,
    );
  }

  bool get canResend => remainingSeconds <= 0;
  bool get locked => remainingSeconds >= AuthenticationOtpResendPolicy.lockThreshold;

  AuthenticationOtpResendState copyWith({
    DateTime? lastAttemptTime,
    int? remainingSeconds,
    int? resendAttempts,
  }) {
    return AuthenticationOtpResendState(
      lastAttemptTime: lastAttemptTime ?? this.lastAttemptTime,
      remainingSeconds: remainingSeconds ?? this.remainingSeconds,
      resendAttempts: resendAttempts ?? this.resendAttempts,
    );
  }

  @override
  List<Object?> get props => [
    lastAttemptTime,
    remainingSeconds,
    resendAttempts,
  ];
}
