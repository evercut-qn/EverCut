// lib/features/authentication/data/data_sources/remote/authentication_remote_data_source_impl.dart
import '../../../../../core/auth/auth_session.dart';
import '../../../../../core/constants/api/api_endpoints.dart';
import '../../../../../core/errors/network_exception.dart';
import '../../../../../core/network/api_client.dart';

import 'authentication_remote_data_source.dart';

class AuthenticationRemoteDataSourceImpl implements AuthenticationRemoteDataSource {
  final ApiClient apiClient;

  const AuthenticationRemoteDataSourceImpl(this.apiClient);

  @override
  Future<void> sendOtp(String phoneNumber) async {
    await apiClient.post<Map<String, dynamic>>(
      AuthenticationEndpoints.otpSend,
      authenticated: false,
      body: {'mobile': _mobileForBackend(phoneNumber)},
      parseData: _map,
    );
  }

  @override
  Future<void> resendOtp(String phoneNumber) async {
    await apiClient.post<Map<String, dynamic>>(
      AuthenticationEndpoints.otpResend,
      authenticated: false,
      body: {
        'mobile': _mobileForBackend(phoneNumber),
        'retryType': 'text',
      },
      parseData: _map,
    );
  }

  @override
  Future<OtpVerifyRemoteResult> verifyOtp({
    required String phoneNumber,
    required String otp,
  }) async {
    final response = await apiClient.post<Map<String, dynamic>>(
      AuthenticationEndpoints.otpVerify,
      authenticated: false,
      body: {
        'mobile': _mobileForBackend(phoneNumber),
        'otp': otp,
      },
      parseData: _map,
    );

    final data = response.data;
    if (data['isNewUser'] == true) {
      final String token = (data['onboardingToken'] ?? '').toString();
      if (token.isEmpty) {
        throw const NetworkException('Onboarding token missing from authentication response');
      }
      return OtpVerifyRemoteResult.newUser(token);
    }

    final session = AuthSession.fromJson(data);
    if (!session.user.isBarber) {
      throw const ForbiddenException('This app is only available for merchant accounts.');
    }

    return OtpVerifyRemoteResult.existingUser(session);
  }

  @override
  Future<({String accessToken, String refreshToken})> refreshToken(String refreshToken) async {
    final response = await apiClient.post<Map<String, dynamic>>(
      AuthenticationEndpoints.tokenRefresh,
      authenticated: false,
      body: {'refreshToken': refreshToken},
      parseData: _map,
    );

    return (
      accessToken: (response.data['accessToken'] ?? '').toString(),
      refreshToken: (response.data['refreshToken'] ?? '').toString(),
    );
  }

  @override
  Future<void> logout() async {
    await apiClient.post<Map<String, dynamic>>(
      AuthenticationEndpoints.logout,
      parseData: _map,
    );
  }

  String _mobileForBackend(String phoneNumber) {
    final digits = phoneNumber.replaceAll(RegExp(r'\D'), '');
    if (digits.length == 12 && digits.startsWith('91')) {
      return digits.substring(2);
    }
    return digits;
  }

  Map<String, dynamic> _map(Object? value) {
    if (value == null) return <String, dynamic>{};
    return Map<String, dynamic>.from(value as Map);
  }
}
