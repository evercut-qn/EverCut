// lib/shared/extensions/other/list_extension.dart

extension ListExtension<T> on List<T?> {
  void update(int index, T? element) => this[index] = element;
}
