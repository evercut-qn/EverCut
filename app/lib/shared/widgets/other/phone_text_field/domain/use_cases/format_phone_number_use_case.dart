// lib/shared/widgets/other/phone_text_field/domain/use_cases/format_phone_number_use_case.dart

import '../entities/country_group.dart';
import '../entities/phone_number.dart';

class FormatPhoneNumberUseCase {
  PhoneNumber? execute(String e164PhoneNumber, List<CountryGroup> allCountries) {
    if (e164PhoneNumber.isEmpty || !e164PhoneNumber.startsWith('+') || allCountries.isEmpty) {
      return null;
    }

    final digits = e164PhoneNumber.replaceAll(RegExp(r'[^0-9]'), '');
    for (final countryGroup in allCountries) {
      for (final country in countryGroup.countries) {
        final phoneCode = country.dialingInfo.dialCode.replaceAll('+', '');
        if (digits.startsWith(phoneCode)) {
          final phoneNumber = digits.substring(phoneCode.length);
          final phoneNumberLength = phoneNumber.length;

          int index = 0;
          final chunks = <String>[];
          for (final spacingIndex in country.dialingInfo.digitGroups) {
            if ((index + spacingIndex) > phoneNumberLength) {
              chunks.add(phoneNumber.substring(index));
              break;
            }
            chunks.add(phoneNumber.substring(index, index + spacingIndex));
            index += spacingIndex;
          }

          return PhoneNumber(
            dialCode: country.dialingInfo.dialCode,
            value: chunks.join(' '),
          );
        }
      }
    }

    return null;
  }
}
