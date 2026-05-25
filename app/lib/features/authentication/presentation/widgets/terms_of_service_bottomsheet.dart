// lib/features/authentication/presentation/widgets/terms_of_service_bottomsheet.dart

import 'package:flutter/widgets.dart';

import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/widgets/other/document_items/document_items.dart';

class TermsOfServiceBottomsheetWidget extends StatelessWidget {
  const TermsOfServiceBottomsheetWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: context.scale(16),
      children: [
        Text(
          'Terms of Service',
          style: TextStyle(
            color: context.appColors.neutralShade850,
            fontSize: context.scale(16),
            fontWeight: FontWeight.w700,
          ),
        ),
        DocumentItems(<DocumentItem>[
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
      ],
    );
  }
}
