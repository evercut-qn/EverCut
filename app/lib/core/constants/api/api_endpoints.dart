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

class RatingEndpoints {
  static const String ratings = '/ratings';
  static const String summary = '/ratings/analytics';
  
  static String shopRatings(String shopId) => '/shops/$shopId/ratings';
  static String shopRatingSummary(String shopId) => '/shops/$shopId/ratings/analytics';
  static String ratingReply(String ratingId) => '/ratings/$ratingId/reply';
  static String deleteRating(String ratingId) => '/ratings/$ratingId';
}

class ServiceEndpoints {
  static const String services = '/services';
  
  static String serviceById(String serviceId) => '/services/$serviceId';
}
