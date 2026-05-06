// lib/core/constants/api/api_endpoints.dart

class AuthenticationEndpoints {
  static const String otpSend = '/auth/otp/send';
  static const String otpVerify = '/auth/otp/verify';
  static const String otpResend = '/auth/otp/resend';
  static const String tokenRefresh = '/auth/token/refresh';
  static const String logout = '/auth/logout';
}

class OnboardingEndpoints {
  static const String barbers = '/onboarding/barbers';
}

class ShopEndpoints {
  static const String me = '/shops/me';
}
