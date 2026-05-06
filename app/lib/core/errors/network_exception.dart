import 'app_exception.dart';

class NetworkException extends AppException {
  final int? statusCode;
  final Object? details;

  const NetworkException(
    super.message, {
    this.statusCode,
    this.details,
  });
}

class UnauthorizedException extends NetworkException {
  const UnauthorizedException(super.message, {super.statusCode = 401});
}

class ForbiddenException extends NetworkException {
  const ForbiddenException(super.message, {super.statusCode = 403});
}
