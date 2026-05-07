// lib/features/services/data/models/add_service_request.dart

class AddServiceRequest {
  final String serviceName;
  final String serviceType;
  final String serviceFor;
  final double actualPrice;
  final double? offerPrice;
  final int? duration;
  final List<String>? bundledServices;
  final int? totalDuration;

  const AddServiceRequest({
    required this.serviceName,
    required this.serviceType,
    required this.serviceFor,
    required this.actualPrice,
    this.offerPrice,
    this.duration,
    this.bundledServices,
    this.totalDuration,
  });

  Map<String, dynamic> toJson() {
    return {
      'serviceName': serviceName,
      'serviceType': serviceType,
      'serviceFor': serviceFor,
      'actualPrice': actualPrice,
      if (offerPrice != null) 'offerPrice': offerPrice,
      if (duration != null) 'duration': duration,
      if (bundledServices != null) 'bundledServices': bundledServices,
      if (totalDuration != null) 'totalDuration': totalDuration,
    };
  }
}
