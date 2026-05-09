// lib/features/authentication/data/data_sources/remote/authentication_remote_data_source_impl.dart

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../../../core/constants/api/api_config.dart';
import '../../../../../core/constants/api/api_endpoints.dart';
import '../../../../../core/errors/api/api_exception.dart';
import '../../../../../shared/models/api/api_response_model.dart';
import '../../models/request/otp/authentication_otp_resend_request_model.dart';
import '../../models/request/otp/authentication_otp_send_request_model.dart';
import '../../models/request/otp/authentication_otp_verify_request_model.dart';
import '../../models/request/session/authentication_session_logout_request_model.dart';
import '../../models/request/session/authentication_session_refresh_request_model.dart';
import '../../models/response/otp/authentication_otp_verify_response_model.dart';
import '../../models/response/session/authentication_session_refresh_response_model.dart';

import 'authentication_remote_data_source.dart';

class AuthenticationRemoteDataSourceImpl implements AuthenticationRemoteDataSource {
  final http.Client client;

  const AuthenticationRemoteDataSourceImpl(this.client);

  @override
  Future<void> sendOtp(AuthenticationOtpSendRequestModel params) async {
    try {
      final http.Response response = await client.post(
        Uri.http(ApiConfig.baseUrl, AuthenticationEndpoints.sendOtp),
        body: jsonEncode(params.toJson()),
        headers: {'Content-Type': 'application/json'},
      );

      // if (response.statusCode < 200 || response.statusCode >= 300) {
      //   throw ApiException('Request failed with status code ${response.statusCode}');
      // }

      final Map<String, dynamic> json = jsonDecode(response.body);
      final ApiResponseModel<void> apiResponse = ApiResponseModel<void>.fromJson(json, null);

      if (!apiResponse.success) {
        throw ApiException(apiResponse.message);
      }
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> resendOtp(AuthenticationOtpResendRequestModel params) async {
    try {
      final http.Response response = await client.post(
        Uri.http(ApiConfig.baseUrl, AuthenticationEndpoints.resendOtp),
        body: jsonEncode(params.toJson()),
        headers: {'Content-Type': 'application/json'},
      );

      final Map<String, dynamic> json = jsonDecode(response.body);
      final ApiResponseModel<void> apiResponse = ApiResponseModel<void>.fromJson(json, null);

      if (!apiResponse.success) {
        throw ApiException(apiResponse.message);
      }
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<AuthenticationOtpVerifyResponseModel> verifyOtp(AuthenticationOtpVerifyRequestModel params) async {
    try {
      final http.Response response = await client.post(
        Uri.http(ApiConfig.baseUrl, AuthenticationEndpoints.verifyOtp),
        body: jsonEncode(params.toJson()),
        headers: {'Content-Type': 'application/json'},
      );

      final Map<String, dynamic> json = jsonDecode(response.body);
      final ApiResponseModel<Map<String, dynamic>> apiResponse = ApiResponseModel<Map<String, dynamic>>.fromJson(json, (data) {
        return data as Map<String, dynamic>;
      });

      if (!apiResponse.success) {
        throw ApiException(apiResponse.message);
      } else {
        if (apiResponse.data == null) {
          throw ApiException('No data returned');
        } else {
          return AuthenticationOtpVerifyResponseModel.fromJson(apiResponse.data!);
        }
      }
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<AuthenticationSessionRefreshResponseModel> refreshSession(AuthenticationSessionRefreshRequestModel params) async {
    try {
      final http.Response response = await client.post(
        Uri.http(ApiConfig.baseUrl, AuthenticationEndpoints.refreshSession),
        body: jsonEncode(params.toJson()),
        headers: {'Content-Type': 'application/json'},
      );

      final Map<String, dynamic> json = jsonDecode(response.body);
      final ApiResponseModel<Map<String, dynamic>> apiResponse = ApiResponseModel<Map<String, dynamic>>.fromJson(json, (data) {
        return data as Map<String, dynamic>;
      });

      if (!apiResponse.success) {
        throw ApiException(apiResponse.message);
      } else {
        if (apiResponse.data == null) {
          throw ApiException('No data returned');
        } else {
          return AuthenticationSessionRefreshResponseModel.fromJson(apiResponse.data!);
        }
      }
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> logout(AuthenticationSessionLogoutRequestModel params) async {
    try {
      final http.Response response = await client.post(
        Uri.http(ApiConfig.baseUrl, AuthenticationEndpoints.logout),
        headers: {'Authorization': 'Bearer ${params.accessToken}'},
      );

      final Map<String, dynamic> json = jsonDecode(response.body);
      final ApiResponseModel<void> apiResponse = ApiResponseModel<void>.fromJson(json, null);

      if (!apiResponse.success) {
        throw ApiException(apiResponse.message);
      }
    } catch (_) {
      rethrow;
    }
  }
}
