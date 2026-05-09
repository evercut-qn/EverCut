// lib/features/settings/modules/business_profile/presentation/views/business_profile_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../../core/constants/navigation/route_segments.dart';
import '../../../../../../core/di/injection.dart';
import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/extensions/context/go_router_extension.dart';
import '../../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../shared/widgets/overlays/snackbars.dart';
import '../../../../presentation/bloc/business_profile_bloc.dart';
import '../../../../presentation/widgets/settings_section.dart';
import '../widgets/shop_image.dart';

class BusinessProfileScreen extends StatefulWidget {
  const BusinessProfileScreen({super.key});

  @override
  State<BusinessProfileScreen> createState() => _BusinessProfileScreenState();
}

class _BusinessProfileScreenState extends State<BusinessProfileScreen> {
  @override
  void initState() {
    super.initState();
    context.read<BusinessProfileBloc>().add(BusinessProfileFetchRequested());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Business Profile')),
      body: SafeArea(
        child: BlocConsumer<BusinessProfileBloc, BusinessProfileState>(
          listener: (context, state) {
            if (state is BusinessProfileFailure) {
              SnackBars.of(context).showErrorSnackBar(
                title: 'Error',
                message: state.message,
              );
            }
          },
          builder: (context, state) {
            if (state is BusinessProfileLoading) {
              return const Center(child: CircularProgressIndicator());
            }

            if (state is BusinessProfileLoaded) {
              final profile = state.profile;
              return SingleChildScrollView(
                child: Column(
                  children: [
                    Padding(
                      padding: EdgeInsets.all(context.scale(24)),
                      child: Column(
                        spacing: context.scale(24),
                        children: [
                          ShopImageWidget(
                            coverUrl: profile.coverUrl,
                            bio: profile.bio ?? '',
                          ),
                          Column(
                            spacing: context.scale(16),
                            children: [
                              CustomTextFormField(
                                enabled: false,
                                labelText: 'Business Category',
                                prefixIcon: AppIcons.solidRoundedTag01,
                                initialValue: profile.category ?? '',
                              ),
                              CustomTextFormField(
                                enabled: false,
                                labelText: 'Target Customers',
                                prefixIcon: AppIcons.solidRoundedUserGroup,
                                initialValue: profile.targetCustomers ?? '',
                              ),
                              CustomTextFormField(
                                enabled: false,
                                labelText: 'Shop Location',
                                prefixIcon: AppIcons.solidRoundedStoreLocation02,
                                initialValue: profile.address ?? '',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Divider(
                      color: context.appColors.backgroundShade200,
                      height: 1.0,
                    ),
                    Padding(
                      padding: EdgeInsets.all(context.scale(8)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: context.scale(8),
                        children: [
                          Padding(
                            padding: EdgeInsets.all(context.scale(16)).copyWith(bottom: 0),
                            child: const SectionHeader(
                              title: 'Shop Settings',
                              description: 'Manage and update your business profile, services, payments, and other shop settings.',
                            ),
                          ),
                          Theme(
                            data: Theme.of(context).copyWith(
                              highlightColor: Colors.transparent,
                              splashColor: Colors.transparent,
                              splashFactory: NoSplash.splashFactory,
                            ),
                            child: Column(
                              spacing: context.scale(2),
                              children: [
                                SettingsTileWidget(
                                  icon: AppIcons.solidRoundedPropertyEdit,
                                  onTap: () => context.pushNested(RouteSegments.editBusinessProfile),
                                  tileColor: Colors.transparent,
                                  title: 'Edit Business Profile',
                                ),
                                SettingsTileWidget(
                                  icon: AppIcons.solidRoundedPayment01,
                                  onTap: () => context.pushNested(RouteSegments.updateBankDetails),
                                  tileColor: Colors.transparent,
                                  title: 'Update Bank Details',
                                ),
                                SettingsTileWidget(
                                  icon: AppIcons.solidRoundedBuilding05,
                                  onTap: () => context.pushNested(RouteSegments.editAmenities),
                                  tileColor: Colors.transparent,
                                  title: 'Edit Amenities',
                                ),
                                SettingsTileWidget(
                                  icon: AppIcons.solidRoundedClock01,
                                  onTap: () => context.pushNested(RouteSegments.manageAvailability),
                                  tileColor: Colors.transparent,
                                  title: 'Manage Availability',
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }

            return const Center(child: CircularProgressIndicator());
          },
        ),
      ),
    );
  }
}
