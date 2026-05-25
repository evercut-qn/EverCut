// lib/features/authentication/data/models/response/session/authentication_session_refresh_response_model.dart

final class AuthenticationSessionRefreshResponseModel {
  final String accessToken;
  final String refreshToken;

  const AuthenticationSessionRefreshResponseModel({
    required this.accessToken,
    required this.refreshToken,
  });

  factory AuthenticationSessionRefreshResponseModel.fromJson(Map<String, dynamic> json) {
    return AuthenticationSessionRefreshResponseModel(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
    );
  }
}
