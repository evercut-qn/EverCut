// lib/shared/utils/formatters/phone_number.dart

import 'package:flutter/services.dart';

class PhoneNumberFormatter extends TextInputFormatter {
  final List<int> groupPattern;

  PhoneNumberFormatter([
    this.groupPattern = const <int>[5, 5],
  ]);

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final raw = newValue.text.replaceAll(RegExp(r'\D'), '');
    final rawLength = raw.length;

    int index = 0;
    final chunks = <String>[];
    for (final length in groupPattern) {
      if (index >= rawLength) break;

      final end = (index + length).clamp(0, rawLength);
      chunks.add(raw.substring(index, end));
      index = end;
    }

    final formatted = chunks.join(' ');
    return newValue.copyWith(
      text: formatted,
      selection: TextSelection.collapsed(
        offset: _computeCursorPosition(
          oldValue: oldValue,
          newValue: newValue,
          formatted: formatted,
        ),
      ),
    );
  }

  int _computeCursorPosition({
    required TextEditingValue oldValue,
    required TextEditingValue newValue,
    required String formatted,
  }) {
    int oldValueTextLength = oldValue.text.length;
    int newValueTextLength = newValue.text.length;
    int oldValueSelectionBaseOffset = oldValue.selection.baseOffset;
    int newValueSelectionBaseOffset = newValue.selection.baseOffset;
    int formattedLength = formatted.length;

    int digitsBeforeCursor = 0;
    for (int i = 0; i < newValueSelectionBaseOffset && i < newValueTextLength; i++) {
      if (_isDigit(newValue.text[i])) {
        digitsBeforeCursor++;
      }
    }

    if (newValueTextLength == oldValueTextLength - 1 && newValueSelectionBaseOffset == oldValueSelectionBaseOffset) {
      if (oldValue.text[oldValueSelectionBaseOffset] == ' ') {
        int afterSpace = oldValueSelectionBaseOffset + 1;
        if (afterSpace <= formattedLength) {
          return afterSpace;
        }
      }
    }

    if (newValueTextLength == oldValueTextLength - 1 && newValueSelectionBaseOffset == oldValueSelectionBaseOffset - 1) {
      if (oldValueSelectionBaseOffset > 0 && oldValue.text[oldValueSelectionBaseOffset - 1] == ' ') {
        return newValueSelectionBaseOffset;
      }
    }

    if (digitsBeforeCursor == 0) return 0;
    if (digitsBeforeCursor >= _countDigits(formatted)) {
      return formattedLength;
    }

    int digitsSeen = 0;
    for (int i = 0; i < formattedLength; i++) {
      if (_isDigit(formatted[i])) {
        digitsSeen++;
        if (digitsSeen == digitsBeforeCursor) {
          return i + 1;
        }
      }
    }

    return formattedLength;
  }

  bool _isDigit(String character) {
    return character.isNotEmpty && character.codeUnitAt(0) ^ 0x30 <= 9;
  }

  int _countDigits(String string) {
    return string.codeUnits.where((int codeUnit) {
      return codeUnit ^ 0x30 <= 9;
    }).length;
  }
}
