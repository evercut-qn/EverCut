import 'package:flutter/foundation.dart';

import 'auth_session.dart';
import 'session_store.dart';

enum AppAuthStatus {
  unknown,
  unauthenticated,
  onboarding,
  authenticated,
}

class AppAuthState {
  final AppAuthStatus status;
  final AuthSession? session;

  const AppAuthState._(this.status, this.session);

  const AppAuthState.unknown() : this._(AppAuthStatus.unknown, null);
  const AppAuthState.unauthenticated() : this._(AppAuthStatus.unauthenticated, null);
  const AppAuthState.onboarding() : this._(AppAuthStatus.onboarding, null);
  const AppAuthState.authenticated(AuthSession session) : this._(AppAuthStatus.authenticated, session);
}

class AuthStateNotifier extends ChangeNotifier {
  final SessionStore sessionStore;
  AppAuthState _state = const AppAuthState.unknown();

  AuthStateNotifier(this.sessionStore);

  AppAuthState get state => _state;

  Future<void> restore() async {
    final AuthSession? session = await sessionStore.readSession();
    if (session != null && session.user.isBarber) {
      _setState(AppAuthState.authenticated(session));
      return;
    }

    final String? onboardingToken = await sessionStore.readOnboardingToken();
    if (onboardingToken != null && onboardingToken.isNotEmpty) {
      _setState(const AppAuthState.onboarding());
      return;
    }

    _setState(const AppAuthState.unauthenticated());
  }

  Future<void> markSessionChanged() {
    return restore();
  }

  Future<void> clear() async {
    await sessionStore.clearSession();
    _setState(const AppAuthState.unauthenticated());
  }

  void _setState(AppAuthState state) {
    _state = state;
    notifyListeners();
  }
}
