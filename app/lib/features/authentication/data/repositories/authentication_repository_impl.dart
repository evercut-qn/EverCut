// lib/features/authentication/data/repositories/authentication_repository_impl.dart

import '../../../../core/errors/api/api_exception.dart';
import '../../domain/repositories/authentication_repository.dart';
import '../../domain/use_cases/otp/params/authentication_otp_resend_params.dart';
import '../../domain/use_cases/otp/params/authentication_otp_send_params.dart';
import '../../domain/use_cases/otp/params/authentication_otp_verify_params.dart';
import '../data_sources/local/authentication_local_data_source.dart';
import '../data_sources/remote/authentication_remote_data_source.dart';
import '../models/request/otp/authentication_otp_resend_request_model.dart';
import '../models/request/otp/authentication_otp_send_request_model.dart';
import '../models/request/otp/authentication_otp_verify_request_model.dart';
import '../models/request/session/authentication_session_logout_request_model.dart';
import '../models/request/session/authentication_session_refresh_request_model.dart';
import '../models/response/otp/authentication_otp_verify_response_model.dart';

class AuthenticationRepositoryImpl implements AuthenticationRepository {
  final AuthenticationLocalDataSource localDataSource;
  final AuthenticationRemoteDataSource remoteDataSource;

  const AuthenticationRepositoryImpl(
    this.localDataSource,
    this.remoteDataSource,
  );

  @override
  Future<void> sendOtp(AuthenticationOtpSendParams params) async {
    try {
      return await remoteDataSource.sendOtp(AuthenticationOtpSendRequestModel.fromParams(params));
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> resendOtp(AuthenticationOtpResendParams params) async {
    try {
      return await remoteDataSource.resendOtp(AuthenticationOtpResendRequestModel.fromParams(params));
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> verifyOtp(AuthenticationOtpVerifyParams params) async {
    try {
      final result = await remoteDataSource.verifyOtp(AuthenticationOtpVerifyRequestModel.fromParams(params));
      if (result is AuthenticationNewUserResponseModel) {
        return await localDataSource.saveOnboardingToken(result.onboardingToken);
      } else if (result is AuthenticationExistingUserResponseModel) {
        await Future.wait([
          localDataSource.saveAccessToken(result.accessToken),
          localDataSource.saveRefreshToken(result.refreshToken),
        ]);
      } else {
        throw ApiException('Invalid response');
      }
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<bool> hasActiveSession() async {
    try {
      return await localDataSource.hasActiveSession();
    } catch (_) {
      return false;
    }
  }

  @override
  Future<void> refreshSession() async {
    try {
      final String? refreshToken = await localDataSource.getRefreshToken();
      if (refreshToken != null && refreshToken.isNotEmpty) {
        final tokens = await remoteDataSource.refreshSession(AuthenticationSessionRefreshRequestModel(refreshToken: refreshToken));
        if (tokens.accessToken.isNotEmpty && tokens.refreshToken.isNotEmpty) {
          await Future.wait([
            localDataSource.saveAccessToken(tokens.accessToken),
            localDataSource.saveRefreshToken(tokens.refreshToken),
          ]);
        } else {
          throw ApiException('No active session');
        }
      } else {
        throw ApiException('No active session');
      }
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> logout() async {
    try {
      final String? accessToken = await localDataSource.getAccessToken();
      if (accessToken != null && accessToken.isNotEmpty) {
        await remoteDataSource.logout(AuthenticationSessionLogoutRequestModel(accessToken: accessToken));
        await localDataSource.clearSession();
      } else {
        throw ApiException('No active session');
      }
    } catch (_) {
      rethrow;
    }
  }
}
