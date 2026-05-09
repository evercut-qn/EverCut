// lib/features/authentication/data/models/request/session/authentication_session_refresh_request_model.dart

class AuthenticationSessionRefreshRequestModel {
  final String refreshToken;

  const AuthenticationSessionRefreshRequestModel({
    required this.refreshToken,
  });

  Map<String, dynamic> toJson() {
    return {
      'refreshToken': refreshToken,
    };
  }
}
