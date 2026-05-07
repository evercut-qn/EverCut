// lib/shared/widgets/other/document_items/document_items.dart

import 'package:flutter/widgets.dart';

import '../../../extensions/context/device_metrics_extension.dart';
import '../../../extensions/ui/text_extension.dart';

part 'models/document_item.dart';

class DocumentItems extends StatelessWidget {
  final List<DocumentItem> items;
  final List<int> _indexPath;

  const DocumentItems(
    this.items, {
    super.key,
  }) : _indexPath = const [];

  const DocumentItems._(
    this.items, {
    required List<int> indexPath,
  }) : _indexPath = indexPath;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: context.scale(6),
      children: items.asMap().entries.map((entry) {
        final List<int> newPath = [..._indexPath, entry.key + 1];
        final String indexText = '${newPath.join('.')}.';
        final TextStyle indexTextStyle = TextStyle(
          fontSize: context.scale(14),
          fontWeight: FontWeight.w700,
        );
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: context.scale(6),
          children: [
            SizedBox(
              width: (indexText.width(indexTextStyle) + context.scale(2)),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  indexText,
                  style: indexTextStyle,
                ),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: context.scale(6),
                children: [
                  Text(
                    entry.value.title,
                    style: TextStyle(
                      fontSize: context.scale(14),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    entry.value.description,
                    textAlign: TextAlign.justify,
                    style: TextStyle(
                      fontSize: context.scale(14),
                    ),
                  ),
                  if (entry.value.items.isNotEmpty) ...[
                    DocumentItems._(
                      entry.value.items,
                      indexPath: newPath,
                    ),
                  ],
                ],
              ),
            ),
          ],
        );
      }).toList(),
    );
  }
}
