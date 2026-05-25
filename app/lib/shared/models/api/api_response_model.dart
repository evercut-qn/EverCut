// lib/shared/models/api/api_response_model.dart

class ApiResponseModel<T> {
  final bool success;
  final String message;
  final T? data;

  const ApiResponseModel({
    required this.success,
    required this.message,
    required this.data,
  });

  factory ApiResponseModel.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic data)? fromJson,
  ) {
    return ApiResponseModel<T>(
      success: json['success'] as bool,
      message: json['message'] as String,
      data: fromJson != null ? fromJson(json['data']) : null,
    );
  }
}
