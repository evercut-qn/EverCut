// lib/features/settings/presentation/views/business_profile/employee_management/employee_management_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../../../core/constants/regex/allowed_characters_regex.dart';
import '../../../../../../core/constants/regex/basic_regex.dart';
import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/models/dropdown_menu_option.dart';
import '../../../../../../shared/widgets/common/inputs/date_picker_field.dart';
import '../../../../../../shared/widgets/common/inputs/dropdown_menu.dart';
import '../../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../shared/widgets/other/phone_text_field/phone_text_field.dart';
import '../../../../../../shared/widgets/other/phone_text_field/presentation/controller/phone_text_field_controller.dart';
import '../../../../../../shared/widgets/overlays/bottomsheet.dart';
import '../../../../../../shared/widgets/overlays/snackbars.dart';

class EmployeeManagementScreen extends StatefulWidget {
  const EmployeeManagementScreen({super.key});

  @override
  State<EmployeeManagementScreen> createState() => _EmployeeManagementScreenState();
}

class _EmployeeManagementScreenState extends State<EmployeeManagementScreen> {
  Future<void> _onPhoneNumberTap(String phoneNumber) async {
    final uri = Uri(scheme: 'tel', path: phoneNumber);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Employee Management')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            spacing: context.scale(18),
            children: [
              const SectionHeader(
                title: 'Staff Members',
                description: 'Manage your barbershop staff by adding employees, updating details, or removing them.',
              ),
              Material(
                clipBehavior: Clip.hardEdge,
                color: context.appColors.backgroundShade100,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(context.scale(12)),
                  side: BorderSide(color: context.appColors.backgroundShade200),
                ),
                child: IntrinsicHeight(
                  child: Row(
                    children: [
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.all(context.scale(12)),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            spacing: context.scale(12),
                            children: [
                              AspectRatio(
                                aspectRatio: 1.0,
                                child: CircleAvatar(
                                  backgroundColor: context.appColors.backgroundShade200,
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                spacing: context.scale(2.75),
                                children: [
                                  Text(
                                    'John Doe',
                                    style: TextStyle(
                                      color: context.appColors.neutralShade850,
                                      fontSize: context.scale(14),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () => _onPhoneNumberTap('+919876543210'),
                                    child: Row(
                                      spacing: context.scale(4.75),
                                      children: [
                                        Text(
                                          '+91 98765 43210',
                                          style: TextStyle(
                                            color: context.appColors.blueShade100,
                                            fontSize: context.scale(12),
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        Icon(
                                          AppIcons.solidRoundedArrowUpRight01,
                                          color: context.appColors.blueShade100,
                                          size: context.scale(12),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      VerticalDivider(
                        color: context.appColors.backgroundShade200,
                        width: 1.0,
                      ),
                      IntrinsicWidth(
                        child: Column(
                          children: [
                            Expanded(
                              child: Padding(
                                padding: EdgeInsets.all(context.scale(12)),
                                child: Center(
                                  child: Icon(
                                    AppIcons.solidRoundedPen01,
                                    color: context.appColors.neutralShade550,
                                    size: context.scale(16),
                                  ),
                                ),
                              ),
                            ),
                            Divider(
                              color: context.appColors.backgroundShade200,
                              height: 1.0,
                            ),
                            Expanded(
                              child: Padding(
                                padding: EdgeInsets.all(context.scale(12)),
                                child: Center(
                                  child: Icon(
                                    AppIcons.solidRoundedDelete02,
                                    color: context.appColors.neutralShade550,
                                    size: context.scale(16),
                                  ),
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
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          showCustomBottomsheet(
            context: context,
            builder: (BuildContext context) => EmployeeAddBottomSheet(),
            padding: EdgeInsets.zero,
          );
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}

class EmployeeAddBottomSheet extends StatefulWidget {
  const EmployeeAddBottomSheet({super.key});

  @override
  State<EmployeeAddBottomSheet> createState() => _EmployeeAddBottomSheetState();
}

class _EmployeeAddBottomSheetState extends State<EmployeeAddBottomSheet> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final PhoneTextFieldController _phoneNumberController = PhoneTextFieldController();
  final TextEditingController _dateOfBirthController = TextEditingController();
  final TextEditingController _genderController = TextEditingController();

  final List<DropdownMenuOption> _genders = const <DropdownMenuOption>[
    DropdownMenuOption(icon: Icons.male, label: 'Male', value: 0),
    DropdownMenuOption(icon: Icons.female, label: 'Female', value: 1),
    DropdownMenuOption(icon: Icons.transgender, label: 'Transgender', value: 2),
  ];

  void _onAddEmployeeButtonPressed() {
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
    _phoneNumberController.dispose();
    _dateOfBirthController.dispose();
    _genderController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: EdgeInsets.all(context.scale(20)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: context.scale(20),
            children: [
              const SectionHeader(
                title: 'Add New Employee',
                description: 'Add the barber\'s information below to register them as staff member in your shop.',
              ),
              Padding(
                padding: EdgeInsets.all(context.scale(16)),
                child: Center(
                  child: Column(
                    spacing: context.scale(16),
                    children: [
                      Stack(
                        children: [
                          CircleAvatar(
                            backgroundColor: context.appColors.backgroundShade100,
                            radius: context.scale(40),
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Material(
                              color: context.appColors.scaffoldBackgroundColor,
                              clipBehavior: Clip.hardEdge,
                              shape: const CircleBorder(),
                              child: Padding(
                                padding: EdgeInsets.all(context.scale(8)),
                                child: Icon(
                                  AppIcons.solidRoundedImageAdd01,
                                  color: context.appColors.neutralShade650,
                                  size: context.scale(16),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      Text(
                        'Update Picture',
                        style: TextStyle(
                          color: context.appColors.neutralShade650,
                          fontSize: context.scale(13.25),
                          fontWeight: FontWeight.w600,
                          height: 1.0,
                        ),
                      ),
                    ],
                  ),
                ),
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
                    PhoneTextField(
                      controller: _phoneNumberController,
                      showCountrySelection: false,
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
        Divider(
          color: context.appColors.secondaryDividerColor,
          height: 1.0,
        ),
        Padding(
          padding: EdgeInsets.all(context.scale(20)),
          child: Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: _onAddEmployeeButtonPressed,
                  child: const Text('Add Employee'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
