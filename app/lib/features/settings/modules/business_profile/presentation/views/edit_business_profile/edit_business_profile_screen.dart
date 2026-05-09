// lib/features/settings/modules/business_profile/presentation/views/edit_business_profile/edit_business_profile_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';

import '../../../../../../../core/constants/regex/allowed_characters_regex.dart';
import '../../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../../shared/enums/business_category.dart';
import '../../../../../../../shared/enums/target_customer.dart';
import '../../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../../../shared/widgets/common/inputs/dropdown_menu.dart';
import '../../../../../../../shared/widgets/common/inputs/location_picker_field.dart';
import '../../../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../../shared/widgets/overlays/snackbars.dart';
import '../../../../../../shared/enums/business_category.dart' as bc;
import '../../../../../../shared/enums/target_customer.dart' as tc;
import '../../../bloc/business_profile_bloc.dart';
import '../../../domain/use_cases/params/update_business_profile_params.dart';

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

  Position? _position;

  void _onSaveChangesButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final businessCategoryValue = _businessCategoryController.text.isNotEmpty
        ? int.tryParse(_businessCategoryController.text)
        : null;
    final targetCustomersValue = _targetCustomersController.text.isNotEmpty
        ? int.tryParse(_targetCustomersController.text)
        : null;

    final params = UpdateBusinessProfileParams(
      shopName: _shopNameController.text.trim(),
      category: businessCategoryValue != null ? _mapBusinessCategory(businessCategoryValue) : null,
      targetCustomers: targetCustomersValue != null ? _mapTargetCustomer(targetCustomersValue) : null,
      address: _shopLocationController.text.trim(),
      location: _position != null
          ? UpdateBusinessProfileParams.LocationParams(
              type: 'Point',
              coordinates: [_position!.longitude, _position!.latitude],
            )
          : null,
    );

    context.read<BusinessProfileBloc>().add(BusinessProfileUpdateRequested(params));
  }

  String _mapBusinessCategory(int value) {
    switch (value) {
      case 0:
        return 'Barber';
      case 1:
        return 'Salon';
      case 2:
        return 'Beauty Parlour';
      case 3:
        return 'Door-Step';
      default:
        return 'Barber';
    }
  }

  String _mapTargetCustomer(int value) {
    switch (value) {
      case 0:
        return 'male';
      case 1:
        return 'female';
      case 2:
        return 'unisex';
      default:
        return 'male';
    }
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
    return BlocConsumer<BusinessProfileBloc, BusinessProfileState>(
      listener: (context, state) {
        if (state is BusinessProfileLoaded) {
          SnackBars.of(context).showSuccessSnackBar(
            title: 'Success',
            message: 'Business profile updated successfully',
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
          appBar: AppBar(title: const Text('Edit Business Profile')),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: EdgeInsets.all(context.scale(24)),
              child: Column(
                spacing: context.scale(18),
                children: [
                  const SectionHeader(
                    title: 'Manage Business Profile',
                    description: 'Update your business details to keep your profile current. Make sure all information is accurate.',
                  ),
                  Form(
                    autovalidateMode: AutovalidateMode.onUnfocus,
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
                          dropdownMenuEntries: BusinessCategoryEnum.values.map<DropdownMenuEntry<int>>((BusinessCategoryEnum businessCategory) {
                            return DropdownMenuEntry<int>(
                              label: businessCategory.label,
                              leadingIcon: Padding(
                                padding: EdgeInsets.only(left: context.scale(6)),
                                child: Icon(
                                  businessCategory.icon,
                                  size: context.scale(20),
                                ),
                              ),
                              value: businessCategory.value,
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
                          dropdownMenuEntries: TargetCustomerEnum.values.map<DropdownMenuEntry<int>>((TargetCustomerEnum targetCustomer) {
                            return DropdownMenuEntry<int>(
                              label: targetCustomer.label,
                              leadingIcon: Padding(
                                padding: EdgeInsets.only(left: context.scale(6)),
                                child: Icon(
                                  targetCustomer.icon,
                                  size: context.scale(20),
                                ),
                              ),
                              value: targetCustomer.value,
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
                        LocationPickerField(
                          controller: _shopLocationController,
                          onChange: (Position position) {
                            _position = position;
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
                    onPressed: isLoading ? null : _onSaveChangesButtonPressed,
                    child: isLoading ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save Changes'),
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
