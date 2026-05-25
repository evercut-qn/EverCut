// lib/features/authentication/data/data_sources/remote/authentication_remote_data_source.dart

import '../../models/request/otp/authentication_otp_resend_request_model.dart';
import '../../models/request/otp/authentication_otp_send_request_model.dart';
import '../../models/request/otp/authentication_otp_verify_request_model.dart';
import '../../models/request/session/authentication_session_logout_request_model.dart';
import '../../models/request/session/authentication_session_refresh_request_model.dart';
import '../../models/response/otp/authentication_otp_verify_response_model.dart';
import '../../models/response/session/authentication_session_refresh_response_model.dart';

abstract interface class AuthenticationRemoteDataSource {
  Future<void> sendOtp(AuthenticationOtpSendRequestModel params);
  Future<void> resendOtp(AuthenticationOtpResendRequestModel params);
  Future<AuthenticationOtpVerifyResponseModel> verifyOtp(AuthenticationOtpVerifyRequestModel params);
  Future<AuthenticationSessionRefreshResponseModel> refreshSession(AuthenticationSessionRefreshRequestModel params);
  Future<void> logout(AuthenticationSessionLogoutRequestModel params);
}
