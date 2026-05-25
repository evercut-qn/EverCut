// lib/features/onboarding/presentation/views/onboarding_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../cubit/onboarding_cubit.dart';
import '../widgets/onboarding_appbar.dart';

import 'amenities/amenities_screen.dart';
import 'availability/availability_screen.dart';
import 'business_profile/business_profile_screen.dart';
import 'payout_details/payout_details_screen.dart';
import 'personal_information/personal_information_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  final List<String> _routeNames = const <String>[
    'Personal Information',
    'Business Profile',
    'Amenities',
    'Availability',
    'Payout Details',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: BlocProvider(
          create: (BuildContext context) => OnboardingCubit(),
          child: Column(
            children: [
              BlocConsumer<OnboardingCubit, OnboardingState>(
                buildWhen: (OnboardingState previous, OnboardingState current) {
                  return previous.currentStep != current.currentStep;
                },
                builder: (BuildContext context, OnboardingState state) {
                  return OnboardingAppBarWidget(
                    currentIndex: state.currentStep,
                    indicatorLength: 5,
                    titleText: _routeNames[state.currentStep],
                  );
                },
                listenWhen: (OnboardingState previous, OnboardingState current) {
                  return previous.currentStep != current.currentStep;
                },
                listener: (BuildContext context, OnboardingState state) {
                  if (_pageController.hasClients && _pageController.page?.round() != state.currentStep) {
                    _pageController.animateToPage(
                      state.currentStep,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  }
                },
              ),
              Divider(
                color: context.appColors.backgroundShade200,
                height: 1.0,
              ),
              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  children: const [
                    PersonalInformationScreen(),
                    BusinessProfileScreen(),
                    AmenitiesScreen(),
                    AvailabilityScreen(),
                    PayoutDetailsScreen(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
