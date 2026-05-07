// lib/features/onboarding/presentation/views/payout_details/payout_details_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../core/auth/auth_state_notifier.dart';
import '../../../../../core/constants/regex/allowed_characters_regex.dart';
import '../../../../../core/constants/regex/basic_regex.dart';
import '../../../../../core/di/injection.dart' as di;
import '../../../../../core/errors/network_exception.dart';
import '../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../shared/widgets/other/bank_picker_field/bank_picker_field.dart';
import '../../../../../shared/widgets/overlays/snackbars.dart';
import '../../../domain/repositories/onboarding_repository.dart';
import '../../cubit/onboarding_cubit.dart';

class PayoutDetailsScreen extends StatefulWidget {
  const PayoutDetailsScreen({super.key});

  @override
  State<PayoutDetailsScreen> createState() => _PayoutDetailsScreenState();
}

class _PayoutDetailsScreenState extends State<PayoutDetailsScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _accountHolderNameController = TextEditingController();
  final TextEditingController _bankNameController = TextEditingController();
  final TextEditingController _accountNumberController = TextEditingController();
  final TextEditingController _ifscCodeController = TextEditingController();

  bool _submitting = false;

  void _onBackButtonPressed() => context.read<OnboardingCubit>().previousPage();
  void _onCompleteButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      SnackBars.of(context).showWarningSnackBar(
        title: 'Incomplete Information',
        message: 'Please fill in all required fields before continuing.',
      );
    } else {
      _completeOnboarding();
    }
  }

  Future<void> _completeOnboarding() async {
    setState(() => _submitting = true);
    final cubit = context.read<OnboardingCubit>();
    cubit.updateFields({
      'accountHolderName': _accountHolderNameController.text.trim(),
      'bankName': _bankNameController.text.trim(),
      'accountNumber': _accountNumberController.text.trim(),
      'ifscCode': _ifscCodeController.text.trim().toUpperCase(),
    });

    try {
      await di.sl<OnboardingRepository>().completeOnboarding(
            fields: cubit.draft.fields,
            photos: cubit.draft.photos,
          );
      // AuthStateNotifier.markSessionChanged() triggers router redirect to dashboard
    } on NetworkException catch (error) {
      if (mounted) {
        SnackBars.of(context).showErrorSnackBar(
          title: 'Onboarding Failed',
          message: error.toString(),
        );
        if (error.statusCode == 401) {
          di.sl<AuthStateNotifier>().clear();
        }
      }
    } catch (error) {
      if (mounted) {
        SnackBars.of(context).showErrorSnackBar(
          title: 'Onboarding Failed',
          message: error.toString(),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: context.scale(18),
            children: [
              Form(
                autovalidateMode: AutovalidateMode.onUnfocus,
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
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
                      autovalidateMode: AutovalidateMode.disabled,
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
                onPressed: _submitting ? null : _onCompleteButtonPressed,
                child: const Text('Complete'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
