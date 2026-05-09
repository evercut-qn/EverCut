// lib/features/settings/modules/business_profile/presentation/views/edit_amenities/edit_amenities_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../../../shared/enums/amenity.dart';
import '../../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../../shared/widgets/overlays/snackbars.dart';
import '../../../bloc/business_profile_bloc.dart';
import '../../../domain/use_cases/params/update_business_profile_params.dart';

class EditAmenitiesScreen extends StatefulWidget {
  const EditAmenitiesScreen({super.key});

  @override
  State<EditAmenitiesScreen> createState() => _EditAmenitiesScreenState();
}

class _EditAmenitiesScreenState extends State<EditAmenitiesScreen> {
  final Set<AmenityEnum> _selectedAmenities = {};

  void _toggleAmenity(AmenityEnum amenity) {
    setState(() {
      if (_selectedAmenities.contains(amenity)) {
        _selectedAmenities.remove(amenity);
      } else {
        _selectedAmenities.add(amenity);
      }
    });
  }

  void _onApplyChangesButtonPressed() {
    final amenities = _selectedAmenities.map((amenity) => _mapAmenityToBackend(amenity)).toList();

    final params = UpdateBusinessProfileParams(
      amenities: amenities.isNotEmpty ? amenities : null,
    );

    context.read<BusinessProfileBloc>().add(BusinessProfileUpdateRequested(params));
  }

  String _mapAmenityToBackend(AmenityEnum amenity) {
    switch (amenity) {
      case AmenityEnum.airConditioning:
        return 'Air Conditioning';
      case AmenityEnum.waitingArea:
        return 'Waiting Area';
      case AmenityEnum.drinkingWater:
        return 'Drinking Water';
      case AmenityEnum.washrooms:
        return 'Washrooms';
      case AmenityEnum.parkingArea:
        return 'Parking Area';
      case AmenityEnum.wifi:
        return 'Wi-Fi';
      case AmenityEnum.chargingPoints:
        return 'Charging Points';
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<BusinessProfileBloc, BusinessProfileState>(
      listener: (context, state) {
        if (state is BusinessProfileLoaded) {
          SnackBars.of(context).showSuccessSnackBar(
            title: 'Success',
            message: 'Amenities updated successfully',
          );
          Navigator.of(context).pop();
        } else if (state is BusinessProfileFailure) {
          SnackBars.of(context).showErrorSnackBar(
            title: 'Error',
            message: state.message,
          );
        }
      },
      builder: (context, state) {
        final isLoading = state is BusinessProfileUpdating;

        return Scaffold(
          appBar: AppBar(title: const Text('Edit Amenities')),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: EdgeInsets.all(context.scale(24)),
              child: Column(
                spacing: context.scale(18),
                children: [
                  const SectionHeader(
                    title: 'Edit Amenities',
                    description: 'Select the amenities available at your shop to help customers know what to expect.',
                  ),
                  Column(
                    spacing: context.scale(12),
                    children: AmenityEnum.values.map((AmenityEnum amenity) {
                      return CheckboxListTile(
                        value: _selectedAmenities.contains(amenity),
                        onChanged: (bool? value) => _toggleAmenity(amenity),
                        contentPadding: EdgeInsets.symmetric(horizontal: context.scale(12)),
                        secondary: Icon(
                          amenity.icon,
                          size: context.scale(24),
                        ),
                        title: Text(
                          amenity.label,
                          style: TextStyle(fontSize: context.scale(14)),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),
          bottomNavigationBar: CustomBottomAppBar(
            child: Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: isLoading ? null : _onApplyChangesButtonPressed,
                    child: isLoading ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Apply Changes'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
