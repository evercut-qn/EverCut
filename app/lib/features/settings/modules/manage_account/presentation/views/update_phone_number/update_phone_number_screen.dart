// lib/features/settings/modules/manage_account/presentation/views/update_phone_number/update_phone_number_screen.dart

import 'package:flutter/material.dart';

import '../../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../../shared/widgets/other/phone_text_field/phone_text_field.dart';

class UpdatePhoneNumberScreen extends StatefulWidget {
  const UpdatePhoneNumberScreen({super.key});

  @override
  State<UpdatePhoneNumberScreen> createState() => _UpdatePhoneNumberScreenState();
}

class _UpdatePhoneNumberScreenState extends State<UpdatePhoneNumberScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final PhoneTextFieldController _phoneNumberController = PhoneTextFieldController(isoCode: 'IN');

  void _onContinueButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      return;
    } else {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Update Phone Number')),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(context.scale(24)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: context.scale(18),
          children: [
            const SectionHeader(
              title: 'Enter Your New Number',
              description: 'Provide your new phone number below. We’ll use it for account verification and updates.',
            ),
            Form(
              key: _formKey,
              child: PhoneTextField(
                autovalidateMode: AutovalidateMode.onUnfocus,
                controller: _phoneNumberController,
                showCountrySelection: false,
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: CustomBottomAppBar(
        child: Row(
          children: [
            Expanded(
              child: FilledButton(
                onPressed: _onContinueButtonPressed,
                child: const Text('Continue'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
