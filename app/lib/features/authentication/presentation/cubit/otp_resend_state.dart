// lib/features/authentication/presentation/cubit/otp_resend_state.dart

part of 'otp_resend_cubit.dart';

class OtpResendState extends Equatable {
  final DateTime? lastAttemptTime;
  final int remainingSeconds;
  final int resendAttempts;

  const OtpResendState({
    required this.lastAttemptTime,
    required this.remainingSeconds,
    required this.resendAttempts,
  });

  bool get canResend => remainingSeconds <= 0;
  bool get locked => remainingSeconds >= 1800;

  factory OtpResendState.defaultState() {
    return const OtpResendState(
      lastAttemptTime: null,
      remainingSeconds: 30,
      resendAttempts: 0,
    );
  }

  OtpResendState copyWith({
    DateTime? lastAttemptTime,
    int? remainingSeconds,
    int? resendAttempts,
  }) {
    return OtpResendState(
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
