class ApiResponse<T> {
  final bool success;
  final String message;
  final T data;
  final Map<String, dynamic>? meta;

  const ApiResponse({
    required this.success,
    required this.message,
    required this.data,
    this.meta,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? value) parseData,
  ) {
    return ApiResponse<T>(
      success: json['success'] == true,
      message: (json['message'] ?? '').toString(),
      data: parseData(json['data']),
      meta: json['meta'] == null ? null : Map<String, dynamic>.from(json['meta'] as Map),
    );
  }
}
