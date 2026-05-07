// lib/features/dashboard/modules/team/presentation/views/employee_status_screen.dart

import 'package:flutter/material.dart';

import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/widgets/common/section/section_header.dart';
import '../widgets/employee_availability.dart';

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Team')),
      backgroundColor: context.appColors.backgroundShade75,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: context.scale(18),
            children: [
              const SectionHeader(
                title: 'Employee Availability',
                description: 'Mark the days and specific dates when this employee is available to work each week.',
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: context.scale(16),
                children: List.generate(3, (int index) {
                  return EmployeeAvailabilityWidget();
                }),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // showCustomBottomsheet(
          //   context: context,
          //   builder: (BuildContext context) => EmployeeAddBottomSheet(),
          //   padding: EdgeInsets.zero,
          // );
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
