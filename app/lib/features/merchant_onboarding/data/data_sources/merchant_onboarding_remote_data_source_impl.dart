import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/auth/auth_session.dart';
import '../../../../core/config/app_environment.dart';
import '../../../../core/constants/api/api_endpoints.dart';
import '../../../../core/errors/network_exception.dart';

import 'merchant_onboarding_remote_data_source.dart';

class MerchantOnboardingRemoteDataSourceImpl implements MerchantOnboardingRemoteDataSource {
  final http.Client httpClient;

  const MerchantOnboardingRemoteDataSourceImpl(this.httpClient);

  @override
  Future<AuthSession> createBarberProfile({
    required String onboardingToken,
    required Map<String, dynamic> fields,
    required List<XFile> photos,
  }) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('${AppEnvironment.apiBaseUrl}${OnboardingEndpoints.barbers}'),
    );

    request.headers['Accept'] = 'application/json';
    request.headers['Authorization'] = 'Bearer $onboardingToken';
    fields.forEach((key, value) {
      request.fields[key] = value is String ? value : jsonEncode(value);
    });

    for (final XFile photo in photos) {
      final String mimeType = photo.mimeType ?? 'image/jpeg';
      final MediaType mediaType = MediaType.parse(mimeType);

      request.files.add(
        await http.MultipartFile.fromPath(
          'photos', 
          photo.path,
          contentType: mediaType,
        ),
      );
    }

    final streamedResponse = await request.send().timeout(const Duration(seconds: 60));
    final response = await http.Response.fromStream(streamedResponse);
    final Map<String, dynamic> envelope = Map<String, dynamic>.from(jsonDecode(response.body) as Map);

    if (response.statusCode < 200 || response.statusCode >= 300 || envelope['success'] != true) {
      throw NetworkException(
        (envelope['message'] ?? 'Merchant onboarding failed').toString(),
        statusCode: response.statusCode,
        details: envelope['data'],
      );
    }

    final data = Map<String, dynamic>.from(envelope['data'] as Map);
    return AuthSession(
      user: AuthUser.fromJson(Map<String, dynamic>.from(data['user'] as Map)),
      profile: Map<String, dynamic>.from(data['shop'] as Map),
      accessToken: (data['accessToken'] ?? '').toString(),
      refreshToken: (data['refreshToken'] ?? '').toString(),
    );
  }
}
