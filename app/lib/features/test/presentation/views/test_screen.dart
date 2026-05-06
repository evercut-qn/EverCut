// lib/features/test/presentation/views/test_screen.dart

import 'package:flutter/material.dart';

import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/widgets/common/appbars/bottom_appbar.dart';

class TestScreen extends StatefulWidget {
  const TestScreen({super.key});

  @override
  State<TestScreen> createState() => _TestScreenState();
}

class _TestScreenState extends State<TestScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(context.scale(24)),
          child: ListView.separated(
            itemBuilder: (BuildContext context, int index) {
              return ListTile(
                tileColor: Colors.grey,
              );
            },
            itemCount: 15,
            separatorBuilder: (BuildContext context, int index) {
              return SizedBox(
                height: context.scale(12),
              );
            },
          ),
        ),
      ),
      bottomNavigationBar: CustomBottomAppBar(
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(context.scale(12)),
            color: Colors.green,
          ),
          padding: EdgeInsets.all(context.scale(32)),
        ),
      ),
    );
  }
}
