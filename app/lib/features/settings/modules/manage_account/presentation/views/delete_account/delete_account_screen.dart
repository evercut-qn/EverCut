// lib/features/settings/modules/manage_account/presentation/views/delete_account/delete_account_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';

import '../../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../../shared/extensions/other/bool_extension.dart';
import '../../../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../../../shared/widgets/common/inputs/secure_code_field.dart';
import '../../../../../../../shared/widgets/common/section/section_header.dart';

class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final SecureCodeFieldController _currentSecurityPinFieldController = SecureCodeFieldController(4);

  bool _currentPinVisible = false;

  void _toggleCurrentPinVisibility() {
    setState(() {
      _currentPinVisible = _currentPinVisible.toggle();
    });
  }

  void _onDeletePermanentlyButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      return;
    } else {}
  }

  @override
  void dispose() {
    _currentSecurityPinFieldController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Delete Account')),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  spacing: context.scale(18),
                  children: [
                    const SectionHeader(
                      title: 'Account Deletion',
                      description: 'You are about to permanently delete your account. Please enter your current security PIN to proceed.',
                    ),
                    Form(
                      key: _formKey,
                      child: Container(
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
                    ),
                  ],
                ),
              ),
              const Divider(height: 1.0),
              Markdown(
                data:
                    '**Note:** By deleting your account, you agree to the following:\n\n'
                    '- This action cannot be undone.\n'
                    '- Your business profile will be erased.\n'
                    '- All client information will be deleted.\n'
                    '- Transaction details will be permanently removed.\n'
                    '- You will lose access to all associated services.\n\n'
                    'Once deleted, all your data will be lost permanently. Please proceed carefully.',
                padding: EdgeInsets.all(context.scale(24)),
                physics: const NeverScrollableScrollPhysics(),
                shrinkWrap: true,
                styleSheet: MarkdownStyleSheet(
                  p: TextStyle(
                    color: context.appColors.neutralShade750,
                    fontSize: context.scale(12),
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
                onPressed: _onDeletePermanentlyButtonPressed,
                style: ButtonStyle(
                  backgroundColor: WidgetStatePropertyAll(context.appColors.redShade100),
                  overlayColor: WidgetStatePropertyAll(context.appColors.redShade400.withAlpha(127)),
                  side: WidgetStatePropertyAll(BorderSide(color: context.appColors.redShade100)),
                ),
                child: const Text('Permanently Delete'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
