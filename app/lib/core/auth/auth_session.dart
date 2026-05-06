import 'dart:convert';

class AuthUser {
  final String id;
  final String roleType;
  final String phoneNumber;
  final String email;
  final bool emailVerified;

  const AuthUser({
    required this.id,
    required this.roleType,
    required this.phoneNumber,
    required this.email,
    required this.emailVerified,
  });

  bool get isBarber => roleType == 'BARBER';

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      roleType: (json['roleType'] ?? '').toString(),
      phoneNumber: (json['phoneNumber'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      emailVerified: json['emailVerified'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'roleType': roleType,
        'phoneNumber': phoneNumber,
        'email': email,
        'emailVerified': emailVerified,
      };
}

class AuthSession {
  final AuthUser user;
  final Map<String, dynamic>? profile;
  final String accessToken;
  final String refreshToken;

  const AuthSession({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
    this.profile,
  });

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      user: AuthUser.fromJson(Map<String, dynamic>.from(json['user'] as Map)),
      profile: json['profile'] == null ? null : Map<String, dynamic>.from(json['profile'] as Map),
      accessToken: (json['accessToken'] ?? '').toString(),
      refreshToken: (json['refreshToken'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'user': user.toJson(),
        'profile': profile,
        'accessToken': accessToken,
        'refreshToken': refreshToken,
      };

  String encodeUser() => jsonEncode(user.toJson());
  String encodeProfile() => jsonEncode(profile ?? <String, dynamic>{});
}
