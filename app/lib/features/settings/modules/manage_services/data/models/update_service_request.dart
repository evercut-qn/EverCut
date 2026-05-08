// lib/features/settings/modules/manage_services/data/models/update_service_request.dart

class UpdateServiceRequest {
  final String? serviceName;
  final String? serviceFor;
  final double? actualPrice;
  final double? offerPrice;
  final int? duration;
  final List<String>? bundledServices;
  final int? totalDuration;

  const UpdateServiceRequest({
    this.serviceName,
    this.serviceFor,
    this.actualPrice,
    this.offerPrice,
    this.duration,
    this.bundledServices,
    this.totalDuration,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};

    if (serviceName != null) json['serviceName'] = serviceName;
    if (serviceFor != null) json['serviceFor'] = serviceFor;
    if (actualPrice != null) json['actualPrice'] = actualPrice;
    if (offerPrice != null) json['offerPrice'] = offerPrice;
    if (duration != null) json['duration'] = duration;
    if (bundledServices != null) json['bundledServices'] = bundledServices;
    if (totalDuration != null) json['totalDuration'] = totalDuration;

    return json;
  }
}
