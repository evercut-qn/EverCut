// lib/core/errors/app_exception.dart

abstract class AppException implements Exception {
  final String message;
  const AppException(this.message);
}
