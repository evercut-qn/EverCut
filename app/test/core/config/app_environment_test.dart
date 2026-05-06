import 'package:flutter_test/flutter_test.dart';
import 'package:merchant/core/config/app_environment.dart';

void main() {
  test('default API base URL targets Android emulator localhost bridge', () {
    expect(AppEnvironment.apiBaseUrl, 'http://10.0.2.2:5000/api/v1');
    expect(AppEnvironment.name, AppEnvironmentName.development);
  });
}
