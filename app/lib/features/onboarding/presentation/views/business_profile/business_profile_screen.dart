// lib/features/onboarding/presentation/views/business_profile/business_profile_screen.dart

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../../core/constants/regex/allowed_characters_regex.dart';
import '../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../shared/enums/business_category.dart';
import '../../../../../shared/enums/target_customer.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/painters/dashed_border.dart';
import '../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../shared/widgets/common/inputs/dropdown_menu.dart';
import '../../../../../shared/widgets/common/inputs/location_picker_field.dart';
import '../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../shared/widgets/other/image_selector/image_selector.dart';
import '../../../../../shared/widgets/overlays/snackbars.dart';
import '../../../../../shared/widgets/common/section/section_header.dart';
import '../../cubit/onboarding_cubit.dart';

class BusinessProfileScreen extends StatefulWidget {
  const BusinessProfileScreen({super.key});

  @override
  State<BusinessProfileScreen> createState() => _BusinessProfileScreenState();
}

class _BusinessProfileScreenState extends State<BusinessProfileScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _shopNameController = TextEditingController();
  final TextEditingController _businessCategoryController = TextEditingController();
  final TextEditingController _targetCustomersController = TextEditingController();
  final TextEditingController _shopLocationController = TextEditingController();

  XFile? _selectedImage;
  Position? _position;
  BusinessCategoryEnum? _selectedBusinessCategory;
  TargetCustomerEnum? _selectedTargetCustomer;

  bool _doesImageHaveError = false;

  void _onBackButtonPressed() => context.read<OnboardingCubit>().previousPage();
  void _onNextButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      SnackBars.of(context).showWarningSnackBar(
        title: 'Incomplete Information',
        message: 'Please fill in all required fields before continuing to the next steps.',
      );
    } else {
      if (_selectedImage == null) {
        SnackBars.of(context).showWarningSnackBar(
          title: 'Image Required',
          message: 'Please select a shop image before proceeding with the next steps.',
        );
      } else {
        context.read<OnboardingCubit>().updateFields({
          'shopName': _shopNameController.text.trim(),
          'category': _backendCategory(_selectedBusinessCategory ?? BusinessCategoryEnum.barberShop),
          'targetCustomers': _backendTargetCustomers(_selectedTargetCustomer ?? TargetCustomerEnum.men),
          'address': _shopLocationController.text.trim().isEmpty ? 'Selected shop location' : _shopLocationController.text.trim(),
          'location': {
            'type': 'Point',
            'coordinates': [
              _position?.longitude ?? 0.0,
              _position?.latitude ?? 0.0,
            ],
          },
        });
        context.read<OnboardingCubit>().updatePhoto(_selectedImage!);
        context.read<OnboardingCubit>().nextPage();
      }
    }
  }

  String _backendCategory(BusinessCategoryEnum category) {
    switch (category) {
      case BusinessCategoryEnum.hairSalon:
        return 'Salon';
      case BusinessCategoryEnum.beautySalon:
        return 'Beauty Parlour';
      case BusinessCategoryEnum.doorstepService:
        return 'Door-Step';
      case BusinessCategoryEnum.barberShop:
        return 'Barber';
    }
  }

  String _backendTargetCustomers(TargetCustomerEnum targetCustomer) {
    switch (targetCustomer) {
      case TargetCustomerEnum.women:
        return 'female';
      case TargetCustomerEnum.unisex:
        return 'unisex';
      case TargetCustomerEnum.men:
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
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              children: [
                Padding(
                  padding: EdgeInsets.all(context.scale(24)),
                  child: Form(
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
                          onSelected: (int? value) {
                            if (value != null) {
                              _selectedBusinessCategory = BusinessCategoryEnumExtension.fromValue(value);
                            }
                          },
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
                          onSelected: (int? value) {
                            if (value != null) {
                              _selectedTargetCustomer = TargetCustomerEnumExtension.fromValue(value);
                            }
                          },
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
                ),
                Divider(
                  color: context.appColors.backgroundShade200,
                  height: 1.0,
                ),
                Padding(
                  padding: EdgeInsets.all(context.scale(24)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: context.scale(16),
                    children: [
                      const SectionHeader(
                        title: 'Upload Shop Image',
                        description: 'Please upload a clear photo of your shop. This will be visible to all your customers.',
                      ),
                      SizedBox(
                        width: double.infinity,
                        child: AspectRatio(
                          aspectRatio: 1.6,
                          child: ImageSelector(
                            builder: (BuildContext context, XFile? selectedImage, VoidCallback onSelect, VoidCallback onRemove) {
                              if (selectedImage != null) {
                                return Stack(
                                  children: [
                                    Positioned.fill(
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(context.scale(8)),
                                        clipBehavior: Clip.hardEdge,
                                        child: Image(
                                          image: FileImage(File(selectedImage.path)),
                                          errorBuilder: (BuildContext context, Object error, StackTrace? stackTrace) {
                                            setState(() => (_doesImageHaveError = true));
                                            return Material(
                                              borderRadius: BorderRadius.circular(context.scale(8)),
                                              clipBehavior: Clip.hardEdge,
                                              color: Theme.of(context).inputDecorationTheme.fillColor,
                                              child: Padding(
                                                padding: EdgeInsets.all(context.scale(8)),
                                                child: CustomPaint(
                                                  painter: DashedBorderPainter(
                                                    borderRadius: context.scale(8),
                                                    color: Theme.of(context).inputDecorationTheme.enabledBorder!.borderSide.color,
                                                    dashPattern: [context.scale(5), context.scale(5)],
                                                  ),
                                                  child: InkWell(
                                                    borderRadius: BorderRadius.circular(context.scale(8)),
                                                    onTap: onSelect,
                                                    overlayColor: WidgetStatePropertyAll(context.appColors.neutralShade150.withAlpha(127)),
                                                    child: Padding(
                                                      padding: EdgeInsets.all(context.scale(16)),
                                                      child: Column(
                                                        crossAxisAlignment: CrossAxisAlignment.center,
                                                        mainAxisAlignment: MainAxisAlignment.center,
                                                        spacing: context.scale(12),
                                                        children: [
                                                          Icon(
                                                            AppIcons.solidRoundedAlert01,
                                                            color: context.appColors.backgroundShade400,
                                                            size: context.scale(20),
                                                          ),
                                                          Text(
                                                            'Couldn\'t load image, tap to pick another.',
                                                            textAlign: TextAlign.center,
                                                            maxLines: 2,
                                                            style: TextStyle(
                                                              color: context.appColors.backgroundShade600,
                                                              fontSize: context.scale(10.75),
                                                              overflow: TextOverflow.ellipsis,
                                                            ),
                                                          ),
                                                        ],
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            );
                                          },
                                          fit: BoxFit.cover,
                                          loadingBuilder: (BuildContext context, Widget child, ImageChunkEvent? loadingProgress) {
                                            if (loadingProgress != null) {
                                              return Shimmer.fromColors(
                                                baseColor: context.appColors.backgroundShade75,
                                                highlightColor: context.appColors.backgroundShade150,
                                                child: ColoredBox(
                                                  color: context.appColors.backgroundShade75,
                                                ),
                                              );
                                            } else {
                                              return child;
                                            }
                                          },
                                        ),
                                      ),
                                    ),
                                    if (!_doesImageHaveError) ...[
                                      Align(
                                        alignment: Alignment.topRight,
                                        child: Padding(
                                          padding: EdgeInsets.only(
                                            top: context.scale(6),
                                            right: context.scale(6),
                                          ),
                                          child: Material(
                                            color: context.appColors.redShade100.withAlpha(159),
                                            clipBehavior: Clip.hardEdge,
                                            shape: const CircleBorder(),
                                            child: InkWell(
                                              onTap: onRemove,
                                              child: Padding(
                                                padding: EdgeInsets.all(context.scale(6)),
                                                child: Icon(
                                                  AppIcons.solidRoundedMultiplicationSign,
                                                  color: Colors.white.withAlpha(159),
                                                  size: context.scale(12),
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                );
                              } else {
                                return Material(
                                  borderRadius: BorderRadius.circular(context.scale(8)),
                                  clipBehavior: Clip.hardEdge,
                                  color: Theme.of(context).inputDecorationTheme.fillColor,
                                  child: Padding(
                                    padding: EdgeInsets.all(context.scale(8)),
                                    child: CustomPaint(
                                      painter: DashedBorderPainter(
                                        borderRadius: context.scale(8),
                                        color: Theme.of(context).inputDecorationTheme.enabledBorder!.borderSide.color,
                                        dashPattern: [context.scale(5), context.scale(5)],
                                      ),
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(context.scale(8)),
                                        onTap: onSelect,
                                        overlayColor: WidgetStatePropertyAll(context.appColors.neutralShade150.withAlpha(127)),
                                        child: Padding(
                                          padding: EdgeInsets.all(context.scale(8)),
                                          child: Center(
                                            child: Icon(
                                              AppIcons.solidRoundedStoreAdd02,
                                              color: Theme.of(context).inputDecorationTheme.enabledBorder?.borderSide.color,
                                              size: context.scale(20),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              }
                            },
                            onChange: (XFile? selectedImage) {
                              setState(() {
                                _doesImageHaveError = false;
                                _selectedImage = selectedImage;
                              });
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        CustomBottomAppBar(
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
      ],
    );
  }
}
