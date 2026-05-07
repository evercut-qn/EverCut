// lib/features/settings/presentation/views/business_profile/bank_account_details/bank_account_details_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../../../core/constants/regex/allowed_characters_regex.dart';
import '../../../../../../core/constants/regex/basic_regex.dart';
import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../shared/widgets/other/bank_picker_field/bank_picker_field.dart';
import '../../../../../../shared/widgets/overlays/snackbars.dart';

class BankAccountDetailsScreen extends StatefulWidget {
  const BankAccountDetailsScreen({super.key});

  @override
  State<BankAccountDetailsScreen> createState() => _BankAccountDetailsScreenState();
}

class _BankAccountDetailsScreenState extends State<BankAccountDetailsScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _accountHolderNameController = TextEditingController();
  final TextEditingController _bankNameController = TextEditingController();
  final TextEditingController _accountNumberController = TextEditingController();
  final TextEditingController _ifscCodeController = TextEditingController();

  void _onSaveBankDetailsButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      SnackBars.of(context).showWarningSnackBar(
        title: 'Missing Required Information',
        message: 'Please complete all required fields correctly before saving your changes.',
      );
    } else {}
  }

  @override
  void dispose() {
    _accountHolderNameController.dispose();
    _bankNameController.dispose();
    _accountNumberController.dispose();
    _ifscCodeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bank Account Details')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            spacing: context.scale(18),
            children: [
              const SectionHeader(
                title: 'Update Bank Details',
                description: 'Keep your bank account information up to date for seamless payment processing.',
              ),
              Form(
                autovalidateMode: AutovalidateMode.onUnfocus,
                key: _formKey,
                child: Column(
                  spacing: context.scale(16),
                  children: [
                    CustomTextFormField(
                      controller: _accountHolderNameController,
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
                      labelText: 'Account Holder Name',
                      prefixIcon: AppIcons.solidRoundedUser,
                      textCapitalization: TextCapitalization.words,
                      validator: (String? text) {
                        if (text == null || text.isEmpty) {
                          return 'Please enter the account holder name.';
                        } else {
                          return null;
                        }
                      },
                    ),
                    BankPickerField(
                      controller: _bankNameController,
                      labelText: 'Bank Name',
                      textCapitalization: TextCapitalization.words,
                      validator: (String? text) {
                        if (text == null || text.isEmpty) {
                          return 'Please select your bank name.';
                        } else {
                          return null;
                        }
                      },
                    ),
                    CustomTextFormField(
                      controller: _accountNumberController,
                      errorMaxLines: 3,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      keyboardType: TextInputType.number,
                      labelText: 'Account Number',
                      prefixIcon: AppIcons.solidRoundedUserAccount,
                      textCapitalization: TextCapitalization.none,
                      validator: (String? text) {
                        if (text == null || text.isEmpty) {
                          return 'Please enter your account number.';
                        } else {
                          if (!RegExp(BasicRegEx.accountNumber).hasMatch(text)) {
                            return 'Please enter a valid account number (e.g. 1234567890).';
                          } else {
                            return null;
                          }
                        }
                      },
                    ),
                    CustomTextFormField(
                      controller: _ifscCodeController,
                      errorMaxLines: 3,
                      inputFormatters: [
                        TextInputFormatter.withFunction((TextEditingValue oldValue, TextEditingValue newValue) {
                          if (RegExp(AllowedCharactersRegEx.alphanumeric).hasMatch(newValue.text)) {
                            return newValue;
                          } else {
                            return oldValue;
                          }
                        }),
                      ],
                      keyboardType: TextInputType.text,
                      labelText: 'IFSC Code',
                      prefixIcon: AppIcons.solidRoundedLocation01,
                      textCapitalization: TextCapitalization.none,
                      validator: (String? text) {
                        if (text == null || text.isEmpty) {
                          return 'Please enter your IFSC code.';
                        } else {
                          if (!RegExp(BasicRegEx.ifscCode).hasMatch(text)) {
                            return 'Please enter a valid IFSC code (e.g. SBIN0000001).';
                          } else {
                            return null;
                          }
                        }
                      },
                    ),
                  ],
                ),
              ),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: context.scale(12)),
                child: Text(
                  'This information will be stored securely as per EverCut Terms of Service and Privacy Policy.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: context.appColors.neutralShade650,
                    fontSize: context.scale(12),
                    height: 1.65,
                  ),
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
                onPressed: _onSaveBankDetailsButtonPressed,
                child: const Text('Save Bank Details'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
