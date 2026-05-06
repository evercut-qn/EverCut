# Android Emulator Setup

## Start Emulator

```bash id="1a8y2w"
flutter emulators
flutter emulators --launch <EMULATOR_ID>
```

## Verify Device

```bash id="z6n4qx"
adb devices
```

## Setup Port Forwarding

```bash id="4m7pkl"
adb reverse tcp:5000 tcp:5000
```

Verify:

```bash id="v2rj8n"
adb reverse --list
```

## Run Flutter App

```bash id="c9t5dw"
flutter pub get
flutter run
```

## If ADB Fails

```bash id="q8n1sx"
adb kill-server
adb start-server
```
