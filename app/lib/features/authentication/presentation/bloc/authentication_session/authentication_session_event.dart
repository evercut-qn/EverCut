// lib/features/authentication/presentation/bloc/authentication_session/authentication_session_event.dart

part of 'authentication_session_bloc.dart';

sealed class AuthenticationSessionEvent {}

final class AuthenticationSessionCheckRequested extends AuthenticationSessionEvent {}

final class AuthenticationSessionEstablished extends AuthenticationSessionEvent {}

final class AuthenticationSessionRefreshRequested extends AuthenticationSessionEvent {}

final class AuthenticationSessionLogoutRequested extends AuthenticationSessionEvent {}
