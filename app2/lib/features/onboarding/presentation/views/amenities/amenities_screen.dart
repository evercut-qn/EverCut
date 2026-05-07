// lib/features/onboarding/presentation/views/amenities/amenities_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../shared/enums/amenity.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/extensions/other/set_extension.dart';
import '../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../shared/widgets/common/section/section_header.dart';
import '../../cubit/onboarding_cubit.dart';

class AmenitiesScreen extends StatefulWidget {
  const AmenitiesScreen({super.key});

  @override
  State<AmenitiesScreen> createState() => _AmenitiesScreenState();
}

class _AmenitiesScreenState extends State<AmenitiesScreen> {
  final Set<AmenityEnum> _amenities = AmenityEnum.values.toSet();
  final Set<AmenityEnum> _selectedAmenities = <AmenityEnum>{};

  void _toggleAmenity(AmenityEnum amenity) {
    setState(() {
      _selectedAmenities.toggle(amenity);
    });
  }

  void _onBackButtonPressed() => context.read<OnboardingCubit>().previousPage();
  void _onNextButtonPressed() => context.read<OnboardingCubit>().nextPage();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            spacing: context.scale(16),
            children: [
              const SectionHeader(
                title: 'Select Amenities',
                description: 'Choose your shop\'s available facilities to enhance the overall customer experience.',
              ),
              Expanded(
                child: SingleChildScrollView(
                  child: Material(
                    clipBehavior: Clip.hardEdge,
                    color: context.appColors.backgroundShade75,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(context.scale(12)),
                      side: BorderSide(color: context.appColors.backgroundShade200),
                    ),
                    child: Padding(
                      padding: EdgeInsets.all(context.scale(12)),
                      child: ListView.separated(
                        itemBuilder: (BuildContext context, int index) {
                          final AmenityEnum amenity = _amenities.elementAt(index);
                          return ListTile(
                            contentPadding: EdgeInsets.all(context.scale(12)),
                            horizontalTitleGap: context.scale(12),
                            leading: Icon(
                              amenity.icon,
                              color: context.appColors.neutralShade750,
                              size: context.scale(24),
                            ),
                            minTileHeight: 0,
                            minLeadingWidth: 0,
                            minVerticalPadding: 0,
                            onTap: () => _toggleAmenity(amenity),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(context.scale(8)),
                            ),
                            title: Text(
                              amenity.label,
                              style: TextStyle(
                                color: context.appColors.neutralShade750,
                                fontSize: context.scale(14),
                              ),
                            ),
                            trailing: Checkbox(
                              value: _selectedAmenities.contains(amenity),
                              onChanged: (bool? value) => _toggleAmenity(amenity),
                              side: Theme.of(context).checkboxTheme.side?.copyWith(
                                color: context.appColors.neutralShade750,
                              ),
                            ),
                          );
                        },
                        itemCount: _amenities.length,
                        padding: EdgeInsets.zero,
                        physics: const NeverScrollableScrollPhysics(),
                        separatorBuilder: (BuildContext context, int index) {
                          return Divider(
                            color: context.appColors.backgroundShade200,
                            height: context.scale(24) + 1.0,
                            indent: context.scale(48),
                          );
                        },
                        shrinkWrap: true,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: CustomBottomAppBar(
        child: Row(
          spacing: context.scale(12),
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _onBackButtonPressed,
                child: const Text('Back'),
              ),
            ),
            Expanded(
              child: FilledButton(
                onPressed: _onNextButtonPressed,
                child: const Text('Next'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
