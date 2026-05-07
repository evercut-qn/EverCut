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
import '../../../../../shared/widgets/overlays/bottomsheet.dart';
import '../../../../../shared/widgets/overlays/snackbars.dart';
import '../../../domain/use_cases/authentication_otp_send_params.dart';
import '../../bloc/authentication_bloc.dart';
import '../../widgets/privacy_policy_dialog.dart';
import '../../widgets/terms_of_service_dialog.dart';

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
      di.sl<AuthenticationBloc>().add(
        AuthenticationOtpSend(
          AuthenticationOtpSendParams(
            _phoneNumberController.e164PhoneNumber,
          ),
        ),
      );
    }
  }

  void _onTermsOfServiceTextTap() => showCustomBottomsheet(
    builder: (BuildContext context) => TermsOfServiceDialogWidget(),
    context: context,
  );

  void _onPrivacyPolicyTextTap() => showCustomBottomsheet(
    builder: (BuildContext context) => PrivacyPolicyDialogWidget(),
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
                                        baseColor: context.appColors.backgroundShade75,
                                        highlightColor: context.appColors.backgroundShade150,
                                        child: ShimmerContainer(
                                          color: context.appColors.backgroundShade75,
                                          height: context.scale(71.1),
                                          width: context.scale(175),
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
                          BlocConsumer<AuthenticationBloc, AuthenticationState>(
                            buildWhen: (AuthenticationState previous, AuthenticationState current) {
                              return current is AuthenticationOtpSending || previous is AuthenticationOtpSending;
                            },
                            builder: (BuildContext context, AuthenticationState state) {
                              final bool isLoading = state is AuthenticationOtpSending;
                              return Opacity(
                                opacity: !isLoading ? 1.0 : 0.5,
                                child: FilledButton(
                                  onPressed: !isLoading ? _onContinueButtonPressed : null,
                                  child: const Text('Continue'),
                                ),
                              );
                            },
                            listenWhen: (AuthenticationState previous, AuthenticationState current) {
                              return current is AuthenticationOtpSent || current is AuthenticationFailure;
                            },
                            listener: (BuildContext context, AuthenticationState state) {
                              if (state is AuthenticationOtpSent) {
                                context.pushNested(
                                  RouteSegments.otpVerification,
                                  extra: {
                                    'phoneNumber': _phoneNumberController.e164PhoneNumber,
                                  },
                                );
                              } else if (state is AuthenticationFailure) {
                                SnackBars.of(context).showErrorSnackBar(
                                  title: 'Couldn’t continue',
                                  message: state.message,
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
                      text: '\nTerms of Service',
                      recognizer: TapGestureRecognizer()..onTap = _onTermsOfServiceTextTap,
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
