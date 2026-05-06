// lib/features/settings/presentation/views/manage_account/edit_profile/edit_profile_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../../../../../core/constants/regex/allowed_characters_regex.dart';
import '../../../../../../core/constants/regex/basic_regex.dart';
import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/models/dropdown_menu_option.dart';
import '../../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../../shared/widgets/common/inputs/date_picker_field.dart';
import '../../../../../../shared/widgets/common/inputs/dropdown_menu.dart';
import '../../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../shared/widgets/overlays/snackbars.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _emailAddressController = TextEditingController();
  final TextEditingController _phoneNumberController = TextEditingController();
  final TextEditingController _dateOfBirthController = TextEditingController();
  final TextEditingController _genderController = TextEditingController();

  final List<DropdownMenuOption> _genders = const <DropdownMenuOption>[
    DropdownMenuOption(icon: Icons.male, label: 'Male', value: 0),
    DropdownMenuOption(icon: Icons.female, label: 'Female', value: 1),
    DropdownMenuOption(icon: Icons.transgender, label: 'Transgender', value: 2),
  ];

  void _onUpdateProfileButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      SnackBars.of(context).showWarningSnackBar(
        title: 'Missing Required Information',
        message: 'Please complete all required fields correctly before saving your changes.',
      );
    } else {}
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailAddressController.dispose();
    _phoneNumberController.dispose();
    _dateOfBirthController.dispose();
    _genderController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profile')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            spacing: context.scale(18),
            children: [
              const SectionHeader(
                title: 'Edit Your Profile',
                description: 'Update your information below. Make sure your details are accurate and up to date.',
              ),
              Form(
                key: _formKey,
                child: Column(
                  spacing: context.scale(16),
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: context.scale(16),
                      children: [
                        Expanded(
                          child: CustomTextFormField(
                            autovalidateMode: AutovalidateMode.onUnfocus,
                            controller: _firstNameController,
                            errorMaxLines: 3,
                            inputFormatters: [
                              TextInputFormatter.withFunction((TextEditingValue oldValue, TextEditingValue newValue) {
                                if (RegExp(AllowedCharactersRegEx.alphabets).hasMatch(newValue.text)) {
                                  return newValue;
                                } else {
                                  return oldValue;
                                }
                              }),
                            ],
                            keyboardType: TextInputType.text,
                            labelText: 'First Name',
                            prefixIcon: AppIcons.solidRoundedUser,
                            textCapitalization: TextCapitalization.words,
                            validator: (String? text) {
                              if (text == null || text.isEmpty) {
                                return 'Please enter your first name.';
                              } else {
                                return null;
                              }
                            },
                          ),
                        ),
                        Expanded(
                          child: CustomTextFormField(
                            autovalidateMode: AutovalidateMode.onUnfocus,
                            controller: _lastNameController,
                            errorMaxLines: 3,
                            inputFormatters: [
                              TextInputFormatter.withFunction((TextEditingValue oldValue, TextEditingValue newValue) {
                                if (RegExp(AllowedCharactersRegEx.alphabets).hasMatch(newValue.text)) {
                                  return newValue;
                                } else {
                                  return oldValue;
                                }
                              }),
                            ],
                            keyboardType: TextInputType.text,
                            labelText: 'Last Name',
                            prefixIcon: AppIcons.solidRoundedUser,
                            textCapitalization: TextCapitalization.words,
                            validator: (String? text) {
                              if (text == null || text.isEmpty) {
                                return 'Please enter your last name.';
                              } else {
                                return null;
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    CustomTextFormField(
                      autovalidateMode: AutovalidateMode.onUnfocus,
                      controller: _emailAddressController,
                      errorMaxLines: 3,
                      inputFormatters: [
                        TextInputFormatter.withFunction((TextEditingValue oldValue, TextEditingValue newValue) {
                          if (RegExp(AllowedCharactersRegEx.emailAddress).hasMatch(newValue.text)) {
                            return newValue;
                          } else {
                            return oldValue;
                          }
                        }),
                      ],
                      keyboardType: TextInputType.emailAddress,
                      labelText: 'Email Address',
                      prefixIcon: AppIcons.solidRoundedMail01,
                      textCapitalization: TextCapitalization.none,
                      validator: (String? text) {
                        if (text == null || text.isEmpty) {
                          return 'Please enter your email address.';
                        } else {
                          if (!RegExp(BasicRegEx.emailAddress).hasMatch(text)) {
                            return 'Please enter a valid email address (e.g. name@example.com).';
                          } else {
                            return null;
                          }
                        }
                      },
                    ),
                    CustomTextFormField(
                      controller: _phoneNumberController,
                      enabled: false,
                      labelText: 'Phone Number',
                      prefixIcon: AppIcons.solidRoundedCall,
                      suffixIcon: AppIcons.solidRoundedSquareLock01,
                    ),
                    DatePickerField(
                      autovalidateMode: AutovalidateMode.disabled,
                      controller: _dateOfBirthController,
                      errorMaxLines: 3,
                      keyboardType: TextInputType.datetime,
                      labelText: 'Date of Birth',
                      textCapitalization: TextCapitalization.none,
                      validator: (String? text) {
                        if (text == null || text.isEmpty) {
                          return 'Please select your date of birth.';
                        } else {
                          if (!RegExp(BasicRegEx.date).hasMatch(text)) {
                            return 'Please enter a valid date (e.g. 01 January 1901).';
                          } else {
                            try {
                              final dateOfBirth = DateFormat('dd MMMM yyyy').parse(text);
                              final currentDate = DateTime.now();

                              int age = currentDate.year - dateOfBirth.year;
                              if (currentDate.month < dateOfBirth.month || (currentDate.month == dateOfBirth.month && currentDate.day < dateOfBirth.day)) {
                                age--;
                              }

                              if (age < 18) {
                                return 'You must be at least 18 years old to continue.';
                              } else {
                                return null;
                              }
                            } catch (error) {
                              return 'Please enter a valid date (e.g. 01 January 1901).';
                            }
                          }
                        }
                      },
                    ),
                    CustomDropdownMenu<int>(
                      autovalidateMode: AutovalidateMode.onUnfocus,
                      controller: _genderController,
                      dropdownMenuEntries: _genders.map<DropdownMenuEntry<int>>((DropdownMenuOption item) {
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
                      labelText: 'Gender',
                      leadingIcon: AppIcons.solidRoundedUserAccount,
                      validator: (int? value) {
                        if (value == null || value.isNaN || value.isNegative) {
                          return 'Please select your gender.';
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
                onPressed: _onUpdateProfileButtonPressed,
                child: const Text('Update Profile'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
