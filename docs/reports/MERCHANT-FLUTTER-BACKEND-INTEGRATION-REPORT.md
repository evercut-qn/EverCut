# Merchant Flutter Backend Integration Report

**Date:** 2026-05-06  
**Scope:** `server/` Express API and `app/` Flutter merchant client

## System Analysis Summary

The backend already exposes a reusable MSG91 OTP + JWT authentication contract. Returning users receive access and refresh tokens; new users receive a short-lived onboarding token and complete role-specific onboarding before a persistent session is created.

The Flutter app was merchant-focused but had stubbed authentication and no production networking layer. OTP screens emitted local success states, API configuration was empty, token storage did not exist, and startup routing always favored onboarding rather than restored session state.

## Problems Identified

- Flutter `ApiConfig.baseUrl` was empty.
- Flutter auth repository, local data source, and remote data source were stubs.
- OTP send, resend, and verify did not call the backend.
- No secure access-token, refresh-token, or onboarding-token persistence existed.
- No reusable API client existed for JSON envelopes, Bearer headers, timeout handling, or refresh-on-401.
- Route startup did not restore or guard sessions.
- The merchant onboarding UI collected one image while the backend requires exactly three onboarding photos.
- Android lacked explicit internet permission and deep-link intent filters.
- iOS lacked URL scheme registration.
- Backend CORS config was inline and used wildcard origins outside production.

## Final Architecture

Backend remains role-generic with `CUSTOMER`, `BARBER`, and `ADMIN`. This Flutter app only accepts `BARBER` sessions. Customer and admin apps can reuse the same backend contract later without changing the auth primitives.

Flutter now uses:

- `AppEnvironment` for `--dart-define` driven API base URL selection.
- `SessionStore` backed by `flutter_secure_storage` for tokens and `SharedPreferences` for non-secret session metadata.
- `ApiClient` for standard JSON requests, envelope parsing, Bearer token injection, timeout handling, and one refresh retry on `401`.
- `AuthenticationRepositoryImpl` as the owner of OTP flows, token rotation, logout, and session clearing.
- `AuthStateNotifier` as the router refresh source for startup/session guard decisions.
- `MerchantOnboardingRepositoryImpl` for onboarding-token protected multipart barber profile creation.

## Backend Changes

- Added `server/src/config/cors.config.js`.
- Updated `server/src/app.js` to use centralized CORS options.
- Updated `server/.env.example` with explicit local `ALLOWED_ORIGINS`.
- Added CORS behavior tests in `server/src/config/__tests__/cors-config.test.js`.

## Flutter Changes

- Added environment configuration in `app/lib/core/config/app_environment.dart`.
- Added API endpoint constants.
- Added secure session storage and auth state notifier.
- Added reusable API client and network exceptions.
- Implemented real authentication remote/local data sources and repository.
- Replaced fake OTP BLoC success with backend calls.
- Added session-aware go_router redirects.
- Added merchant onboarding multipart submission.
- Added Android internet permission, local cleartext allowance for development, and `evercutmerchant://` deep-link intent filter.
- Added iOS `evercutmerchant://` URL scheme.
- Added `flutter_secure_storage`.

## Authentication Flow

1. Merchant enters phone number.
2. Flutter calls `POST /api/v1/auth/otp/send`.
3. Merchant verifies OTP.
4. Flutter calls `POST /api/v1/auth/otp/verify`.
5. If `isNewUser: true`, Flutter stores the onboarding token and routes to merchant onboarding.
6. If returning `BARBER`, Flutter stores access/refresh tokens and routes to dashboard.
7. If another role returns, Flutter rejects the session for this app.
8. Protected requests use `Authorization: Bearer <accessToken>`.
9. A `401` triggers one refresh attempt through `POST /api/v1/auth/token/refresh`.
10. Refresh failure clears local session and returns the app to authentication.

## Mobile Networking

Default Flutter development API URL:

```bash
http://10.0.2.2:5000/api/v1
```

Override per platform/environment:

```bash
flutter run --dart-define=APP_ENV=development --dart-define=API_BASE_URL=http://10.0.2.2:5000/api/v1
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:5000/api/v1
flutter run --dart-define=APP_ENV=staging --dart-define=API_BASE_URL=https://staging-api.evercut.com/api/v1
```

Native Flutter HTTP calls do not require CORS. Browser/web clients still use backend `ALLOWED_ORIGINS`.

## Deep Linking

The merchant app now declares the `evercutmerchant://` scheme on Android and iOS. Current OTP auth does not require redirect handling, but this prepares the app for future payment callbacks, magic links, or OAuth flows.

## File-Wise Changes

- `server/src/config/cors.config.js`: centralized CORS origin parsing and policy.
- `server/src/app.js`: CORS middleware uses config module.
- `server/.env.example`: explicit local origins.
- `app/pubspec.yaml`, `app/pubspec.lock`: secure storage dependency.
- `app/lib/core/config/app_environment.dart`: environment and base URL.
- `app/lib/core/auth/*`: session and router auth state.
- `app/lib/core/network/*`: API client, envelopes, refresh abstraction.
- `app/lib/features/authentication/**`: real OTP/auth flow.
- `app/lib/features/merchant_onboarding/**`: accumulated draft and multipart submit.
- `app/android/app/src/main/AndroidManifest.xml`: internet, cleartext local dev, URL scheme.
- `app/ios/Runner/Info.plist`: URL scheme.

## Edge Cases Handled

- Missing access token.
- Expired access token with refresh retry.
- Refresh-token failure clears session.
- New-user onboarding token is stored separately from a full session.
- Non-barber sessions are rejected by the merchant app.
- Native mobile requests without an `Origin` header are accepted by CORS middleware.
- Unknown browser origins are rejected in production/staging.

## Security Considerations

- Refresh tokens are stored in secure platform storage rather than plain preferences.
- Access tokens are not stored in source code or environment constants.
- Onboarding token cannot access normal protected APIs because backend middleware checks token type.
- Backend still owns identity; Flutter does not send user IDs for auth-scoped operations.
- Production and staging browser origins should be explicit through `ALLOWED_ORIGINS`.
- Development cleartext traffic is enabled for local emulator support and should be revisited before release hardening.

## Testing Performed

The backend CORS test was written first. Node's test runner failed in this environment with `spawn EPERM`, including when targeting a single file. Flutter dependency resolution succeeded after approval. `flutter test` and broad analyzer commands timed out in this environment before producing diagnostics.

Manual static checks and targeted file inspections were performed for touched integration files. Full CI should run:

```bash
cd server && npm.cmd test
cd app && flutter test
cd app && flutter analyze
```

## Assumptions

- This Flutter app is merchant/barber-only.
- Customer app work will be a separate client using the same backend auth contract.
- Backend remains the source of role truth.
- Local Android emulator development should default to `10.0.2.2`.
- iOS simulator development can pass `API_BASE_URL=http://127.0.0.1:5000/api/v1`.

## Future Improvements

- Add a dedicated release network security config to disable cleartext traffic outside development.
- Add universal links/app links once production domains are finalized.
- Add refresh mutexing to avoid duplicate refresh calls during concurrent `401`s.
- Add a richer permission model if shop staff/operator roles are introduced.
- Add end-to-end Flutter integration tests with a mock API client.
