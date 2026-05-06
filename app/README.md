# EverCut Merchant App

Flutter merchant/barber client for EverCut.

## Backend Configuration

The app reads its API URL from `--dart-define`.

Default development value:

```bash
http://10.0.2.2:5000/api/v1
```

Useful runs:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api/v1
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:5000/api/v1
flutter run --dart-define=APP_ENV=staging --dart-define=API_BASE_URL=https://staging-api.evercut.com/api/v1
```

Use `10.0.2.2` for Android emulator access to a backend running on the host machine. Use `127.0.0.1` for iOS simulator.

## Auth Flow

The app uses backend MSG91 OTP auth:

1. Send OTP: `POST /auth/otp/send`
2. Verify OTP: `POST /auth/otp/verify`
3. Returning BARBER users receive and store access/refresh tokens.
4. New users receive an onboarding token and complete merchant onboarding.
5. Protected calls use `Authorization: Bearer <accessToken>`.
6. A `401` response triggers one refresh-token retry.

This app rejects non-BARBER sessions because it is the merchant client.
