// lib/features/onboarding/presentation/views/onboarding_screen.dart

import 'package:flutter/material.dart';

import '../../../../core/di/injection.dart' as di;
import '../../../../core/theme/presentation/cubit/theme_cubit.dart';

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => di.sl<ThemeCubit>().changeThemeMode(ThemeMode.light),
                      child: Text(
                        'Light Mode',
                      ),
                    ),
                  ),
                  Expanded(
                    child: TextButton(
                      onPressed: () => di.sl<ThemeCubit>().changeThemeMode(ThemeMode.dark),
                      child: Text(
                        'Dark Mode',
                      ),
                    ),
                  ),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => di.sl<ThemeCubit>().changeThemeMode(ThemeMode.system),
                      child: Text(
                        'System Default',
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
