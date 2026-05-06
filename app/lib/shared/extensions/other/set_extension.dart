// lib/shared/extensions/other/set_extension.dart

extension SetToggle<T> on Set<T> {
  void toggle(T value) => contains(value) ? remove(value) : add(value);

  bool removeAt(int index) {
    if (-1 < index && index < length) {
      return remove(elementAt(index));
    } else {
      throw RangeError.index(index, this, 'index');
    }
  }
}
