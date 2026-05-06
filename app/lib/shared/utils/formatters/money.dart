// lib/shared/utils/formatters/money.dart

import 'package:flutter/services.dart';

class MoneyFormatter extends TextInputFormatter {
  final int decimalPlaces;
  final bool allowNegative;
  final double? maxValue;

  const MoneyFormatter({
    this.decimalPlaces = 2,
    this.allowNegative = false,
    this.maxValue,
  });

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    String oldCleanText = _removeCommas(oldValue.text);
    String newCleanText = _removeCommas(newValue.text);

    if (newCleanText.length < oldCleanText.length) {
      String formattedText = _formatWithCommas(newCleanText);
      return TextEditingValue(
        text: formattedText,
        selection: TextSelection.collapsed(offset: formattedText.length),
      );
    } else if (newCleanText.isEmpty) {
      return newValue;
    } else if (newCleanText.length - oldCleanText.length > 1) {
      return _formatPastedText(newValue);
    } else {
      String newChar = '';
      if (newValue.text.length > oldValue.text.length) {
        newChar = newValue.text.substring(oldValue.text.length);
      }
      return _processCharacter(oldCleanText, newChar);
    }
  }

  TextEditingValue _createValidatedValue(String newText) {
    if (maxValue != null) {
      double raw = getRawValue(newText);
      if (raw > maxValue!) {
        String formattedOld = _formatWithCommas(newText.substring(0, newText.length - 1));
        return TextEditingValue(
          text: formattedOld,
          selection: TextSelection.collapsed(offset: formattedOld.length),
        );
      }
    }

    String formatted = _formatWithCommas(newText);
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }

  TextEditingValue _processCharacter(String oldCleanText, String newChar) {
    if (allowNegative && newChar == '-' && oldCleanText.isEmpty) {
      return TextEditingValue(
        text: '-',
        selection: const TextSelection.collapsed(offset: 1),
      );
    } else if (newChar == '.') {
      if (oldCleanText.contains('.')) {
        String formatted = _formatWithCommas(oldCleanText);
        return TextEditingValue(
          text: formatted,
          selection: TextSelection.collapsed(offset: formatted.length),
        );
      } else if (oldCleanText.isEmpty || oldCleanText == '-') {
        String formatted = _formatWithCommas('${oldCleanText}0.');
        return TextEditingValue(
          text: formatted,
          selection: TextSelection.collapsed(offset: formatted.length),
        );
      } else {
        String formatted = _formatWithCommas('$oldCleanText.');
        return TextEditingValue(
          text: formatted,
          selection: TextSelection.collapsed(offset: formatted.length),
        );
      }
    } else if (RegExp(r'\d').hasMatch(newChar)) {
      if (oldCleanText == '0' || oldCleanText == '-0') {
        String newText = oldCleanText == '-0' ? '-$newChar' : newChar;
        return _createValidatedValue(newText);
      } else if (oldCleanText.contains('.')) {
        final parts = oldCleanText.split('.');
        if (parts.length == 2 && parts[1].length >= decimalPlaces) {
          return _createValidatedValue(oldCleanText);
        } else {
          return _createValidatedValue(oldCleanText);
        }
      } else {
        return _createValidatedValue('$oldCleanText$newChar');
      }
    } else {
      return _createValidatedValue(oldCleanText);
    }
  }

  TextEditingValue _formatPastedText(TextEditingValue newValue) {
    String cleanText = newValue.text.replaceAll(RegExp(r'[^\d.\-]'), '');
    bool isNegative = false;

    if (allowNegative && cleanText.startsWith('-')) {
      isNegative = true;
      cleanText = cleanText.substring(1);
    }

    final decimalParts = cleanText.split('.');
    if (decimalParts.length > 2) {
      cleanText = '${decimalParts[0]}.${decimalParts[1]}';
    }

    try {
      if (cleanText.isEmpty || cleanText == '.') {
        cleanText = '0';
      }

      double parsedValue = double.parse(cleanText);
      if (isNegative) parsedValue = -parsedValue;
      if (maxValue != null && parsedValue > maxValue!) {
        parsedValue = maxValue!;
      }

      String normalized = parsedValue.toStringAsFixed(decimalPlaces);
      if (normalized.contains('.')) {
        normalized = normalized.replaceAll(RegExp(r'0+$'), '');
        if (normalized.endsWith('.')) {
          normalized = normalized.substring(0, normalized.length - 1);
        }
      }

      String formatted = _formatWithCommas(normalized);
      return TextEditingValue(
        text: formatted,
        selection: TextSelection.collapsed(offset: formatted.length),
      );
    } catch (e) {
      return const TextEditingValue(text: '');
    }
  }

  static String _formatWithCommas(String value) {
    if (value.isEmpty) {
      return value;
    } else {
      bool isNegative = false;
      String workingValue = value;

      if (value.startsWith('-')) {
        isNegative = true;
        workingValue = value.substring(1);
      }

      if (workingValue.contains('.')) {
        final parts = workingValue.split('.');
        final integerPart = _addCommas(parts[0]);
        final result = '$integerPart.${parts[1]}';
        return isNegative ? '-$result' : result;
      } else {
        final result = _addCommas(workingValue);
        return isNegative ? '-$result' : result;
      }
    }
  }

  static String _addCommas(String number) {
    if (number.isEmpty || number == '0') {
      return number;
    } else if (number.length <= 3) {
      return number;
    } else {
      String result = '';
      int count = 0;

      for (int i = number.length - 1; i >= 0; i--) {
        if (count > 0 && count % 3 == 0) {
          result = ',$result';
        }
        result = number[i] + result;
        count++;
      }

      return result;
    }
  }

  String _removeCommas(String value) {
    return value.replaceAll(',', '');
  }

  static String formatDouble(double value, {int decimalPlaces = 2}) {
    if (value == 0.0) {
      return '0';
    } else {
      String normalized = value.toStringAsFixed(decimalPlaces);

      if (normalized.contains('.')) {
        normalized = normalized.replaceAll(RegExp(r'0+$'), '');
        if (normalized.endsWith('.')) {
          normalized = normalized.substring(0, normalized.length - 1);
        }
      }

      return _formatWithCommas(normalized);
    }
  }

  static double getRawValue(String formattedValue) {
    if (formattedValue.isEmpty) {
      return 0.0;
    } else {
      try {
        String cleanValue = formattedValue.replaceAll(RegExp(r'[^\d.\-]'), '');
        return double.parse(cleanValue);
      } catch (e) {
        return 0.0;
      }
    }
  }
}
