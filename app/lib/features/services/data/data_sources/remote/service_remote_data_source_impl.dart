// lib/features/services/data/data_sources/remote/service_remote_data_source_impl.dart

import '../../../../../core/constants/api/api_endpoints.dart';
import '../../../../../core/network/api_client.dart';
import '../../../../../shared/models/paginated_response.dart';
import '../../models/service_dto.dart';
import '../../models/add_service_request.dart';
import '../../models/update_service_request.dart';
import 'service_remote_data_source.dart';

class ServiceRemoteDataSourceImpl implements ServiceRemoteDataSource {
  final ApiClient apiClient;

  const ServiceRemoteDataSourceImpl(this.apiClient);

  @override
  Future<PaginatedResponse<ServiceDto>> getServices({
    int? page,
    int? limit,
    String? serviceType,
    String? serviceFor,
  }) async {
    final queryParams = <String, String>{};
    if (page != null) queryParams['page'] = page.toString();
    if (limit != null) queryParams['limit'] = limit.toString();
    if (serviceType != null) queryParams['serviceType'] = serviceType;
    if (serviceFor != null) queryParams['serviceFor'] = serviceFor;

    final uri = Uri.parse(ServiceEndpoints.services)
        .replace(queryParameters: queryParams.isEmpty ? null : queryParams);

    final response = await apiClient.get<List<dynamic>>(
      uri.toString(),
      parseData: _list,
    );

    final items = response.data
        .map((json) => ServiceDto.fromJson(json as Map<String, dynamic>))
        .toList();

    final pagination = response.meta != null
        ? PaginationMeta.fromJson(response.meta!)
        : const PaginationMeta(
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPreviousPage: false,
          );

    return PaginatedResponse(items: items, pagination: pagination);
  }

  @override
  Future<ServiceDto> addService(AddServiceRequest request) async {
    final response = await apiClient.post<Map<String, dynamic>>(
      ServiceEndpoints.services,
      body: request.toJson(),
      parseData: _map,
    );

    return ServiceDto.fromJson(response.data);
  }

  @override
  Future<ServiceDto> updateService({
    required String serviceId,
    required UpdateServiceRequest request,
  }) async {
    final response = await apiClient.put<Map<String, dynamic>>(
      ServiceEndpoints.serviceById(serviceId),
      body: request.toJson(),
      parseData: _map,
    );

    return ServiceDto.fromJson(response.data);
  }

  @override
  Future<void> deleteService(String serviceId) async {
    await apiClient.delete<Map<String, dynamic>>(
      ServiceEndpoints.serviceById(serviceId),
      parseData: _map,
    );
  }

  Map<String, dynamic> _map(Object? value) {
    if (value == null) return <String, dynamic>{};
    return Map<String, dynamic>.from(value as Map);
  }

  List<dynamic> _list(Object? value) {
    if (value == null) return <dynamic>[];
    return List<dynamic>.from(value as List);
  }
}
