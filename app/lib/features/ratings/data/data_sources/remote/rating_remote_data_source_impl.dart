// lib/features/ratings/data/data_sources/remote/rating_remote_data_source_impl.dart

import '../../../../../core/constants/api/api_endpoints.dart';
import '../../../../../core/network/api_client.dart';
import '../../../../../shared/models/paginated_response.dart';
import '../../models/rating_dto.dart';
import '../../models/rating_summary_dto.dart';
import 'rating_remote_data_source.dart';

class RatingRemoteDataSourceImpl implements RatingRemoteDataSource {
  final ApiClient apiClient;

  const RatingRemoteDataSourceImpl(this.apiClient);

  @override
  Future<RatingDto> addRating({
    required String shopId,
    required int rating,
    String? review,
  }) async {
    final response = await apiClient.post<Map<String, dynamic>>(
      RatingEndpoints.ratings,
      body: {
        'shopId': shopId,
        'rating': rating,
        if (review != null && review.isNotEmpty) 'review': review,
      },
      parseData: _map,
    );

    return RatingDto.fromJson(response.data);
  }

  @override
  Future<PaginatedResponse<RatingDto>> getShopRatings({
    required String shopId,
    int? page,
    int? limit,
  }) async {
    final queryParams = <String, String>{};
    if (page != null) queryParams['page'] = page.toString();
    if (limit != null) queryParams['limit'] = limit.toString();

    final uri = Uri.parse(RatingEndpoints.shopRatings(shopId))
        .replace(queryParameters: queryParams.isEmpty ? null : queryParams);

    final response = await apiClient.get<List<dynamic>>(
      uri.toString(),
      authenticated: false,
      parseData: _list,
    );

    final items = response.data
        .map((json) => RatingDto.fromJson(json as Map<String, dynamic>))
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
  Future<RatingSummaryDto> getShopRatingSummary(String shopId) async {
    final response = await apiClient.get<Map<String, dynamic>>(
      RatingEndpoints.shopRatingSummary(shopId),
      authenticated: false,
      parseData: _map,
    );

    return RatingSummaryDto.fromJson(response.data);
  }

  @override
  Future<PaginatedResponse<RatingDto>> getOwnedRatings({
    int? page,
    int? limit,
  }) async {
    final queryParams = <String, String>{};
    if (page != null) queryParams['page'] = page.toString();
    if (limit != null) queryParams['limit'] = limit.toString();

    final uri = Uri.parse(RatingEndpoints.ratings)
        .replace(queryParameters: queryParams.isEmpty ? null : queryParams);

    final response = await apiClient.get<List<dynamic>>(
      uri.toString(),
      parseData: _list,
    );

    final items = response.data
        .map((json) => RatingDto.fromJson(json as Map<String, dynamic>))
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
  Future<RatingSummaryDto> getOwnedRatingSummary() async {
    final response = await apiClient.get<Map<String, dynamic>>(
      RatingEndpoints.summary,
      parseData: _map,
    );

    return RatingSummaryDto.fromJson(response.data);
  }

  @override
  Future<RatingDto> addReply({
    required String ratingId,
    required String replyText,
  }) async {
    final response = await apiClient.post<Map<String, dynamic>>(
      RatingEndpoints.ratingReply(ratingId),
      body: {'replyText': replyText},
      parseData: _map,
    );

    return RatingDto.fromJson(response.data);
  }

  @override
  Future<RatingDto> updateReply({
    required String ratingId,
    required String replyText,
  }) async {
    final response = await apiClient.put<Map<String, dynamic>>(
      RatingEndpoints.ratingReply(ratingId),
      body: {'replyText': replyText},
      parseData: _map,
    );

    return RatingDto.fromJson(response.data);
  }

  @override
  Future<void> deleteReply(String ratingId) async {
    await apiClient.delete<Map<String, dynamic>>(
      RatingEndpoints.ratingReply(ratingId),
      parseData: _map,
    );
  }

  @override
  Future<void> deleteRating(String ratingId) async {
    await apiClient.delete<Map<String, dynamic>>(
      RatingEndpoints.deleteRating(ratingId),
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
