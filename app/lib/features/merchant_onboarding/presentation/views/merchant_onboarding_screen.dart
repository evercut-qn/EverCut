// lib/features/merchant_onboarding/presentation/views/merchant_onboarding_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../cubit/merchant_onboarding_cubit.dart';
import '../widgets/merchant_onboarding_appbar.dart';

import 'amenities/amenities_screen.dart';
import 'availability/availability_screen.dart';
import 'business_profile/business_profile_screen.dart';
import 'payout_details/payout_details_screen.dart';
import 'personal_information/personal_information_screen.dart';

class MerchantOnboardingScreen extends StatefulWidget {
  const MerchantOnboardingScreen({super.key});

  @override
  State<MerchantOnboardingScreen> createState() => _MerchantOnboardingScreenState();
}

class _MerchantOnboardingScreenState extends State<MerchantOnboardingScreen> {
  final PageController _pageController = PageController();
  final List<String> _routeNames = const <String>['Personal Information', 'Business Profile', 'Amenities', 'Availability', 'Payout Details'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: BlocProvider(
          create: (BuildContext context) => MerchantOnboardingCubit(),
          child: Column(
            children: [
              BlocConsumer<MerchantOnboardingCubit, int>(
                buildWhen: (int previousPageIndex, currentPageIndex) {
                  return previousPageIndex != currentPageIndex;
                },
                builder: (BuildContext context, int currentPageIndex) {
                  return MerchantOnboardingAppBar(
                    currentIndex: currentPageIndex,
                    indicatorLength: 5,
                    titleText: _routeNames[currentPageIndex],
                  );
                },
                listenWhen: (int previousPageIndex, currentPageIndex) {
                  return previousPageIndex != currentPageIndex;
                },
                listener: (BuildContext context, int currentPageIndex) {
                  if (_pageController.hasClients && _pageController.page?.round() != currentPageIndex) {
                    _pageController.animateToPage(
                      currentPageIndex,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  }
                },
              ),
              const Divider(height: 1.0),
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
