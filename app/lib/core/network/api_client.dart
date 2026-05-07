import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../auth/session_store.dart';
import '../constants/api/api_config.dart';
import '../errors/network_exception.dart';

import 'api_response.dart';
import 'auth_token_refresher.dart';

class ApiClient {
  final http.Client httpClient;
  final SessionStore sessionStore;
  AuthTokenRefresher? tokenRefresher;

  ApiClient(
    this.httpClient,
    this.sessionStore, {
    this.tokenRefresher,
  });

  Future<ApiResponse<T>> get<T>(
    String path, {
    T Function(Object? value)? parseData,
    bool authenticated = true,
  }) {
    return _send<T>(
      'GET',
      path,
      parseData: parseData,
      authenticated: authenticated,
    );
  }

  Future<ApiResponse<T>> post<T>(
    String path, {
    Map<String, dynamic>? body,
    T Function(Object? value)? parseData,
    bool authenticated = true,
    String? bearerToken,
  }) {
    return _send<T>(
      'POST',
      path,
      body: body,
      parseData: parseData,
      authenticated: authenticated,
      bearerToken: bearerToken,
    );
  }

  Future<ApiResponse<T>> put<T>(
    String path, {
    Map<String, dynamic>? body,
    T Function(Object? value)? parseData,
    bool authenticated = true,
  }) {
    return _send<T>(
      'PUT',
      path,
      body: body,
      parseData: parseData,
      authenticated: authenticated,
    );
  }

  Future<ApiResponse<T>> delete<T>(
    String path, {
    T Function(Object? value)? parseData,
    bool authenticated = true,
  }) {
    return _send<T>(
      'DELETE',
      path,
      parseData: parseData,
      authenticated: authenticated,
    );
  }

  Future<ApiResponse<T>> _send<T>(
    String method,
    String path, {
    Map<String, dynamic>? body,
    T Function(Object? value)? parseData,
    bool authenticated = true,
    String? bearerToken,
    bool hasRetried = false,
  }) async {
    final Uri uri = Uri.parse('${ApiConfig.baseUrl}$path');
    final Map<String, String> headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    final String? token = bearerToken ?? (authenticated ? await sessionStore.readAccessToken() : null);
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    late final http.Response response;
    try {
      response = await _request(method, uri, headers, body).timeout(const Duration(seconds: 30));
    } on TimeoutException {
      throw const NetworkException('Request timed out');
    } catch (error) {
      throw NetworkException('Network request failed', details: error);
    }

    if (response.statusCode == 401 && authenticated && bearerToken == null && !hasRetried && tokenRefresher != null) {
      final bool refreshed = await tokenRefresher!.refreshToken();
      if (refreshed) {
        return _send<T>(
          method,
          path,
          body: body,
          parseData: parseData,
          authenticated: authenticated,
          hasRetried: true,
        );
      }

      await tokenRefresher!.clearSession();
    }

    return _parseResponse<T>(response, parseData ?? _identity<T>);
  }

  Future<http.Response> _request(
    String method,
    Uri uri,
    Map<String, String> headers,
    Map<String, dynamic>? body,
  ) {
    final Object? encodedBody = body == null ? null : jsonEncode(body);

    switch (method) {
      case 'GET':
        return httpClient.get(uri, headers: headers);
      case 'POST':
        return httpClient.post(uri, headers: headers, body: encodedBody);
      case 'PUT':
        return httpClient.put(uri, headers: headers, body: encodedBody);
      case 'DELETE':
        return httpClient.delete(uri, headers: headers, body: encodedBody);
      default:
        throw NetworkException('Unsupported HTTP method: $method');
    }
  }

  ApiResponse<T> _parseResponse<T>(
    http.Response response,
    T Function(Object? value) parseData,
  ) {
    final Object? decoded = response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
    if (decoded is! Map) {
      throw NetworkException('Invalid API response', statusCode: response.statusCode);
    }

    final Map<String, dynamic> envelope = Map<String, dynamic>.from(decoded);
    final ApiResponse<T> apiResponse = ApiResponse<T>.fromJson(envelope, parseData);

    if (response.statusCode >= 200 && response.statusCode < 300 && apiResponse.success) {
      return apiResponse;
    }

    if (response.statusCode == 401) {
      throw UnauthorizedException(apiResponse.message, statusCode: response.statusCode);
    }
    if (response.statusCode == 403) {
      throw ForbiddenException(apiResponse.message, statusCode: response.statusCode);
    }

    throw NetworkException(
      apiResponse.message.isEmpty ? 'Request failed' : apiResponse.message,
      statusCode: response.statusCode,
      details: apiResponse.data,
    );
  }

  T _identity<T>(Object? value) => value as T;
}
