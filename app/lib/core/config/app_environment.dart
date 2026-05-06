enum AppEnvironmentName {
  development,
  staging,
  production,
}

class AppEnvironment {
  static const String _environment = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'development',
  );

  static const String _apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:5000/api/v1',
  );

  static AppEnvironmentName get name {
    return AppEnvironmentName.values.firstWhere(
      (value) => value.name == _environment,
      orElse: () => AppEnvironmentName.development,
    );
  }

  static String get apiBaseUrl {
    final String normalized = _apiBaseUrl.trim();
    if (normalized.endsWith('/')) {
      return normalized.substring(0, normalized.length - 1);
    }
    return normalized;
  }

  static bool get isProduction => name == AppEnvironmentName.production;
}
