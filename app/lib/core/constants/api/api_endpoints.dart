// lib/core/constants/api/api_endpoints.dart

import 'api_config.dart';

class AuthenticationEndpoints {
  // base api path
  static const String basePath = '${ApiConfig.globalPrefix}/${ApiConfig.apiVersion}';

  // root
  static const String authentication = '$basePath/auth';

  // authentication
  static const String otp = '$authentication/otp';
  static const String session = '$authentication/token';
  static const String logout = '$authentication/logout';

  // otp
  static const String sendOtp = '$otp/send';
  static const String resendOtp = '$otp/resend';
  static const String verifyOtp = '$otp/verify';

  // session
  static const String refreshSession = '$session/refresh';
}

class ShopEndpoints {
  // base api path
  static const String basePath = '${ApiConfig.globalPrefix}/${ApiConfig.apiVersion}';

  // root
  static const String shops = '$basePath/shops';

  // shop operations
  static const String me = '$shops/me';
  static const String payoutDetails = '$me/payout-details';
  static const String mediaPicture = '$me/media/picture';
  static const String mediaCover = '$me/media/cover';
  static const String security = '$me/security';
}
