// lib/features/settings/presentation/views/manage_account/change_pin/change_pin_screen.dart

import 'package:flutter/material.dart';

import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/extensions/other/bool_extension.dart';
import '../../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../../shared/widgets/common/inputs/secure_code_field.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../shared/widgets/overlays/snackbars.dart';

class ChangePinScreen extends StatefulWidget {
  const ChangePinScreen({super.key});

  @override
  State<ChangePinScreen> createState() => _ChangePinScreenState();
}

class _ChangePinScreenState extends State<ChangePinScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final SecureCodeFieldController _currentSecurityPinFieldController = SecureCodeFieldController(4);
  final SecureCodeFieldController _newSecurityPinFieldController = SecureCodeFieldController(4);
  final SecureCodeFieldController _confirmSecurityPinFieldController = SecureCodeFieldController(4);

  bool _currentPinVisible = false;
  bool _confirmPinVisible = false;

  void _toggleCurrentPinVisibility() {
    setState(() {
      _currentPinVisible = _currentPinVisible.toggle();
    });
  }

  void _toggleConfirmPinVisibility() {
    setState(() {
      _confirmPinVisible = _confirmPinVisible.toggle();
    });
  }

  void _onUpdatePinButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      SnackBars.of(context).showWarningSnackBar(
        title: 'Incomplete Information',
        message: 'Please fill in all required fields correctly before saving your changes.',
      );
    } else {}
  }

  @override
  void dispose() {
    _currentSecurityPinFieldController.dispose();
    _newSecurityPinFieldController.dispose();
    _confirmSecurityPinFieldController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change PIN')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            spacing: context.scale(18),
            children: [
              const SectionHeader(
                title: 'Change Security PIN',
                description: 'Update your security PIN to keep your account safe. Make sure to remember your new PIN.',
              ),
              Form(
                key: _formKey,
                child: Column(
                  spacing: context.scale(16),
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(context.scale(12)),
                        color: context.appColors.backgroundShade100,
                      ),
                      padding: EdgeInsets.all(context.scale(18)).copyWith(right: context.scale(48)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: context.scale(12),
                        children: [
                          Text(
                            'Current Security PIN',
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
                                  controller: _currentSecurityPinFieldController,
                                  spacing: 16,
                                  fontSize: 14,
                                  obscureText: !_currentPinVisible,
                                  validator: (String? text) {
                                    final requiredLength = _currentSecurityPinFieldController.length;

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
                              IconButton(
                                onPressed: _toggleCurrentPinVisibility,
                                icon: Icon(
                                  _currentPinVisible ? AppIcons.solidRoundedView : AppIcons.solidRoundedViewOff,
                                  color: context.appColors.neutralShade850,
                                  size: context.scale(20),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
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
                                      controller: _newSecurityPinFieldController,
                                      spacing: 16,
                                      fontSize: 14,
                                      obscureText: true,
                                      validator: (String? text) {
                                        final requiredLength = _newSecurityPinFieldController.length;

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
                                      obscureText: !_confirmPinVisible,
                                      validator: (String? text) {
                                        final requiredLength = _confirmSecurityPinFieldController.length;

                                        if (text == null || text.isEmpty) {
                                          return 'Please enter a $requiredLength-digit security Pin.';
                                        } else {
                                          if (text.trim().length < requiredLength) {
                                            return 'Pin must be exactly $requiredLength digits.';
                                          } else {
                                            if (_confirmSecurityPinFieldController.value != _newSecurityPinFieldController.value) {
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
                                    onPressed: _toggleConfirmPinVisibility,
                                    icon: Icon(
                                      _confirmPinVisible ? AppIcons.solidRoundedView : AppIcons.solidRoundedViewOff,
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
      bottomNavigationBar: CustomBottomAppBar(
        child: Row(
          children: [
            Expanded(
              child: FilledButton(
                onPressed: _onUpdatePinButtonPressed,
                child: const Text('Update PIN'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
