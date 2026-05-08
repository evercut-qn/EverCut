// lib/features/settings/modules/manage_services/domain/repositories/service_repository.dart

import '../entities/service.dart';
import '../../../../../../shared/models/paginated_response.dart';

/// Abstract repository interface for Service operations
abstract class ServiceRepository {
  /// Get services for barber's own shop (Barber only)
  Future<PaginatedResponse<Service>> getServices({
    int? page,
    int? limit,
    ServiceType? serviceType,
    ServiceFor? serviceFor,
  });

  /// Add a new service (Barber only)
  Future<Service> addService({
    required String serviceName,
    required ServiceType serviceType,
    required ServiceFor serviceFor,
    required double actualPrice,
    double? offerPrice,
    int? duration,
    List<String>? bundledServices,
    int? totalDuration,
  });

  /// Update an existing service (Barber only)
  Future<Service> updateService({
    required String serviceId,
    String? serviceName,
    ServiceFor? serviceFor,
    double? actualPrice,
    double? offerPrice,
    int? duration,
    List<String>? bundledServices,
    int? totalDuration,
  });

  /// Delete a service (Barber only)
  Future<void> deleteService(String serviceId);
}
