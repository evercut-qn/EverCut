// lib/features/authentication/domain/repositories/authentication_repository.dart

import '../use_cases/otp/params/authentication_otp_resend_params.dart';
import '../use_cases/otp/params/authentication_otp_send_params.dart';
import '../use_cases/otp/params/authentication_otp_verify_params.dart';

abstract class AuthenticationRepository {
  Future<void> sendOtp(AuthenticationOtpSendParams params);
  Future<void> resendOtp(AuthenticationOtpResendParams params);
  Future<void> verifyOtp(AuthenticationOtpVerifyParams params);
  Future<bool> hasActiveSession();
  Future<void> refreshSession();
  Future<void> logout();
}
