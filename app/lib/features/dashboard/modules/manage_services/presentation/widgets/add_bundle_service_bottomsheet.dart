// lib/features/dashboard/modules/manage_services/presentation/widgets/add_bundle_service_bottomsheet.dart

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/enums/target_customer.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/widgets/common/inputs/dropdown_menu.dart';
import '../../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';

class AddBundleServiceBottomsheetWidget extends StatelessWidget {
  const AddBundleServiceBottomsheetWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: EdgeInsets.all(context.scale(20)),
          child: Column(
            spacing: context.scale(18),
            children: [
              const SectionHeader(
                title: 'Add Bundle',
                description: 'Fill in all the details below to create a new service bundle for your barber shop.',
              ),
              Column(
                spacing: context.scale(16),
                children: [
                  CustomTextFormField(
                    labelText: 'Bundle Name',
                    prefixIcon: AppIcons.solidRoundedTag01,
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: context.scale(16),
                    children: [
                      CustomDropdownMenu(
                        dropdownMenuEntries: <DropdownMenuEntry<String>>[
                          const DropdownMenuEntry(value: 'Hair Cut', label: 'Hair Cut'),
                          const DropdownMenuEntry(value: 'Beard', label: 'Beard'),
                          const DropdownMenuEntry(value: 'Facial', label: 'Facial'),
                          const DropdownMenuEntry(value: 'Massage', label: 'Massage'),
                          const DropdownMenuEntry(value: 'Hair Color', label: 'Hair Color'),
                        ],
                        enableFilter: true,
                        enableSearch: true,
                        labelText: 'Select Service',
                        leadingIcon: AppIcons.solidRoundedChairBarber,
                        requestFocusOnTap: true,
                      ),
                      Material(
                        borderRadius: BorderRadius.circular(context.scale(6)),
                        color: context.appColors.backgroundShade100,
                        child: Padding(
                          padding: EdgeInsets.all(context.scale(12)),
                          child: Wrap(
                            alignment: WrapAlignment.start,
                            runAlignment: WrapAlignment.start,
                            runSpacing: context.scale(8),
                            spacing: context.scale(8),
                            children: ['Hair Cut', 'Beard', 'Facial', 'Massage', 'Hair Color', 'Clean-Up'].map((entry) {
                              return Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(context.scale(6)),
                                  color: context.appColors.backgroundShade200,
                                ),
                                padding: EdgeInsets.symmetric(
                                  horizontal: context.scale(12),
                                  vertical: context.scale(6),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  spacing: context.scale(6),
                                  children: [
                                    Text(
                                      entry,
                                      style: TextStyle(
                                        color: context.appColors.neutralShade650,
                                        fontSize: context.scale(12),
                                      ),
                                    ),
                                    GestureDetector(
                                      child: Icon(
                                        Icons.cancel,
                                        color: context.appColors.neutralShade650,
                                        size: context.scale(16),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ],
                  ),
                  CustomDropdownMenu<int>(
                    dropdownMenuEntries: TargetCustomerEnum.values.map<DropdownMenuEntry<int>>((TargetCustomerEnum gender) {
                      return DropdownMenuEntry<int>(
                        label: gender.label,
                        leadingIcon: Padding(
                          padding: EdgeInsets.only(left: context.scale(6)),
                          child: Icon(
                            gender.icon,
                            size: context.scale(20),
                          ),
                        ),
                        value: gender.value,
                      );
                    }).toList(),
                    labelText: 'Target Customers',
                    leadingIcon: AppIcons.solidRoundedUserGroup,
                    validator: (int? value) {
                      if (value == null || value.isNaN || value.isNegative) {
                        return 'Please select the target customer\'s.';
                      } else {
                        return null;
                      }
                    },
                  ),
                  Row(
                    spacing: context.scale(16),
                    children: [
                      Expanded(
                        child: CustomTextFormField(
                          labelText: 'Price',
                          keyboardType: TextInputType.number,
                          prefixIcon: AppIcons.solidRoundedMoney01,
                        ),
                      ),
                      Expanded(
                        child: CustomTextFormField(
                          keyboardType: TextInputType.number,
                          labelText: 'Duration',
                          prefixIcon: AppIcons.solidRoundedTimer02,
                        ),
                      ),
                    ],
                  ),
                  CustomTextFormField(
                    labelText: 'Offer Amount',
                    keyboardType: TextInputType.number,
                    prefixIcon: AppIcons.solidRoundedDiscount,
                  ),
                ],
              ),
            ],
          ),
        ),
        Divider(
          color: context.appColors.secondaryDividerColor,
          height: 1.0,
        ),
        Padding(
          padding: EdgeInsets.all(context.scale(20)),
          child: Row(
            spacing: context.scale(12),
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: context.pop,
                  child: const Text('Cancel'),
                ),
              ),
              Expanded(
                child: FilledButton(
                  onPressed: () {},
                  child: const Text('Save'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
