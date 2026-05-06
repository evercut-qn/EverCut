// lib/features/merchant_onboarding/presentation/views/payout_details/payout_details_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/constants/navigation/route_paths.dart';
import '../../../../../core/di/injection.dart' as di;
import '../../../../../core/auth/auth_state_notifier.dart';
import '../../../../../core/errors/network_exception.dart';
import '../../../../../core/constants/regex/allowed_characters_regex.dart';
import '../../../../../core/constants/regex/basic_regex.dart';
import '../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/extensions/other/bool_extension.dart';
import '../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../shared/widgets/common/inputs/secure_code_field.dart';
import '../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../shared/widgets/other/bank_picker_field/bank_picker_field.dart';
import '../../../../../shared/widgets/overlays/snackbars.dart';
import '../../../../../shared/widgets/common/section/section_header.dart';
import '../../cubit/merchant_onboarding_cubit.dart';
import '../../../domain/repositories/merchant_onboarding_repository.dart';

class PayoutDetailsScreen extends StatefulWidget {
  const PayoutDetailsScreen({super.key});

  @override
  State<PayoutDetailsScreen> createState() => _PayoutDetailsScreenState();
}

class _PayoutDetailsScreenState extends State<PayoutDetailsScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _accountHolderNameController = TextEditingController();
  final TextEditingController _bankNameController = TextEditingController();
  final TextEditingController _upiAddressController = TextEditingController();
  final SecureCodeFieldController _securityPinFieldController = SecureCodeFieldController(4);
  final SecureCodeFieldController _confirmSecurityPinFieldController = SecureCodeFieldController(4);

  bool _pinVisible = false;
  bool _submitting = false;

  void _togglePinVisibility() {
    setState(() {
      _pinVisible = _pinVisible.toggle();
    });
  }

  void _onBackButtonPressed() => context.read<MerchantOnboardingCubit>().previousPage();
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
    final cubit = context.read<MerchantOnboardingCubit>();
    cubit.updateFields({
      'accountHolderName': _accountHolderNameController.text.trim(),
      'bankName': _bankNameController.text.trim(),
      'upiId': _upiAddressController.text.trim(),
      'pin': _securityPinFieldController.value,
      'confirmPin': _confirmSecurityPinFieldController.value,
    });

    try {
      await di.sl<MerchantOnboardingRepository>().completeOnboarding(
            fields: cubit.draft.fields,
            photos: cubit.draft.photos,
          );
      if (mounted) {
        context.go(RoutePaths.dashboard);
      }
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
    _upiAddressController.dispose();
    _securityPinFieldController.dispose();
    _confirmSecurityPinFieldController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                Padding(
                  padding: EdgeInsets.all(context.scale(24)),
                  child: Column(
                    spacing: context.scale(16),
                    children: [
                      CustomTextFormField(
                        autovalidateMode: AutovalidateMode.onUnfocus,
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
                        autovalidateMode: AutovalidateMode.onUnfocus,
                        controller: _upiAddressController,
                        errorMaxLines: 3,
                        inputFormatters: [
                          TextInputFormatter.withFunction((TextEditingValue oldValue, TextEditingValue newValue) {
                            if (RegExp(AllowedCharactersRegEx.upiAddress).hasMatch(newValue.text)) {
                              return newValue;
                            } else {
                              return oldValue;
                            }
                          }),
                        ],
                        keyboardType: TextInputType.text,
                        labelText: 'UPI Address',
                        prefixIcon: AppIcons.solidRoundedAt,
                        textCapitalization: TextCapitalization.none,
                        validator: (String? text) {
                          if (text == null || text.isEmpty) {
                            return 'Please enter your UPI ID.';
                          } else {
                            if (!RegExp(BasicRegEx.upiAddress).hasMatch(text)) {
                              return 'Please enter a valid UPI ID (e.g. name@bank).';
                            } else {
                              return null;
                            }
                          }
                        },
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1.0),
                Padding(
                  padding: EdgeInsets.all(context.scale(24)),
                  child: Column(
                    spacing: context.scale(16),
                    children: [
                      const SectionHeader(
                        title: 'Set Security PIN',
                        description: 'Enter a 4-digit PIN to securely access, view, and update your payout details.',
                      ),
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(context.scale(12)),
                          color: context.appColors.backgroundShade100,
                        ),
                        padding: EdgeInsets.all(context.scale(18)).copyWith(right: context.scale(48)),
                        child: Column(
                          spacing: context.scale(18),
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              spacing: context.scale(12),
                              children: [
                                Text(
                                  'Set New PIN',
                                  style: TextStyle(
                                    fontSize: context.scale(12),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                Row(
                                  spacing: context.scale(16),
                                  children: [
                                    Expanded(
                                      child: SecureCodeField(
                                        controller: _securityPinFieldController,
                                        spacing: 16,
                                        fontSize: 14,
                                        obscureText: true,
                                        validator: (String? text) {
                                          final requiredLength = _securityPinFieldController.length;

                                          if (text == null || text.isEmpty) {
                                            return 'Please enter a $requiredLength-digit security Pin.';
                                          } else {
                                            if (text.trim().length < requiredLength) {
                                              return 'Pin must be exactly $requiredLength digits.';
                                            } else {
                                              return null;
                                            }
                                          }
                                        },
                                      ),
                                    ),
                                    SizedBox.square(dimension: context.scale(48)),
                                  ],
                                ),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              spacing: context.scale(12),
                              children: [
                                Text(
                                  'Confirm Security PIN',
                                  style: TextStyle(
                                    fontSize: context.scale(12),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                Row(
                                  spacing: context.scale(16),
                                  children: [
                                    Expanded(
                                      child: SecureCodeField(
                                        controller: _confirmSecurityPinFieldController,
                                        spacing: 16,
                                        fontSize: 14,
                                        obscureText: !_pinVisible,
                                        validator: (String? text) {
                                          final requiredLength = _confirmSecurityPinFieldController.length;

                                          if (text == null || text.isEmpty) {
                                            return 'Please enter a $requiredLength-digit security Pin.';
                                          } else {
                                            if (text.trim().length < requiredLength) {
                                              return 'Pin must be exactly $requiredLength digits.';
                                            } else {
                                              if (_confirmSecurityPinFieldController.value != _securityPinFieldController.value) {
                                                return 'Security PINs do not match.';
                                              } else {
                                                return null;
                                              }
                                            }
                                          }
                                        },
                                      ),
                                    ),
                                    IconButton(
                                      onPressed: _togglePinVisibility,
                                      icon: Icon(
                                        _pinVisible ? AppIcons.solidRoundedView : AppIcons.solidRoundedViewOff,
                                        color: context.appColors.neutralShade850,
                                        size: context.scale(20),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
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
