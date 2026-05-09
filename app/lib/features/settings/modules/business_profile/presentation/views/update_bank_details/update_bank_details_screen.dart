// lib/features/settings/modules/business_profile/presentation/views/update_bank_details/update_bank_details_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../../../core/constants/regex/allowed_characters_regex.dart';
import '../../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../../../shared/widgets/common/inputs/bank_picker_field.dart';
import '../../../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../../shared/widgets/overlays/snackbars.dart';
import '../../../bloc/business_profile_bloc.dart';
import '../../../domain/use_cases/params/update_payout_details_params.dart';

class UpdateBankDetailsScreen extends StatefulWidget {
  const UpdateBankDetailsScreen({super.key});

  @override
  State<UpdateBankDetailsScreen> createState() => _UpdateBankDetailsScreenState();
}

class _UpdateBankDetailsScreenState extends State<UpdateBankDetailsScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _accountHolderNameController = TextEditingController();
  final TextEditingController _bankNameController = TextEditingController();
  final TextEditingController _accountNumberController = TextEditingController();
  final TextEditingController _ifscController = TextEditingController();
  final TextEditingController _upiIdController = TextEditingController();

  void _onSaveBankDetailsButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final params = UpdatePayoutDetailsParams(
      accountHolderName: _accountHolderNameController.text.trim(),
      bankName: _bankNameController.text.trim(),
      bankAccount: _accountNumberController.text.trim(),
      ifsc: _ifscController.text.trim(),
      upiId: _upiIdController.text.trim(),
    );

    context.read<BusinessProfileBloc>().add(BusinessProfilePayoutDetailsUpdateRequested(params));
  }

  @override
  void dispose() {
    _accountHolderNameController.dispose();
    _bankNameController.dispose();
    _accountNumberController.dispose();
    _ifscController.dispose();
    _upiIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<BusinessProfileBloc, BusinessProfileState>(
      listener: (context, state) {
        if (state is BusinessProfileLoaded) {
          SnackBars.of(context).showSuccessSnackBar(
            title: 'Success',
            message: 'Bank details updated successfully',
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
          appBar: AppBar(title: const Text('Update Bank Details')),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: EdgeInsets.all(context.scale(24)),
              child: Column(
                spacing: context.scale(18),
                children: [
                  const SectionHeader(
                    title: 'Update Bank Details',
                    description: 'Update your bank account details for receiving payments. Make sure all information is accurate.',
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
                              return 'Please enter your account holder name.';
                            } else {
                              return null;
                            }
                          },
                        ),
                        BankPickerField(
                          controller: _bankNameController,
                          labelText: 'Bank Name',
                          leadingIcon: AppIcons.solidRoundedBuildingBank01,
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
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                          ],
                          keyboardType: TextInputType.number,
                          labelText: 'Account Number',
                          prefixIcon: AppIcons.solidRoundedCreditCard01,
                          maxLength: 16,
                          validator: (String? text) {
                            if (text == null || text.isEmpty) {
                              return 'Please enter your account number.';
                            } else if (text.length < 9) {
                              return 'Please enter a valid account number.';
                            } else {
                              return null;
                            }
                          },
                        ),
                        CustomTextFormField(
                          controller: _ifscController,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                          ],
                          keyboardType: TextInputType.text,
                          labelText: 'IFSC Code',
                          prefixIcon: AppIcons.solidRoundedScanBarcode,
                          textCapitalization: TextCapitalization.characters,
                          maxLength: 11,
                          validator: (String? text) {
                            if (text == null || text.isEmpty) {
                              return 'Please enter your IFSC code.';
                            } else if (text.length != 11) {
                              return 'Please enter a valid IFSC code.';
                            } else {
                              return null;
                            }
                          },
                        ),
                        CustomTextFormField(
                          controller: _upiIdController,
                          keyboardType: TextInputType.text,
                          labelText: 'UPI ID (Optional)',
                          prefixIcon: AppIcons.solidRoundedWallet01,
                          textCapitalization: TextCapitalization.lowercase,
                          validator: (String? text) {
                            if (text != null && text.isNotEmpty && !text.contains('@')) {
                              return 'Please enter a valid UPI ID.';
                            }
                            return null;
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
                    onPressed: isLoading ? null : _onSaveBankDetailsButtonPressed,
                    child: isLoading ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save Bank Details'),
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
