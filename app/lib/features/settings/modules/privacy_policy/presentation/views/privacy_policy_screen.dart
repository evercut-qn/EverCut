// lib/features/settings/modules/privacy_policy/presentation/views/privacy_policy_screen.dart

import 'package:flutter/material.dart';

import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../shared/widgets/other/document_items/document_items.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy Policy')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          physics: const ClampingScrollPhysics(),
          child: DocumentItems(<DocumentItem>[
            DocumentItem(
              title: 'Lorem Ipsum is simply dummy text.',
              description:
                  'Lorem Ipsum is simply dummy text of the printing and typesetting industry. '
                  'Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, '
                  'when an unknown printer took a galley of type and scrambled it to make a type specimen book.',
              items: List.generate(3, (int index) {
                return DocumentItem(
                  title: 'Lorem Ipsum is simply dummy text.',
                  description:
                      'Lorem Ipsum is simply dummy text of the printing and typesetting industry. '
                      'Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, '
                      'when an unknown printer took a galley of type and scrambled it to make a type specimen book.',
                );
              }),
            ),
            ...List.generate(2, (int index) {
              return DocumentItem(
                title: 'Lorem Ipsum is simply dummy text.',
                description:
                    'Lorem Ipsum is simply dummy text of the printing and typesetting industry. '
                    'Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, '
                    'when an unknown printer took a galley of type and scrambled it to make a type specimen book.',
              );
            }),
          ]),
        ),
      ),
    );
  }
}
