// lib/core/constants/api/api_config.dart

import '../../config/app_environment.dart';

class ApiConfig {
  static String get baseUrl => AppEnvironment.apiBaseUrl;
  static const String apiVersion = '/api/v1';
}
