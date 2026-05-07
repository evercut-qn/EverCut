// lib/shared/widgets/other/document_items/models/document_item.dart

part of '../document_items.dart';

class DocumentItem {
  final String title;
  final String description;
  final List<DocumentItem> items;

  const DocumentItem({
    required this.title,
    required this.description,
    this.items = const [],
  });
}
