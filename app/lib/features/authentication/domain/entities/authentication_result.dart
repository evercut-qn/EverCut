import '../../../../core/auth/auth_session.dart';

sealed class AuthenticationResult {
  const AuthenticationResult();
}

class ExistingMerchantSession extends AuthenticationResult {
  final AuthSession session;
  const ExistingMerchantSession(this.session);
}

class NewMerchantOnboardingRequired extends AuthenticationResult {
  final String onboardingToken;
  const NewMerchantOnboardingRequired(this.onboardingToken);
}
