// lib/features/dashboard/modules/manage_services/presentation/widgets/add_single_service_bottomsheet.dart

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/enums/target_customer.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/widgets/common/inputs/dropdown_menu.dart';
import '../../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';

class AddSingleServiceBottomsheetWidget extends StatelessWidget {
  const AddSingleServiceBottomsheetWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Flexible(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(context.scale(20)),
            child: Column(
              spacing: context.scale(18),
              children: [
                const SectionHeader(
                  title: 'Add Service',
                  description: 'Fill in the service details below to quickly add a new service to your barber shop.',
                ),
                Column(
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
        ),
        Divider(
          color: context.appColors.backgroundShade200,
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
