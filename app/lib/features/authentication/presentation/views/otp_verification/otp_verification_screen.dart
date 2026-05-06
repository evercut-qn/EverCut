// lib/features/authentication/presentation/views/otp_verification/otp_verification_screen.dart

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/constants/navigation/route_paths.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../shared/widgets/common/inputs/secure_code_field.dart';
import '../../../../../shared/widgets/other/phone_text_field/presentation/controller/phone_text_field_controller.dart';
import '../../../domain/use_cases/authentication_otp_resend_params.dart';
import '../../../domain/use_cases/authentication_otp_verify_params.dart';
import '../../bloc/authentication_bloc.dart';
// import '../../../../../shared/widgets/overlays/snackbars.dart';

class OtpVerificationScreen extends StatefulWidget {
  final String phoneNumber;

  const OtpVerificationScreen(
    this.phoneNumber, {
    super.key,
  });

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final PhoneTextFieldController _phoneNumberController = PhoneTextFieldController();
  final SecureCodeFieldController _otpFieldController = SecureCodeFieldController(6);

  Future<void> _onResendTextTap() async {
    context.read<AuthenticationBloc>().add(
          AuthenticationOtpResend(AuthenticationOtpResendParams(widget.phoneNumber)),
        );
  }

  Future<void> _onVerifyOtpButtonPressed() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    context.read<AuthenticationBloc>().add(
          AuthenticationOtpVerify(
            AuthenticationOtpVerifyParams(
              widget.phoneNumber,
              '',
              _otpFieldController.value,
            ),
          ),
        );
  }

  @override
  void dispose() {
    _phoneNumberController.dispose();
    _otpFieldController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthenticationBloc, AuthenticationState>(
      listener: (BuildContext context, AuthenticationState state) {
        if (state is AuthenticationSuccess) {
          context.go(RoutePaths.dashboard);
        }
        if (state is AuthenticationOnboardingRequired) {
          context.go(RoutePaths.merchantOnboarding);
        }
        if (state is AuthenticationFailure) {
          debugPrint('${state.message}\n${state.stackTrace}');
        }
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Account Verification')),
        body: SafeArea(
          child: Padding(
            padding: EdgeInsets.all(context.scale(24)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: context.scale(36),
              children: [
                RichText(
                  text: TextSpan(
                    text: 'We\'ve sent a 6-digit verification code via SMS to ',
                    style: TextStyle(
                      color: context.appColors.neutralShade850,
                      fontFamily: 'DMSans',
                      fontSize: context.scale(14),
                      height: 1.45,
                    ),
                    children: <TextSpan>[
                      TextSpan(
                        text: _phoneNumberController.formattedPhoneNumber(widget.phoneNumber),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const TextSpan(text: '. Please enter the OTP below.'),
                    ],
                  ),
                ),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: context.scale(12)),
                  child: Form(
                    key: _formKey,
                    child: SecureCodeField(
                      controller: _otpFieldController,
                      spacing: 12,
                      fontSize: 14,
                      validator: (String? value) {
                        if (value == null || value.trim().isEmpty) {
                          return '';
                        } else if (_otpFieldController.value.length != _otpFieldController.length) {
                          return '';
                        } else {
                          return null;
                        }
                      },
                    ),
                  ),
                ),
                Center(
                  child: RichText(
                    text: TextSpan(
                      text: 'Didn\'t received code? ',
                      style: TextStyle(
                        color: context.appColors.neutralShade850,
                        fontFamily: 'DMSans',
                        fontSize: context.scale(14),
                        height: 1.45,
                      ),
                      children: <TextSpan>[
                        TextSpan(
                          text: 'Resend',
                          recognizer: TapGestureRecognizer()..onTap = _onResendTextTap,
                          style: TextStyle(
                            color: context.appColors.greenShade100,
                            fontSize: context.scale(14),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
        ),
        bottomNavigationBar: CustomBottomAppBar(
          child: Row(
            children: <Widget>[
              Expanded(
                child: BlocBuilder<AuthenticationBloc, AuthenticationState>(
                  builder: (BuildContext context, AuthenticationState state) {
                    final bool isLoading = state is AuthenticationOtpVerifying;
                    return FilledButton(
                      onPressed: isLoading ? null : _onVerifyOtpButtonPressed,
                      child: const Text('Verify OTP'),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
