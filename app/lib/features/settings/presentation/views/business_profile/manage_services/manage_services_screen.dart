// lib/features/settings/presentation/views/business_profile/manage_services/manage_services_screen.dart

import 'package:flutter/material.dart';

import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/models/dropdown_menu_option.dart';
import '../../../../../../shared/widgets/common/inputs/dropdown_menu.dart';
import '../../../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../shared/widgets/overlays/bottomsheet.dart';

class ManageServicesScreen extends StatefulWidget {
  const ManageServicesScreen({super.key});

  @override
  State<ManageServicesScreen> createState() => _ManageServicesScreenState();
}

class _ManageServicesScreenState extends State<ManageServicesScreen> {
  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Manage Services'),
          bottom: TabBar(
            tabs: const <Tab>[
              Tab(text: 'Single'),
              Tab(text: 'Bundle'),
            ],
          ),
        ),
        body: SafeArea(
          child: TabBarView(
            children: [
              SingleChildScrollView(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  spacing: context.scale(24),
                  children: [
                    Material(
                      clipBehavior: Clip.hardEdge,
                      color: context.appColors.backgroundShade100,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(context.scale(12)),
                        side: BorderSide(color: context.appColors.backgroundShade200),
                      ),
                      child: IntrinsicHeight(
                        child: Row(
                          children: [
                            Expanded(
                              child: Padding(
                                padding: EdgeInsets.all(context.scale(12)),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  spacing: context.scale(12),
                                  children: [
                                    AspectRatio(
                                      aspectRatio: 1.0,
                                      child: Material(
                                        borderRadius: BorderRadius.circular(context.scale(6)),
                                        color: context.appColors.backgroundShade200,
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      spacing: context.scale(4.25),
                                      children: [
                                        Text(
                                          'Hair Cut',
                                          style: TextStyle(
                                            color: context.appColors.neutralShade850,
                                            fontSize: context.scale(14),
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        IntrinsicHeight(
                                          child: Row(
                                            spacing: context.scale(8),
                                            children: [
                                              Row(
                                                spacing: context.scale(6),
                                                children: [
                                                  Icon(
                                                    AppIcons.solidRoundedUserAccount,
                                                    color: context.appColors.blueShade100,
                                                    size: context.scale(16),
                                                  ),
                                                  Text(
                                                    'Male',
                                                    style: TextStyle(
                                                      color: context.appColors.neutralShade450,
                                                      fontSize: context.scale(12),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              VerticalDivider(
                                                color: context.appColors.backgroundShade200,
                                                width: 1.0,
                                              ),
                                              Row(
                                                spacing: context.scale(6),
                                                children: [
                                                  Icon(
                                                    AppIcons.solidRoundedMoney01,
                                                    color: context.appColors.greenShade100,
                                                    size: context.scale(16),
                                                  ),
                                                  Text(
                                                    '₹100',
                                                    style: TextStyle(
                                                      color: context.appColors.neutralShade450,
                                                      fontSize: context.scale(12),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              VerticalDivider(
                                                color: context.appColors.backgroundShade200,
                                                width: 1.0,
                                              ),
                                              Row(
                                                spacing: context.scale(6),
                                                children: [
                                                  Icon(
                                                    AppIcons.solidRoundedDiscount,
                                                    color: context.appColors.orangeShade100,
                                                    size: context.scale(16),
                                                  ),
                                                  Text(
                                                    '₹20',
                                                    style: TextStyle(
                                                      color: context.appColors.neutralShade450,
                                                      fontSize: context.scale(12),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            VerticalDivider(
                              color: context.appColors.backgroundShade200,
                              width: 1.0,
                            ),
                            IntrinsicWidth(
                              child: Column(
                                children: [
                                  Expanded(
                                    child: Padding(
                                      padding: EdgeInsets.all(context.scale(12)),
                                      child: Center(
                                        child: Icon(
                                          AppIcons.solidRoundedPen01,
                                          color: context.appColors.neutralShade550,
                                          size: context.scale(16),
                                        ),
                                      ),
                                    ),
                                  ),
                                  Divider(
                                    color: context.appColors.backgroundShade200,
                                    height: 1.0,
                                  ),
                                  Expanded(
                                    child: Padding(
                                      padding: EdgeInsets.all(context.scale(12)),
                                      child: Center(
                                        child: Icon(
                                          AppIcons.solidRoundedDelete02,
                                          color: context.appColors.neutralShade550,
                                          size: context.scale(16),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SingleChildScrollView(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  spacing: context.scale(24),
                  children: [
                    Material(
                      clipBehavior: Clip.hardEdge,
                      color: context.appColors.backgroundShade100,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(context.scale(12)),
                        side: BorderSide(color: context.appColors.backgroundShade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          IntrinsicHeight(
                            child: Row(
                              children: [
                                Expanded(
                                  child: Padding(
                                    padding: EdgeInsets.all(context.scale(12)),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.center,
                                      spacing: context.scale(12),
                                      children: [
                                        AspectRatio(
                                          aspectRatio: 1.0,
                                          child: Material(
                                            borderRadius: BorderRadius.circular(context.scale(6)),
                                            color: context.appColors.backgroundShade200,
                                          ),
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          spacing: context.scale(4.25),
                                          children: [
                                            Text(
                                              'Dashing Star',
                                              style: TextStyle(
                                                color: context.appColors.neutralShade850,
                                                fontSize: context.scale(14),
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            IntrinsicHeight(
                                              child: Row(
                                                spacing: context.scale(8),
                                                children: [
                                                  Row(
                                                    spacing: context.scale(6),
                                                    children: [
                                                      Icon(
                                                        AppIcons.solidRoundedUserAccount,
                                                        color: context.appColors.blueShade100,
                                                        size: context.scale(16),
                                                      ),
                                                      Text(
                                                        'Male',
                                                        style: TextStyle(
                                                          color: context.appColors.neutralShade450,
                                                          fontSize: context.scale(12),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                  VerticalDivider(
                                                    color: context.appColors.backgroundShade200,
                                                    width: 1.0,
                                                  ),
                                                  Row(
                                                    spacing: context.scale(6),
                                                    children: [
                                                      Icon(
                                                        AppIcons.solidRoundedMoney01,
                                                        color: context.appColors.greenShade100,
                                                        size: context.scale(16),
                                                      ),
                                                      Text(
                                                        '₹100',
                                                        style: TextStyle(
                                                          color: context.appColors.neutralShade450,
                                                          fontSize: context.scale(12),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                  VerticalDivider(
                                                    color: context.appColors.backgroundShade200,
                                                    width: 1.0,
                                                  ),
                                                  Row(
                                                    spacing: context.scale(6),
                                                    children: [
                                                      Icon(
                                                        AppIcons.solidRoundedDiscount,
                                                        color: context.appColors.orangeShade100,
                                                        size: context.scale(16),
                                                      ),
                                                      Text(
                                                        '₹20',
                                                        style: TextStyle(
                                                          color: context.appColors.neutralShade450,
                                                          fontSize: context.scale(12),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                VerticalDivider(
                                  color: context.appColors.backgroundShade200,
                                  width: 1.0,
                                ),
                                IntrinsicWidth(
                                  child: Column(
                                    children: [
                                      Expanded(
                                        child: Padding(
                                          padding: EdgeInsets.all(context.scale(12)),
                                          child: Center(
                                            child: Icon(
                                              AppIcons.solidRoundedPen01,
                                              color: context.appColors.neutralShade550,
                                              size: context.scale(16),
                                            ),
                                          ),
                                        ),
                                      ),
                                      Divider(
                                        color: context.appColors.backgroundShade200,
                                        height: 1.0,
                                      ),
                                      Expanded(
                                        child: Padding(
                                          padding: EdgeInsets.all(context.scale(12)),
                                          child: Center(
                                            child: Icon(
                                              AppIcons.solidRoundedDelete02,
                                              color: context.appColors.neutralShade550,
                                              size: context.scale(16),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Divider(
                            color: context.appColors.backgroundShade200,
                            height: 1.0,
                          ),
                          Padding(
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
                                  child: Text(
                                    entry,
                                    style: TextStyle(
                                      color: context.appColors.neutralShade650,
                                      fontSize: context.scale(12),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
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
        floatingActionButton: Builder(
          builder: (BuildContext context) {
            return FloatingActionButton(
              onPressed: () {
                switch (DefaultTabController.of(context).index) {
                  case 0:
                    showCustomBottomsheet(
                      context: context,
                      builder: (BuildContext context) => AddSingleService(),
                      padding: EdgeInsets.zero,
                      scrollable: false,
                    );
                  case 1:
                    showCustomBottomsheet(
                      context: context,
                      builder: (BuildContext context) => AddBundleService(),
                      padding: EdgeInsets.zero,
                    );
                }
              },
              child: const Icon(Icons.add),
            );
          },
        ),
      ),
    );
  }
}

class AddSingleService extends StatefulWidget {
  const AddSingleService({super.key});

  @override
  State<AddSingleService> createState() => _AddSingleServiceState();
}

class _AddSingleServiceState extends State<AddSingleService> {
  final List<DropdownMenuOption> _genders = <DropdownMenuOption>[
    DropdownMenuOption(icon: AppIcons.solidRoundedMan, label: 'Men', value: 0),
    DropdownMenuOption(icon: AppIcons.solidRoundedWoman, label: 'Women', value: 0),
    DropdownMenuOption(icon: AppIcons.solidRoundedManWoman, label: 'Unisex', value: 0),
  ];

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
                      labelText: 'Select Service',
                      leadingIcon: AppIcons.solidRoundedChairBarber,
                    ),
                    Row(
                      spacing: context.scale(16),
                      children: [
                        Expanded(
                          child: CustomDropdownMenu<int>(
                            // controller: _genderController,
                            dropdownMenuEntries: _genders.map<DropdownMenuEntry<int>>((DropdownMenuOption item) {
                              return DropdownMenuEntry<int>(
                                label: item.label,
                                leadingIcon: Padding(
                                  padding: EdgeInsets.only(left: context.scale(6)),
                                  child: Icon(
                                    item.icon,
                                    size: context.scale(20),
                                  ),
                                ),
                                value: item.value,
                              );
                            }).toList(),
                            labelText: 'Gender',
                            leadingIcon: AppIcons.solidRoundedUserGroup,
                            validator: (int? value) {
                              if (value == null || value.isNaN || value.isNegative) {
                                return 'Please select the target customer\'s gender.';
                              } else {
                                return null;
                              }
                            },
                          ),
                        ),
                        Expanded(
                          child: CustomTextFormField(
                            labelText: 'Price',
                            prefixIcon: AppIcons.solidRoundedMoney01,
                          ),
                        ),
                      ],
                    ),
                    CustomTextFormField(
                      labelText: 'Offer Amount',
                      prefixIcon: AppIcons.solidRoundedDiscount,
                    ),
                  ],
                ),
              ],
            ),
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
                  onPressed: () {},
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

class AddBundleService extends StatefulWidget {
  const AddBundleService({super.key});

  @override
  State<AddBundleService> createState() => _AddBundleServiceState();
}

class _AddBundleServiceState extends State<AddBundleService> {
  final List<DropdownMenuOption> _genders = <DropdownMenuOption>[
    DropdownMenuOption(icon: AppIcons.solidRoundedMan, label: 'Men', value: 0),
    DropdownMenuOption(icon: AppIcons.solidRoundedWoman, label: 'Women', value: 0),
    DropdownMenuOption(icon: AppIcons.solidRoundedManWoman, label: 'Unisex', value: 0),
  ];

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
                        labelText: 'Select Service',
                        leadingIcon: AppIcons.solidRoundedChairBarber,
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
                  Row(
                    spacing: context.scale(16),
                    children: [
                      Expanded(
                        child: CustomDropdownMenu<int>(
                          // controller: _genderController,
                          dropdownMenuEntries: _genders.map<DropdownMenuEntry<int>>((DropdownMenuOption item) {
                            return DropdownMenuEntry<int>(
                              label: item.label,
                              leadingIcon: Padding(
                                padding: EdgeInsets.only(left: context.scale(6)),
                                child: Icon(
                                  item.icon,
                                  size: context.scale(20),
                                ),
                              ),
                              value: item.value,
                            );
                          }).toList(),
                          labelText: 'Gender',
                          leadingIcon: AppIcons.solidRoundedUserGroup,
                          validator: (int? value) {
                            if (value == null || value.isNaN || value.isNegative) {
                              return 'Please select the target customer\'s gender.';
                            } else {
                              return null;
                            }
                          },
                        ),
                      ),
                      Expanded(
                        child: CustomTextFormField(
                          labelText: 'Price',
                          prefixIcon: AppIcons.solidRoundedMoney01,
                        ),
                      ),
                    ],
                  ),
                  CustomTextFormField(
                    labelText: 'Offer Amount',
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
                  onPressed: () {},
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
