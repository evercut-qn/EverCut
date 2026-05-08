import 'package:image_picker/image_picker.dart';

import '../../../../core/auth/auth_session.dart';
import '../../../../core/auth/auth_state_notifier.dart';
import '../../../../core/auth/session_store.dart';
import '../../../../core/errors/network_exception.dart';
import '../../domain/repositories/onboarding_repository.dart';
import '../data_sources/onboarding_remote_data_source.dart';

class OnboardingRepositoryImpl implements OnboardingRepository {
  final OnboardingRemoteDataSource remoteDataSource;
  final SessionStore sessionStore;
  final AuthStateNotifier authStateNotifier;

  const OnboardingRepositoryImpl(
    this.remoteDataSource,
    this.sessionStore,
    this.authStateNotifier,
  );

  @override
  Future<AuthSession> completeOnboarding({
    required Map<String, dynamic> fields,
    required XFile photo,
  }) async {
    final String? onboardingToken = await sessionStore.readOnboardingToken();
    if (onboardingToken == null || onboardingToken.isEmpty) {
      throw const UnauthorizedException('Onboarding session expired. Please sign in again.');
    }

    final AuthSession session = await remoteDataSource.createBarberProfile(
      onboardingToken: onboardingToken,
      fields: fields,
      photo: photo,
    );

    if (!session.user.isBarber) {
      throw const ForbiddenException('This app is only available for merchant accounts.');
    }

    await sessionStore.saveSession(session);
    await authStateNotifier.markSessionChanged();
    return session;
  }
}
