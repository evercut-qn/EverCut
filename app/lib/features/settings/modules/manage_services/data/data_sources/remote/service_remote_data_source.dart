// lib/features/settings/modules/manage_services/data/data_sources/remote/service_remote_data_source.dart

import '../../models/service_dto.dart';
import '../../../../../../../shared/models/paginated_response.dart';
import '../../models/add_service_request.dart';
import '../../models/update_service_request.dart';

/// Abstract interface for Service remote data source
abstract class ServiceRemoteDataSource {
  /// Get services for barber's own shop (Barber only)
  Future<PaginatedResponse<ServiceDto>> getServices({
    int? page,
    int? limit,
    String? serviceType,
    String? serviceFor,
  });

  /// Add a new service (Barber only)
  Future<ServiceDto> addService(AddServiceRequest request);

  /// Update an existing service (Barber only)
  Future<ServiceDto> updateService({
    required String serviceId,
    required UpdateServiceRequest request,
  });

  /// Delete a service (Barber only)
  Future<void> deleteService(String serviceId);
}
