# Flutter Developer Guide: Essential Commands & Best Practices

As you continue developing Flutter applications, having a solid grasp of terminal commands and debugging tools will significantly speed up your workflow. This guide covers the most critical commands, their differences, and when to use them.

---

## 1. Hot Reload vs. Hot Restart
These two commands are the lifeblood of Flutter development, but understanding the difference is crucial for avoiding confusing state bugs.

| Feature | Command / Key | What it Does | When to Use It |
| :--- | :--- | :--- | :--- |
| **Hot Reload** | `r` | Injects updated source code into the running Dart Virtual Machine (VM). It **preserves** the current state of your app (e.g., if you are on page 3 of a form, you stay there). It re-executes `build()` methods. | Use for UI tweaks (colors, padding, text changes) and simple logic updates inside `build` methods. |
| **Hot Restart** | `R` (Shift + R) | Restarts the Flutter app entirely by tearing down the state and running `main()` again. It takes slightly longer but guarantees a completely fresh state. | Use when you change **Dependency Injection (GetIt) setups**, add/remove **Global Variables**, alter `initState()`, add assets, or change routes. |

> [!TIP]
> If your app is behaving strangely after a code change and a Hot Reload doesn't fix it, your first instinct should *always* be to Hot Restart.

---

## 2. Dependency and Cache Management
Flutter and Dart rely on `pubspec.yaml` for dependencies. Sometimes, the internal cache gets corrupted or out of sync.

- `flutter pub get`
  Fetches all packages listed in your `pubspec.yaml`. Run this whenever you add a new dependency.
- `flutter clean`
  Deletes the `build/` and `.dart_tool/` directories. 
  **When to use:** Use this when you are getting bizarre build errors (especially Android/iOS native compilation errors) or when the project refuses to compile after switching git branches. Always follow this up with `flutter pub get`.
- `flutter pub cache clean`
  Clears the global Dart package cache. Use this very rarely—only if a specific downloaded package is acting corrupted and you want to force Dart to re-download all dependencies globally.

---

## 3. Code Generation (build_runner)
If you use packages like `freezed`, `json_serializable`, or `riverpod`, you rely on generated code.

- `dart run build_runner build --delete-conflicting-outputs`
  Runs the code generator once. The `--delete-conflicting-outputs` flag is highly recommended as it forces the generator to overwrite old generated files.
- `dart run build_runner watch --delete-conflicting-outputs`
  Keeps the generator running in the background, automatically updating `.g.dart` or `.freezed.dart` files whenever you save a change.

---

## 4. ADB (Android Debug Bridge) & Emulator Commands
When working with Android, ADB is your best friend for low-level debugging.

- `adb devices`
  Lists all connected devices and running emulators. If your phone isn't showing up in Flutter, check here first.
- `adb logcat | grep flutter` *(Mac/Linux)* or `adb logcat | findstr flutter` *(Windows)*
  Streams the raw device logs but filters them exclusively for Flutter output. Great for catching deep native crashes.
- `adb reverse tcp:5000 tcp:5000`
  Forwards a port from your physical Android device to your computer's `localhost`. **Crucial when your Flutter app needs to talk to a local NodeJS backend.**
- `flutter emulators`
  Lists all available emulators on your machine.
- `flutter emulators --launch <emulator_id>`
  Boots up a specific emulator from the terminal without needing to open Android Studio.

---

## 5. Build and Release Commands
When you are ready to compile your app for production.

- `flutter build apk --release`
  Builds a "fat" APK containing all architectures. Good for distributing directly to testers via email/Slack.
- `flutter build appbundle --release`
  Builds an Android App Bundle (AAB). **This is required by the Google Play Store.** It is highly optimized and much smaller than an APK.
- `flutter build ipa`
  Builds an iOS archive. You can then distribute it via TestFlight or the App Store through Xcode.

> [!WARNING]
> Always ensure you have configured your signing keys (`key.properties` for Android, Provisioning Profiles for iOS) before running release builds, otherwise they will fail.

---

## 6. Day-to-Day Best Practices

### State Management & Lifecycle
- **Never instantiate heavy objects in `build()`:** The `build()` method can run dozens of times per second (e.g., during animations). Always initialize BLoCs, Cubits, and heavy controllers in `initState()` or inject them via Dependency Injection (like GetIt).
- **Dispose your Controllers:** Always call `.dispose()` on `TextEditingController`, `ScrollController`, and `StreamController` inside your `StatefulWidget`'s `dispose()` method to prevent memory leaks.

### Widget Tree Optimization
- **Use `const` everywhere:** Adding `const` to widgets tells Flutter that the widget will *never* change. During a rebuild, Flutter completely skips `const` widgets, saving massive amounts of CPU cycles. (Turn on `flutter_lints` to get warnings when you forget `const`).
- **Keep widgets small:** Instead of one massive `build()` method, extract distinct UI components into their own `StatelessWidget` classes. This not only makes code readable but actually improves performance, as Flutter can rebuild small widgets independently without rebuilding the entire screen.

### Error Handling
- **Avoid silent catches:** When catching exceptions, at minimum use `debugPrint(e.toString())`. Silent catches make debugging impossible in production.
- **Use `context.mounted`:** If you are performing an `async` operation (like an API call) and then trying to show a SnackBar or navigate, *always* check `if (!context.mounted) return;` before using `context`. Otherwise, if the user navigated away while the API was loading, the app will crash.
