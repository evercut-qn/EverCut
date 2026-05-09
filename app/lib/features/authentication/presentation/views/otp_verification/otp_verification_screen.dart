// lib/features/authentication/presentation/views/otp_verification/otp_verification_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/constants/navigation/route_paths.dart';
import '../../../../../core/di/injection.dart' as di;
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/utils/formatters/duration.dart';
import '../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../shared/widgets/common/inputs/secure_code_field.dart';
import '../../../../../shared/widgets/other/phone_text_field/phone_text_field.dart';
import '../../../../../shared/widgets/overlays/snackbars.dart';
import '../../../domain/use_cases/otp/params/authentication_otp_verify_params.dart';
import '../../bloc/authentication_otp/authentication_otp_bloc.dart';
import '../../cubit/authentication_otp_resend/authentication_otp_resend_cubit.dart';

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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthenticationOtpResendCubit>().init(resendAttempts: 0, lastAttemptTime: DateTime.now());
      context.read<AuthenticationOtpResendCubit>().startCooldown();
    });
  }

  Future<void> _onResendTextTap() async {
    if (mounted) {
      context.read<AuthenticationOtpResendCubit>().startCooldown();
    }
  }

  Future<void> _onVerifyOtpButtonPressed() async {
    if (!_formKey.currentState!.validate()) {
      return;
    } else {
      di.sl<AuthenticationOtpBloc>().add(
        AuthenticationOtpVerifyRequested(
          params: AuthenticationOtpVerifyParams(
            phoneNumber: widget.phoneNumber.replaceAll('+91', ''),
            smsCode: _otpFieldController.value.trim(),
          ),
        ),
      );
    }
  }

  @override
  void dispose() {
    _phoneNumberController.dispose();
    _otpFieldController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
                        fontWeight: FontWeight.w700,
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
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                spacing: context.scale(8),
                children: [
                  Text(
                    'Didn\'t received code?',
                    style: TextStyle(
                      color: context.appColors.neutralShade850,
                      fontSize: context.scale(14),
                      height: 1.45,
                    ),
                  ),
                  BlocBuilder<AuthenticationOtpResendCubit, AuthenticationOtpResendState>(
                    builder: (BuildContext context, AuthenticationOtpResendState state) {
                      if (state.locked) {
                        return Text(
                          'Locked',
                          style: TextStyle(
                            color: context.appColors.redShade100,
                            fontSize: context.scale(14),
                            fontWeight: FontWeight.w700,
                          ),
                        );
                      } else if (state.canResend) {
                        return GestureDetector(
                          onTap: _onResendTextTap,
                          child: Text(
                            'Resend',
                            style: TextStyle(
                              color: context.appColors.greenShade100,
                              fontSize: context.scale(14),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        );
                      } else {
                        return Text(
                          durationFormatter(state.remainingSeconds),
                          style: TextStyle(
                            color: context.appColors.neutralShade850,
                            fontFamily: 'RobotoMono',
                            fontSize: context.scale(14),
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.0,
                            wordSpacing: 0.0,
                          ),
                        );
                      }
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: CustomBottomAppBar(
        child: Row(
          children: <Expanded>[
            Expanded(
              child: BlocConsumer<AuthenticationOtpBloc, AuthenticationOtpState>(
                buildWhen: (AuthenticationOtpState previous, AuthenticationOtpState current) {
                  return current is AuthenticationOtpVerifying || previous is AuthenticationOtpVerifying;
                },
                builder: (BuildContext context, AuthenticationOtpState state) {
                  final bool isLoading = state is AuthenticationOtpVerifying;
                  return Opacity(
                    opacity: !isLoading ? 1.0 : 0.5,
                    child: FilledButton(
                      onPressed: !isLoading ? _onVerifyOtpButtonPressed : null,
                      child: const Text('Verify OTP'),
                    ),
                  );
                },
                listenWhen: (AuthenticationOtpState previous, AuthenticationOtpState current) {
                  return current is AuthenticationOtpVerified || current is AuthenticationOtpFailure;
                },
                listener: (BuildContext context, AuthenticationOtpState state) {
                  if (state is AuthenticationOtpVerified) {
                    context.go(RoutePaths.onboarding);
                  } else if (state is AuthenticationOtpFailure) {
                    SnackBars.of(context).showErrorSnackBar(
                      title: 'Verification failed',
                      message: state.message,
                    );
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
