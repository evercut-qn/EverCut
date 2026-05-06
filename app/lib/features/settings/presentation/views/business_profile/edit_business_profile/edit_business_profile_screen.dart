// lib/features/settings/presentation/views/business_profile/edit_business_profile/edit_business_profile_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

import '../../../../../../core/constants/regex/allowed_characters_regex.dart';
import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/models/dropdown_menu_option.dart';
import '../../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../../shared/widgets/common/inputs/dropdown_menu.dart';
import '../../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../shared/widgets/overlays/snackbars.dart';

class EditBusinessProfileScreen extends StatefulWidget {
  const EditBusinessProfileScreen({super.key});

  @override
  State<EditBusinessProfileScreen> createState() => _EditBusinessProfileScreenState();
}

class _EditBusinessProfileScreenState extends State<EditBusinessProfileScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _shopNameController = TextEditingController();
  final TextEditingController _businessCategoryController = TextEditingController();
  final TextEditingController _targetCustomersController = TextEditingController();
  final TextEditingController _shopLocationController = TextEditingController();

  final List<DropdownMenuOption> _businessCategories = <DropdownMenuOption>[
    DropdownMenuOption(icon: AppIcons.solidRoundedChairBarber, label: 'Barber Shop', value: 0),
    DropdownMenuOption(icon: AppIcons.solidRoundedHairDryer, label: 'Hair Salon', value: 1),
    DropdownMenuOption(icon: AppIcons.solidRoundedThread, label: 'Beauty Salon', value: 2),
    DropdownMenuOption(icon: AppIcons.solidRoundedDoor02, label: 'Doorstep Service', value: 3),
  ];

  final List<DropdownMenuOption> _targetCustomers = <DropdownMenuOption>[
    DropdownMenuOption(icon: AppIcons.solidRoundedMan, label: 'Men', value: 0),
    DropdownMenuOption(icon: AppIcons.solidRoundedWoman, label: 'Women', value: 0),
    DropdownMenuOption(icon: AppIcons.solidRoundedManWoman, label: 'Unisex', value: 0),
  ];

  Position? _position;

  Future<Position> _determinePosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return Future.error('Location services are disabled.');
    } else {
      LocationPermission permission = await Geolocator.checkPermission();

      switch (permission) {
        case LocationPermission.denied:
          permission = await Geolocator.requestPermission();

          if (permission == LocationPermission.denied) {
            return Future.error('Location permissions are denied.');
          } else if (permission == LocationPermission.deniedForever) {
            return Future.error('Location permissions are permanently denied, we cannot request permissions.');
          } else {
            return await Geolocator.getCurrentPosition();
          }
        case LocationPermission.deniedForever:
          return Future.error('Location permissions are permanently denied, we cannot request permissions.');
        case LocationPermission.whileInUse:
        case LocationPermission.always:
          return await Geolocator.getCurrentPosition();
        case LocationPermission.unableToDetermine:
          return Future.error('Unable to determine location permission status.');
      }
    }
  }

  Future<void> _onShopLocationTextFormFieldTap() async {
    try {
      final position = await _determinePosition();

      _position = position;

      final placemarks = await placemarkFromCoordinates(position.latitude, position.longitude);
      if (placemarks.isNotEmpty) {
        final List<String?> rawData = [
          placemarks.first.street,
          placemarks.first.locality,
          placemarks.first.subAdministrativeArea,
          placemarks.first.administrativeArea,
          placemarks.first.country,
          placemarks.first.postalCode,
        ];

        final List<String?> data = rawData.map((String? element) {
          if (element != null && element.isNotEmpty) {
            return element;
          }
        }).toList();

        _shopLocationController.text = data.join(', ');
      } else {
        _shopLocationController.text = '${position.latitude}° N, ${position.longitude}° E';
      }
    } catch (error) {
      if (mounted) {
        SnackBars.of(context).showErrorSnackBar(
          title: 'Location Access Failed',
          message: 'We couldn’t access your location. Please check your location permissions and try again.',
        );
      }
    }
  }

  void _onUpdateBusinessProfileButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      SnackBars.of(context).showWarningSnackBar(
        title: 'Incomplete Information',
        message: 'Please fill in all required fields correctly before saving your changes.',
      );
    } else {}
  }

  @override
  void dispose() {
    _shopNameController.dispose();
    _businessCategoryController.dispose();
    _targetCustomersController.dispose();
    _shopLocationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Business Profile')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            spacing: context.scale(18),
            children: [
              const SectionHeader(
                title: 'Edit Your Business Profile',
                description: 'Update your business details to keep your profile current. Make sure all information is accurate.',
              ),
              Form(
                key: _formKey,
                child: Column(
                  spacing: context.scale(16),
                  children: [
                    CustomTextFormField(
                      controller: _shopNameController,
                      inputFormatters: [
                        TextInputFormatter.withFunction((TextEditingValue oldValue, TextEditingValue newValue) {
                          if (RegExp(AllowedCharactersRegEx.words).hasMatch(newValue.text)) {
                            return newValue;
                          } else {
                            return oldValue;
                          }
                        }),
                      ],
                      keyboardType: TextInputType.text,
                      labelText: 'Shop Name',
                      prefixIcon: AppIcons.solidRoundedStore03,
                      textCapitalization: TextCapitalization.words,
                      validator: (String? text) {
                        if (text == null || text.isEmpty) {
                          return 'Please enter your shop name.';
                        } else {
                          return null;
                        }
                      },
                    ),
                    CustomDropdownMenu<int>(
                      controller: _businessCategoryController,
                      dropdownMenuEntries: _businessCategories.map<DropdownMenuEntry<int>>((DropdownMenuOption item) {
                        return DropdownMenuEntry<int>(
                          label: item.label,
                          leadingIcon: Padding(
                            padding: EdgeInsets.only(left: context.scale(6)),
                            child: Icon(
                              item.icon,
                              size: context.scale(20),
                            ),
                          ),
                          value: item.value,
                        );
                      }).toList(),
                      labelText: 'Business Category',
                      leadingIcon: AppIcons.solidRoundedTag01,
                      validator: (int? value) {
                        if (value == null || value.isNaN || value.isNegative) {
                          return 'Please select your business category.';
                        } else {
                          return null;
                        }
                      },
                    ),
                    CustomDropdownMenu<int>(
                      controller: _targetCustomersController,
                      dropdownMenuEntries: _targetCustomers.map<DropdownMenuEntry<int>>((DropdownMenuOption item) {
                        return DropdownMenuEntry<int>(
                          label: item.label,
                          leadingIcon: Padding(
                            padding: EdgeInsets.only(left: context.scale(6)),
                            child: Icon(
                              item.icon,
                              size: context.scale(20),
                            ),
                          ),
                          value: item.value,
                        );
                      }).toList(),
                      labelText: 'Target Customers',
                      leadingIcon: AppIcons.solidRoundedUserGroup,
                      validator: (int? value) {
                        if (value == null || value.isNaN || value.isNegative) {
                          return 'Please select your target customers.';
                        } else {
                          return null;
                        }
                      },
                    ),
                    CustomTextFormField(
                      controller: _shopLocationController,
                      inputFormatters: [
                        TextInputFormatter.withFunction((TextEditingValue oldValue, TextEditingValue newValue) {
                          if (RegExp(AllowedCharactersRegEx.words).hasMatch(newValue.text)) {
                            return newValue;
                          } else {
                            return oldValue;
                          }
                        }),
                      ],
                      keyboardType: TextInputType.text,
                      labelText: 'Shop Location',
                      onTap: _onShopLocationTextFormFieldTap,
                      onSuffixIconPressed: _onShopLocationTextFormFieldTap,
                      prefixIcon: AppIcons.solidRoundedStoreLocation02,
                      suffixIcon: AppIcons.solidRoundedLocation04,
                      readOnly: true,
                      textCapitalization: TextCapitalization.words,
                      validator: (String? text) {
                        if (text == null || text.isEmpty) {
                          return 'Please enter your shop location.';
                        } else {
                          return null;
                        }
                      },
                    ),
                  ],
                ),
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
                onPressed: _onUpdateBusinessProfileButtonPressed,
                child: const Text('Update Business Profile'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
