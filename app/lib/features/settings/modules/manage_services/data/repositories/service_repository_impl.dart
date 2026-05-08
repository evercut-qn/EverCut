// lib/features/settings/modules/manage_services/data/repositories/service_repository_impl.dart

import '../../domain/entities/service.dart';
import '../../domain/repositories/service_repository.dart';
import '../../../../../../shared/models/paginated_response.dart';
import '../data_sources/remote/service_remote_data_source.dart';
import '../models/add_service_request.dart';
import '../models/update_service_request.dart';

class ServiceRepositoryImpl implements ServiceRepository {
  final ServiceRemoteDataSource remoteDataSource;

  const ServiceRepositoryImpl(this.remoteDataSource);

  @override
  Future<PaginatedResponse<Service>> getServices({
    int? page,
    int? limit,
    ServiceType? serviceType,
    ServiceFor? serviceFor,
  }) async {
    final response = await remoteDataSource.getServices(
      page: page,
      limit: limit,
      serviceType: serviceType?.toJson(),
      serviceFor: serviceFor?.toJson(),
    );

    final items = response.items.map((dto) => dto.toDomain()).toList();
    return PaginatedResponse(
      items: items,
      pagination: response.pagination,
    );
  }

  @override
  Future<Service> addService({
    required String serviceName,
    required ServiceType serviceType,
    required ServiceFor serviceFor,
    required double actualPrice,
    double? offerPrice,
    int? duration,
    List<String>? bundledServices,
    int? totalDuration,
  }) async {
    final request = AddServiceRequest(
      serviceName: serviceName,
      serviceType: serviceType.toJson(),
      serviceFor: serviceFor.toJson(),
      actualPrice: actualPrice,
      offerPrice: offerPrice,
      duration: duration,
      bundledServices: bundledServices,
      totalDuration: totalDuration,
    );

    final dto = await remoteDataSource.addService(request);
    return dto.toDomain();
  }

  @override
  Future<Service> updateService({
    required String serviceId,
    String? serviceName,
    ServiceFor? serviceFor,
    double? actualPrice,
    double? offerPrice,
    int? duration,
    List<String>? bundledServices,
    int? totalDuration,
  }) async {
    final request = UpdateServiceRequest(
      serviceName: serviceName,
      serviceFor: serviceFor?.toJson(),
      actualPrice: actualPrice,
      offerPrice: offerPrice,
      duration: duration,
      bundledServices: bundledServices,
      totalDuration: totalDuration,
    );

    final dto = await remoteDataSource.updateService(
      serviceId: serviceId,
      request: request,
    );
    return dto.toDomain();
  }

  @override
  Future<void> deleteService(String serviceId) async {
    await remoteDataSource.deleteService(serviceId);
  }
}
