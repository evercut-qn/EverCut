// lib/features/authentication/presentation/views/phone_entry/phone_entry_screen.dart

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_svg/svg.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../../core/constants/navigation/route_segments.dart';
import '../../../../../core/di/injection.dart' as di;
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../core/theme/presentation/widgets/theme_mode_builder.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/extensions/context/go_router_extension.dart';
import '../../../../../shared/widgets/common/dividers/centered_text_divider.dart';
import '../../../../../shared/widgets/other/loaders/shimmer_container.dart';
import '../../../../../shared/widgets/other/phone_text_field/phone_text_field.dart';
import '../../../../../shared/widgets/other/phone_text_field/presentation/controller/phone_text_field_controller.dart';
import '../../../../../shared/widgets/overlays/bottomsheet.dart';
import '../../../domain/use_cases/authentication_otp_send_params.dart';
import '../../bloc/authentication_bloc.dart';

class PhoneEntryScreen extends StatefulWidget {
  const PhoneEntryScreen({super.key});

  @override
  State<PhoneEntryScreen> createState() => _PhoneEntryScreenState();
}

class _PhoneEntryScreenState extends State<PhoneEntryScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final PhoneTextFieldController _phoneNumberController = PhoneTextFieldController(isoCode: 'IN');

  void _onContinueButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      return;
    } else {
      context.read<AuthenticationBloc>().add(
        AuthenticationOtpSend(
          AuthenticationOtpSendParams(
            _phoneNumberController.e164PhoneNumber,
          ),
        ),
      );
    }
  }

  void _onTermsOfUseTextTap() => showCustomBottomsheet(
    builder: (BuildContext context) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
      );
    },
    context: context,
  );

  void _onPrivacyPolicyTextTap() => showCustomBottomsheet(
    builder: (BuildContext context) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
      );
    },
    context: context,
  );

  @override
  void dispose() {
    _phoneNumberController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            spacing: context.scale(24),
            children: [
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    spacing: context.scale(18),
                    children: [
                      Column(
                        spacing: context.scale(54),
                        children: [
                          Center(
                            child: Padding(
                              padding: EdgeInsets.only(top: context.scale(54)),
                              child: ThemeModeBuilder(
                                builder: (BuildContext context, bool isDarkMode) {
                                  return SvgPicture.asset(
                                    'assets/images/svg/${isDarkMode ? 'dark' : 'light'}/logo.svg',
                                    width: context.scale(175),
                                    placeholderBuilder: (BuildContext context) {
                                      return Shimmer.fromColors(
                                        baseColor: context.appColors.neutralShade200.withAlpha(50),
                                        highlightColor: context.appColors.neutralShade300.withAlpha(150),
                                        child: ShimmerContainer(
                                          borderRadius: 4,
                                          color: context.appColors.neutralShade200.withAlpha(150),
                                          height: 71.1,
                                          width: 175,
                                        ),
                                      );
                                    },
                                  );
                                },
                              ),
                            ),
                          ),
                          RichText(
                            text: TextSpan(
                              text: 'Boost Bookings. ',
                              style: TextStyle(
                                color: context.appColors.neutralShade850,
                                fontFamily: 'DMSans',
                                fontSize: context.scale(24),
                                fontWeight: FontWeight.w500,
                              ),
                              children: <TextSpan>[
                                TextSpan(
                                  text: 'Elevate',
                                  style: TextStyle(
                                    color: context.appColors.greenShade100,
                                  ),
                                ),
                                const TextSpan(text: ' Earnings'),
                              ],
                            ),
                            textAlign: TextAlign.center,
                          ),
                          CenteredTextDivider(
                            'Login or Register',
                            style: TextStyle(
                              fontSize: context.scale(14),
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: context.scale(16),
                        children: [
                          Form(
                            key: _formKey,
                            child: PhoneTextField(
                              autovalidateMode: AutovalidateMode.onUnfocus,
                              controller: _phoneNumberController,
                              showCountrySelection: false,
                            ),
                          ),
                          BlocListener<AuthenticationBloc, AuthenticationState>(
                            listener: (BuildContext context, AuthenticationState state) {
                              if (state is AuthenticationOtpSent) {
                                context.pushNested(
                                  RouteSegments.otpVerification,
                                  extra: {
                                    'phoneNumber': _phoneNumberController.e164PhoneNumber,
                                  },
                                );
                              }

                              if (state is AuthenticationFailure) {
                                debugPrint('${state.message}\n${state.stackTrace}');
                              }
                            },
                            child: BlocBuilder<AuthenticationBloc, AuthenticationState>(
                              builder: (BuildContext context, AuthenticationState state) {
                                return Opacity(
                                  opacity: state is! AuthenticationOtpSending ? 1.0 : 0.5,
                                  child: FilledButton(
                                    onPressed: state is! AuthenticationOtpSending ? _onContinueButtonPressed : null,
                                    child: const Text('Continue'),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              RichText(
                text: TextSpan(
                  text: 'By continuing, you agree to our',
                  style: TextStyle(
                    color: context.appColors.neutralShade850,
                    fontFamily: 'DMSans',
                    fontSize: context.scale(13.25),
                  ),
                  children: <TextSpan>[
                    TextSpan(
                      text: '\nTerms of Use',
                      recognizer: TapGestureRecognizer()..onTap = _onTermsOfUseTextTap,
                      style: TextStyle(
                        color: context.appColors.blueShade100,
                        decoration: TextDecoration.underline,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const TextSpan(text: ' & '),
                    TextSpan(
                      text: 'Privacy Policy',
                      recognizer: TapGestureRecognizer()..onTap = _onPrivacyPolicyTextTap,
                      style: TextStyle(
                        color: context.appColors.blueShade100,
                        decoration: TextDecoration.underline,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
