// lib/shared/models/circular_interval_list.dart

class CircularIntervalListModel<T> {
  int index = 0;
  final List values;

  CircularIntervalListModel(this.values);

  dynamic get next {
    final currentValue = values[index];
    index = (index + 1) % values.length;
    return currentValue;
  }
}
