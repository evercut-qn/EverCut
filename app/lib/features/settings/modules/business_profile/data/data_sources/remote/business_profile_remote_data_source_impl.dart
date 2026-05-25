// lib/features/settings/modules/business_profile/data/data_sources/remote/business_profile_remote_data_source_impl.dart

import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../../../../core/constants/api/api_config.dart';
import '../../../../../../core/constants/api/api_endpoints.dart';
import '../../../../../../core/errors/api/api_exception.dart';
import '../../../../../../shared/models/api/api_response_model.dart';
import '../../../../../../features/authentication/data/data_sources/local/authentication_local_data_source.dart';
import '../../models/request/update_business_profile_request_model.dart';
import '../../models/request/update_payout_details_request_model.dart';
import '../../models/request/update_pin_request_model.dart';
import '../../models/response/shop_profile_response_model.dart';

import 'business_profile_remote_data_source.dart';

class BusinessProfileRemoteDataSourceImpl implements BusinessProfileRemoteDataSource {
  final http.Client client;
  final AuthenticationLocalDataSource localDataSource;

  const BusinessProfileRemoteDataSourceImpl(
    this.client,
    this.localDataSource,
  );

  String _getBaseUrl() => ApiConfig.baseUrl;

  Future<Map<String, String>> _getHeaders() async {
    final String? accessToken = await localDataSource.getAccessToken();
    return {
      'Content-Type': 'application/json',
      if (accessToken != null) 'Authorization': 'Bearer $accessToken',
    };
  }

  @override
  Future<ShopProfileResponseModel> getShopProfile() async {
    try {
      final headers = await _getHeaders();
      final response = await client.get(
        Uri.http(_getBaseUrl(), ShopEndpoints.me),
        headers: headers,
      );

      final json = jsonDecode(response.body);
      final apiResponse = ApiResponseModel<Map<String, dynamic>>.fromJson(json, (data) {
        return data as Map<String, dynamic>;
      });

      if (!apiResponse.success) {
        throw ApiException(apiResponse.message);
      }

      if (apiResponse.data == null) {
        throw ApiException('No data returned');
      }

      return ShopProfileResponseModel.fromJson(apiResponse.data!);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<ShopProfileResponseModel> updateBusinessProfile(UpdateBusinessProfileRequestModel params) async {
    try {
      final headers = await _getHeaders();
      final response = await client.patch(
        Uri.http(_getBaseUrl(), ShopEndpoints.me),
        body: jsonEncode(params.toJson()),
        headers: headers,
      );

      final json = jsonDecode(response.body);
      final apiResponse = ApiResponseModel<Map<String, dynamic>>.fromJson(json, (data) {
        return data as Map<String, dynamic>;
      });

      if (!apiResponse.success) {
        throw ApiException(apiResponse.message);
      }

      if (apiResponse.data == null) {
        throw ApiException('No data returned');
      }

      return ShopProfileResponseModel.fromJson(apiResponse.data!);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<ShopProfileResponseModel> getPayoutDetails() async {
    try {
      final headers = await _getHeaders();
      final response = await client.get(
        Uri.http(_getBaseUrl(), ShopEndpoints.payoutDetails),
        headers: headers,
      );

      final json = jsonDecode(response.body);
      final apiResponse = ApiResponseModel<Map<String, dynamic>>.fromJson(json, (data) {
        return data as Map<String, dynamic>;
      });

      if (!apiResponse.success) {
        throw ApiException(apiResponse.message);
      }

      if (apiResponse.data == null) {
        throw ApiException('No data returned');
      }

      return ShopProfileResponseModel.fromJson(apiResponse.data!);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<ShopProfileResponseModel> updatePayoutDetails(UpdatePayoutDetailsRequestModel params) async {
    try {
      final headers = await _getHeaders();
      final response = await client.patch(
        Uri.http(_getBaseUrl(), ShopEndpoints.payoutDetails),
        body: jsonEncode(params.toJson()),
        headers: headers,
      );

      final json = jsonDecode(response.body);
      final apiResponse = ApiResponseModel<Map<String, dynamic>>.fromJson(json, (data) {
        return data as Map<String, dynamic>;
      });

      if (!apiResponse.success) {
        throw ApiException(apiResponse.message);
      }

      if (apiResponse.data == null) {
        throw ApiException('No data returned');
      }

      return ShopProfileResponseModel.fromJson(apiResponse.data!);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<ShopProfileResponseModel> updateProfilePicture(String filePath) async {
    try {
      final headers = await _getHeaders();
      headers.remove('Content-Type'); // Let http package set multipart boundary

      final request = http.MultipartRequest('PATCH', Uri.http(_getBaseUrl(), ShopEndpoints.mediaPicture));
      request.headers.addAll(headers);
      request.files.add(await http.MultipartFile.fromPath('photo', filePath));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      final json = jsonDecode(response.body);
      final apiResponse = ApiResponseModel<Map<String, dynamic>>.fromJson(json, (data) {
        return data as Map<String, dynamic>;
      });

      if (!apiResponse.success) {
        throw ApiException(apiResponse.message);
      }

      if (apiResponse.data == null) {
        throw ApiException('No data returned');
      }

      return ShopProfileResponseModel.fromJson(apiResponse.data!);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<ShopProfileResponseModel> updateCoverImage(String filePath) async {
    try {
      final headers = await _getHeaders();
      headers.remove('Content-Type'); // Let http package set multipart boundary

      final request = http.MultipartRequest('PATCH', Uri.http(_getBaseUrl(), ShopEndpoints.mediaCover));
      request.headers.addAll(headers);
      request.files.add(await http.MultipartFile.fromPath('cover', filePath));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      final json = jsonDecode(response.body);
      final apiResponse = ApiResponseModel<Map<String, dynamic>>.fromJson(json, (data) {
        return data as Map<String, dynamic>;
      });

      if (!apiResponse.success) {
        throw ApiException(apiResponse.message);
      }

      if (apiResponse.data == null) {
        throw ApiException('No data returned');
      }

      return ShopProfileResponseModel.fromJson(apiResponse.data!);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> updatePin(UpdatePinRequestModel params) async {
    try {
      final headers = await _getHeaders();
      final response = await client.patch(
        Uri.http(_getBaseUrl(), ShopEndpoints.security),
        body: jsonEncode(params.toJson()),
        headers: headers,
      );

      final json = jsonDecode(response.body);
      final apiResponse = ApiResponseModel<dynamic>.fromJson(json, null);

      if (!apiResponse.success) {
        throw ApiException(apiResponse.message);
      }
    } catch (_) {
      rethrow;
    }
  }
}
