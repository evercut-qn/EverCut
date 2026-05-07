// lib/features/appointments/presentation/views/employee_appointments/employee_appointments_screen.dart

import 'package:flutter/material.dart';

import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../widgets/appointment.dart';

class EmployeeAppointmentsScreen extends StatelessWidget {
  const EmployeeAppointmentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ram\'s Appointments')),
      backgroundColor: context.appColors.backgroundShade75,
      body: SafeArea(
        child: ListView.separated(
          itemBuilder: (BuildContext context, int index) {
            return AppointmentWidget();
          },
          itemCount: 15,
          padding: EdgeInsets.all(context.scale(24)),
          separatorBuilder: (BuildContext context, int index) {
            return SizedBox(
              height: context.scale(16),
            );
          },
        ),
      ),
    );
  }
}
