// lib/features/onboarding/presentation/views/personal_information/personal_information_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../../../core/constants/regex/allowed_characters_regex.dart';
import '../../../../../core/constants/regex/basic_regex.dart';
import '../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../shared/enums/gender.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../shared/widgets/common/inputs/date_picker_field.dart';
import '../../../../../shared/widgets/common/inputs/dropdown_menu.dart';
import '../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../cubit/onboarding_cubit.dart';

class PersonalInformationScreen extends StatefulWidget {
  const PersonalInformationScreen({super.key});

  @override
  State<PersonalInformationScreen> createState() => _PersonalInformationScreenState();
}

class _PersonalInformationScreenState extends State<PersonalInformationScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _emailAddressController = TextEditingController();
  final TextEditingController _dateOfBirthController = TextEditingController();
  final TextEditingController _genderController = TextEditingController();
  final DateTime _currentDate = DateTime.now();

  void _onNextButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      return;
    } else {
      context.read<OnboardingCubit>().nextPage();
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailAddressController.dispose();
    _dateOfBirthController.dispose();
    _genderController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(context.scale(24)),
            child: Form(
              autovalidateMode: AutovalidateMode.onUnfocus,
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
                    labelText: 'Email Address (Optional)',
                    prefixIcon: AppIcons.solidRoundedMail01,
                    textCapitalization: TextCapitalization.none,
                    validator: (String? text) {
                      if (text == null || text.isEmpty) {
                        return null;
                      } else {
                        if (!RegExp(BasicRegEx.emailAddress).hasMatch(text)) {
                          return 'Please enter a valid email address (e.g. name@example.com).';
                        } else {
                          return null;
                        }
                      }
                    },
                  ),
                  DatePickerField(
                    controller: _dateOfBirthController,
                    errorMaxLines: 3,
                    keyboardType: TextInputType.datetime,
                    labelText: 'Date of Birth',
                    lastDate: DateTime(_currentDate.year - 18, _currentDate.month, _currentDate.day),
                    textCapitalization: TextCapitalization.none,
                    validator: (String? text) {
                      if (text == null || text.isEmpty) {
                        return 'Please select your date of birth.';
                      } else {
                        if (!RegExp(BasicRegEx.date).hasMatch(text)) {
                          return 'Please enter a valid date (e.g. 01 January 1901).';
                        } else {
                          try {
                            final DateTime dateOfBirth = DateFormat('dd MMMM yyyy').parse(text);
                            final DateTime cutOffDate = DateTime(_currentDate.year - 18, _currentDate.month, _currentDate.day);

                            if (dateOfBirth.isAfter(cutOffDate)) {
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
                    controller: _genderController,
                    dropdownMenuEntries: GenderEnum.values.map<DropdownMenuEntry<int>>((GenderEnum gender) {
                      return DropdownMenuEntry<int>(
                        label: gender.label,
                        leadingIcon: Padding(
                          padding: EdgeInsets.only(left: context.scale(6)),
                          child: Icon(
                            gender.icon,
                            size: context.scale(20),
                          ),
                        ),
                        value: gender.value,
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
          ),
        ),
        CustomBottomAppBar(
          child: Row(
            children: [
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
