// lib/features/authentication/domain/policies/otp/authentication_otp_resend_policy.dart

class AuthenticationOtpResendPolicy {
  static const int lockThreshold = 1800;
  static const List<int> cooldownSeconds = [30, 120, 300, 900, 1800, 86400];

  int getCooldownForAttempts(int attempts) {
    return cooldownSeconds[attempts < cooldownSeconds.length ? attempts : cooldownSeconds.length - 1];
  }

  bool isLocked(int remainingSeconds) => remainingSeconds >= 1800;
  bool canResend(int remainingSeconds) => remainingSeconds <= 0;

  int calculateRemainingSeconds({
    required int resendAttempts,
    required DateTime? lastAttemptTime,
  }) {
    if (resendAttempts <= 0 || lastAttemptTime == null) {
      return 0;
    } else {
      final cooldown = getCooldownForAttempts(resendAttempts);
      final nextAllowedTime = lastAttemptTime.add(Duration(seconds: cooldown));
      final difference = nextAllowedTime.difference(DateTime.now()).inSeconds;
      return difference > 0 ? difference : 0;
    }
  }
}
