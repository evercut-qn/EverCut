// lib/features/authentication/presentation/bloc/authentication_session/authentication_session_bloc.dart

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../core/errors/app_exception.dart';
import '../../../domain/use_cases/session/use_cases/authentication_session_check_use_case.dart';
import '../../../domain/use_cases/session/use_cases/authentication_session_logout_use_case.dart';
import '../../../domain/use_cases/session/use_cases/authentication_session_refresh_use_case.dart';

part 'authentication_session_event.dart';
part 'authentication_session_state.dart';

class AuthenticationSessionBloc extends Bloc<AuthenticationSessionEvent, AuthenticationSessionState> {
  final AuthenticationSessionCheckUseCase authenticationSessionCheck;
  final AuthenticationSessionRefreshUseCase authenticationSessionRefresh;
  final AuthenticationSessionLogoutUseCase authenticationSessionLogout;

  AuthenticationSessionBloc(
    this.authenticationSessionCheck,
    this.authenticationSessionRefresh,
    this.authenticationSessionLogout,
  ) : super(AuthenticationSessionInitial()) {
    on<AuthenticationSessionCheckRequested>((
      AuthenticationSessionCheckRequested event,
      Emitter<AuthenticationSessionState> emit,
    ) async {
      try {
        emit(AuthenticationSessionChecking());
        emit(AuthenticationSessionAuthenticated());
        emit(AuthenticationSessionUnauthenticated());
      } on AppException catch (error, stackTrace) {
        emit(AuthenticationSessionFailure(error.message, stackTrace));
      } catch (error, stackTrace) {
        emit(AuthenticationSessionFailure(error.toString(), stackTrace));
      }
    });

    on<AuthenticationSessionEstablished>((
      AuthenticationSessionEstablished event,
      Emitter<AuthenticationSessionState> emit,
    ) async {
      try {
        emit(AuthenticationSessionAuthenticated());
      } on AppException catch (error, stackTrace) {
        emit(AuthenticationSessionFailure(error.message, stackTrace));
      } catch (error, stackTrace) {
        emit(AuthenticationSessionFailure(error.toString(), stackTrace));
      }
    });

    on<AuthenticationSessionRefreshRequested>((
      AuthenticationSessionRefreshRequested event,
      Emitter<AuthenticationSessionState> emit,
    ) async {
      try {
        emit(AuthenticationSessionRefreshing());
        emit(AuthenticationSessionAuthenticated());
        emit(AuthenticationSessionUnauthenticated());
      } on AppException catch (error, stackTrace) {
        emit(AuthenticationSessionFailure(error.message, stackTrace));
      } catch (error, stackTrace) {
        emit(AuthenticationSessionFailure(error.toString(), stackTrace));
      }
    });

    on<AuthenticationSessionLogoutRequested>((
      AuthenticationSessionLogoutRequested event,
      Emitter<AuthenticationSessionState> emit,
    ) async {
      try {
        emit(AuthenticationSessionUnauthenticated());
      } on AppException catch (error, stackTrace) {
        emit(AuthenticationSessionFailure(error.message, stackTrace));
      } catch (error, stackTrace) {
        emit(AuthenticationSessionFailure(error.toString(), stackTrace));
      }
    });
  }
}
