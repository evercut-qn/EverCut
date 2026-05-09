// lib/features/authentication/presentation/bloc/authentication_session/authentication_session_state.dart

part of 'authentication_session_bloc.dart';

sealed class AuthenticationSessionState {}

final class AuthenticationSessionInitial extends AuthenticationSessionState {}

final class AuthenticationSessionChecking extends AuthenticationSessionState {}

final class AuthenticationSessionAuthenticated extends AuthenticationSessionState {}

final class AuthenticationSessionUnauthenticated extends AuthenticationSessionState {}

final class AuthenticationSessionRefreshing extends AuthenticationSessionState {}

final class AuthenticationSessionFailure extends AuthenticationSessionState {
  final String message;
  final StackTrace? stackTrace;

  AuthenticationSessionFailure(
    this.message, [
    this.stackTrace,
  ]);
}
