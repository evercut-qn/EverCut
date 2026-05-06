// lib/features/authentication/data/data_sources/remote/authentication_remote_data_source.dart
import '../../../../../core/auth/auth_session.dart';

class OtpVerifyRemoteResult {
  final bool isNewUser;
  final String? onboardingToken;
  final AuthSession? session;

  const OtpVerifyRemoteResult.newUser(this.onboardingToken)
      : isNewUser = true,
        session = null;

  const OtpVerifyRemoteResult.existingUser(this.session)
      : isNewUser = false,
        onboardingToken = null;
}

abstract class AuthenticationRemoteDataSource {
  Future<void> sendOtp(String phoneNumber);
  Future<void> resendOtp(String phoneNumber);
  Future<OtpVerifyRemoteResult> verifyOtp({
    required String phoneNumber,
    required String otp,
  });
  Future<({String accessToken, String refreshToken})> refreshToken(String refreshToken);
  Future<void> logout();
}
